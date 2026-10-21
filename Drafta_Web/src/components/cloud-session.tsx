'use client';

import * as React from 'react';
import { flushSync } from 'react-dom';
import Link from 'next/link';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useTheme } from 'next-themes';
import { useLang } from '@/contexts/lang-context';
import { getFirebaseClient, type FirebaseClient } from '@/lib/firebase-client';
import { cloudWorkspace, type SavedWorkspace, type WorkspaceSince } from '@/lib/cloud-workspace';
import { cacheWriter, deleteCachedWorkspace, readCachedWorkspace, writeCachedWorkspace } from '@/lib/workspace-cache';
import { watchCloudWorkspace } from '@/lib/cloud-workspace-watch';
import { mergeWorkspaces, preserveWorkspaceCopy } from '@/lib/workspace-merge';
import { syncCopy } from '@/lib/sync-copy';
import { toast } from '@/hooks/use-toast';
import { snapshotWorkspace } from '@/lib/workspace-backup';
import type { WorkspaceBackup } from '@/lib/workspace-backup';
import type { Note } from '@/lib/types';
import { requiresImmediateSave } from '@/lib/workspace-change';
import { workspaceToState, type WorkspaceState, type WorkspaceUpdate } from '@/lib/workspace-state';
import { WorkspaceSaveQueue } from '@/lib/workspace-save-queue';
import { flushPendingEdits } from '@/lib/pending-edits';
import { AccountMenu, type SaveStatus } from './account-menu';
import { cloudCopy } from '@/lib/cloud-copy';
import { Button } from './ui/button';
import { DeleteConfirmDialog } from './delete-confirm-dialog';
import type { MemoHistoryRepository } from '@/lib/memo-history';
import { memoHistoryCopy } from '@/lib/memo-history-copy';
import { freezeHistorySample } from '@/lib/memo-history-restore';
import { useShortcutMod } from '@/hooks/use-client-ready';
import { authRecoveryCopy } from '@/lib/auth-recovery-copy';
import { loginRequiredCopy } from '@/lib/login-required-copy';
import { BrandIcon } from './brand-icon';
import { authErrorCopy } from '@/lib/auth-error-copy';

type ViewProps = { initialState?: WorkspaceState; remoteUpdate?: WorkspaceUpdate; accountMenu?: React.ReactNode; onWorkspaceChange?: (state: WorkspaceState) => void; memoHistory?: Pick<MemoHistoryRepository, 'list'>; saveWorkspace?: () => Promise<boolean> };
// Each memo's JSON is reused while its field values are unchanged, so one keystroke serializes one memo.
const noteFingerprints = new WeakMap<Note, { fields: Note; text: string }>();
const noteFingerprint = (note: Note) => {
  const cached = noteFingerprints.get(note);
  const keys = Object.keys(note);
  if (cached && keys.length === Object.keys(cached.fields).length && keys.every(key => note[key as keyof Note] === cached.fields[key as keyof Note])) return cached.text;
  const text = JSON.stringify(note);
  noteFingerprints.set(note, { fields: { ...note }, text });
  return text;
};
// JSON text never contains a raw line break, so the joined memos cannot collide.
// Writes text still waiting in an editor and lets React hand the new state to `changed` now.
const flushEdits = () => { flushSync(() => { flushPendingEdits(); }); };
const stateFingerprint = (state: WorkspaceState) => JSON.stringify({ groups: state.groups, settings: state.settings }) + state.notes.map(note => `\n${noteFingerprint(note)}`).join('');

export default function CloudSession({ Workspace }: { Workspace: React.ComponentType<ViewProps> }) {
  const { lang, restoreLanguage } = useLang();
  const labels = cloudCopy[lang];
  const shortcutMod = useShortcutMod();
  const historyContext = React.useRef({ lang, shortcutMod });
  React.useEffect(() => { historyContext.current = { lang, shortcutMod }; }, [lang, shortcutMod]);
  const historyLabelsRef = React.useRef(memoHistoryCopy[lang]);
  React.useEffect(() => { historyLabelsRef.current = memoHistoryCopy[lang]; }, [lang]);
  const syncLabels = syncCopy[lang];
  const syncLabelsRef = React.useRef(syncLabels);
  React.useEffect(() => { syncLabelsRef.current = syncLabels; }, [syncLabels]);
  const { setTheme } = useTheme();
  const themeSetter = React.useRef(setTheme);
  React.useEffect(() => { themeSetter.current = setTheme; }, [setTheme]);
  const client = React.useRef<FirebaseClient | null>(null);
  const queue = React.useRef<WorkspaceSaveQueue | null>(null);
  const generation = React.useRef(0);
  const stopWatching = React.useRef<(() => void) | null>(null);
  const restartWatching = React.useRef<(() => void) | null>(null);
  const syncUnavailable = React.useRef(false);
  const updateSequence = React.useRef(0);
  const lastState = React.useRef('');
  const lastBackup = React.useRef<WorkspaceBackup | null>(null);
  const invalidState = React.useRef<WorkspaceState | null>(null);
  // While an account change is handled, the edits written by its flush still belong to the old session.
  const flushingForAccountChange = React.useRef(false);
  const activeOwner = React.useRef<string | null>(null);
  const heldEdits = React.useRef(new Map<string, { base: SavedWorkspace | null; backup: WorkspaceBackup; invalid: WorkspaceState | null }>());
  const [hasHeldEdits, setHasHeldEdits] = React.useState(false);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [session, setSession] = React.useState<{ key: number; user: User | null; seed?: WorkspaceState; history?: MemoHistoryRepository } | null>(null);
  const [status, setStatus] = React.useState<SaveStatus>('loading');
  const [busy, setBusy] = React.useState(false);
  const [errorCode, setErrorCode] = React.useState<string | null>(null);
  const [loginNotice, setLoginNotice] = React.useState<'blocked' | 'failed' | null>(null);
  const [remoteUpdate, setRemoteUpdate] = React.useState<WorkspaceUpdate | undefined>(undefined);
  const [reviewRemote, setReviewRemote] = React.useState<SavedWorkspace | null>(null);
  const [reviewOpen, setReviewOpen] = React.useState(false);
  // Device cache (specs/16): the server time read at start-up bounds every later revision of this session.
  const sessionSince = React.useRef<WorkspaceSince | null>(null);
  const cachedRevision = React.useRef(0);
  const serverChecked = React.useRef(false);
  const reloadAccount = React.useRef<((user: User) => Promise<void>) | null>(null);
  const cacheWrites = React.useRef(cacheWriter(value => writeCachedWorkspace(value)));
  const keepCache = React.useCallback(() => {
    const current = queue.current;
    if (!current || !sessionSince.current || current.revision === 0 || current.revision === cachedRevision.current) return;
    cachedRevision.current = current.revision;
    cacheWrites.current.schedule(() => {
      const saved = queue.current?.acknowledged;
      return saved && sessionSince.current ? { saved, since: sessionSince.current } : null;
    });
  }, []);
  const repositoryFor = React.useCallback((uid: string, id: number) => cloudWorkspace(client.current!.db, uid, {
    onHistoryFailure: () => { if (id === generation.current) toast({ description: historyLabelsRef.current.warning }); },
    historySnapshot: note => freezeHistorySample(note, document, historyContext.current.lang, historyContext.current.shortcutMod),
  }), []);

  const applyRemote = React.useCallback((backup: WorkspaceBackup, copies: { originalId: string; copyId: string }[]) => {
    const state = workspaceToState(backup, document);
    lastState.current = stateFingerprint(state); lastBackup.current = backup;
    restoreLanguage(state.settings.language); themeSetter.current(state.settings.theme);
    setRemoteUpdate({ sequence: ++updateSequence.current, state, copies });
    if (copies.length) toast({ description: syncLabelsRef.current.copied });
  }, [restoreLanguage]);
  const makeQueue = React.useCallback((stored: SavedWorkspace | null, repository: ReturnType<typeof cloudWorkspace>, id: number) => new WorkspaceSaveQueue(stored, repository.save, next => {
    if (id !== generation.current) return;
    setStatus(invalidState.current || syncUnavailable.current ? 'error' : next);
    // Every change of the confirmed revision (own save or accepted remote) is followed by a report.
    if (serverChecked.current) keepCache();
  }, {
    load: repository.load,
    prepare: flushEdits,
    merge: (base, local, remote) => mergeWorkspaces(base, local, remote, { now: new Date().toISOString(), newId: () => crypto.randomUUID(), copySuffix: syncLabelsRef.current.suffix }),
    apply: (backup, copies) => { if (id === generation.current) applyRemote(backup, copies); },
    review: remote => { if (id === generation.current) setReviewRemote(remote); },
  }), [applyRemote, keepCache]);

  const load = React.useCallback(async (user: User | null) => {
    // Keep the last keystrokes of the session that is ending with that session's held edits.
    flushingForAccountChange.current = true;
    try { flushEdits(); } finally { flushingForAccountChange.current = false; }
    setIsAuthenticated(user !== null);
    const owner = activeOwner.current;
    if (owner && lastBackup.current && (queue.current?.dirty || invalidState.current)) {
      heldEdits.current.set(owner, { base: queue.current?.acknowledged ?? null, backup: structuredClone(lastBackup.current), invalid: invalidState.current ? structuredClone(invalidState.current) : null });
      setHasHeldEdits(true);
    }
    activeOwner.current = null;
    const id = ++generation.current;
    stopWatching.current?.(); stopWatching.current = null;
    restartWatching.current = null; syncUnavailable.current = false;
    queue.current?.dispose(); queue.current = null;
    setRemoteUpdate(undefined); setReviewRemote(null); setReviewOpen(false);
    invalidState.current = null;
    setErrorCode(null);
    setLoginNotice(null);
    setSession(null); setStatus('loading');
    if (!user) {
      setStatus('guest'); return;
    }
    serverChecked.current = false; sessionSince.current = null; cachedRevision.current = 0;
    try {
      const repository = repositoryFor(user.uid, id);
      const held = heldEdits.current.get(user.uid);
      // This device's copy shows at once and the server check below brings it up to date (specs/16).
      // Held edits after an auth loss keep the full load and their own merge.
      const cached = held ? null : await readCachedWorkspace(user.uid);
      if (id !== generation.current) return;
      let stored: SavedWorkspace | null;
      if (cached) {
        stored = cached.saved;
        cachedRevision.current = cached.saved.revision;
      } else {
        const loaded = await repository.loadWithSince();
        if (id !== generation.current) return;
        stored = loaded?.saved ?? null;
        sessionSince.current = loaded?.since ?? null;
        serverChecked.current = true;
      }
      const seed = held ? held.invalid ?? workspaceToState(held.backup, document) : stored ? workspaceToState(stored.backup, document) : undefined;
      if (seed) { restoreLanguage(seed.settings.language); themeSetter.current(seed.settings.theme); }
      lastState.current = seed ? stateFingerprint(seed) : '';
      lastBackup.current = held?.backup ?? stored?.backup ?? null;
      queue.current = makeQueue(held ? held.base : stored, repository, id);
      if (held) {
        invalidState.current = held.invalid;
        queue.current.enqueue(held.backup);
        if (stored) queue.current.acceptRemote(stored);
        heldEdits.current.delete(user.uid);
        setHasHeldEdits(heldEdits.current.size > 0);
      }
      activeOwner.current = user.uid;
      setStatus(cached ? 'loading' : invalidState.current ? 'error' : queue.current.status);
      setSession({ key: id, user, seed, history: repository.history });
      if (cached) {
        const fresh = await repository.loadSince(cached);
        if (id !== generation.current) return;
        if (!fresh) {
          // The server has no workspace for this account any more; start over without the copy.
          await deleteCachedWorkspace(user.uid);
          void reloadAccount.current?.(user); return;
        }
        sessionSince.current = fresh.since;
        serverChecked.current = true;
        // Edits made while checking merge like any other remote change.
        if (fresh.saved.revision !== cached.saved.revision) queue.current.acceptRemote(fresh.saved);
        cachedRevision.current = 0;
        setStatus(invalidState.current ? 'error' : queue.current.status);
      }
      keepCache();
      restartWatching.current = () => {
        stopWatching.current?.();
        const synced = () => { syncUnavailable.current = false; setErrorCode(null); };
        stopWatching.current = watchCloudWorkspace(client.current!.db, user.uid, remote => {
          if (id !== generation.current) return;
          synced();
          if (!invalidState.current) queue.current?.acceptRemote(remote);
          setStatus(invalidState.current ? 'error' : queue.current?.status ?? 'saved');
        }, () => {
          if (id === generation.current) { syncUnavailable.current = true; setErrorCode('sync-unavailable'); setStatus('error'); }
        }, revision => {
          // acceptRemote would ignore it anyway; skip parsing the whole workspace for our own save.
          if (id !== generation.current || !queue.current || revision > queue.current.revision) return false;
          synced(); setStatus(invalidState.current ? 'error' : queue.current.status);
          return true;
        }, queue.current?.acknowledged ?? null);
      };
      restartWatching.current();
    } catch (error) {
      if (id === generation.current) {
        const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
        const name = error instanceof Error ? error.name : 'load-failed';
        setErrorCode(/^[a-z/-]+$/.test(code) && code ? code : /^[A-Za-z]+Error$/.test(name) ? name : 'load-failed');
        setStatus('error');
      }
    }
  }, [restoreLanguage, makeQueue, repositoryFor, keepCache]);
  React.useEffect(() => { reloadAccount.current = load; }, [load]);

  React.useEffect(() => {
    const lifecycle = generation;
    let unsubscribe = () => {};
    try {
      client.current = getFirebaseClient();
      if (!client.current) throw new Error('Firebase unavailable');
      unsubscribe = onAuthStateChanged(client.current.auth, user => { void load(user); }, () => setStatus('error'));
    } catch { setStatus('error'); }
    return () => { unsubscribe(); lifecycle.current++; queue.current?.dispose(); stopWatching.current?.(); };
  }, [load]);

  React.useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      flushEdits();
      if (queue.current?.dirty || invalidState.current || heldEdits.current.size) { event.preventDefault(); event.returnValue = ''; }
    };
    const flush = () => { flushEdits(); void queue.current?.flush(); void cacheWrites.current.flush(); };
    // Focus can leave while React removes the editor; flush after that commit finishes.
    const flushLater = () => { queueMicrotask(flush); };
    const visibility = () => { if (document.visibilityState === 'hidden') flush(); };
    const saveShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); flush(); }
    };
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('blur', flushLater);
    document.addEventListener('focusout', flushLater);
    window.addEventListener('pagehide', flush);
    window.addEventListener('keydown', saveShortcut);
    document.addEventListener('visibilitychange', visibility);
    return () => { window.removeEventListener('beforeunload', beforeUnload); window.removeEventListener('blur', flushLater); window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', visibility); document.removeEventListener('focusout', flushLater); window.removeEventListener('keydown', saveShortcut); };
  }, []);

  const sessionKey = session?.key;
  const uid = session?.user?.uid;
  const changed = React.useCallback((state: WorkspaceState) => {
    if (sessionKey !== generation.current) return;
    if (!uid) return;
    if (!flushingForAccountChange.current && client.current?.auth.currentUser?.uid !== uid) return;
    const fingerprint = stateFingerprint(state);
    if (fingerprint === lastState.current) {
      if (invalidState.current) { invalidState.current = null; setStatus(queue.current?.status ?? 'pending'); }
      return;
    }
    try {
      const backup = snapshotWorkspace(state, document);
      invalidState.current = null;
      queue.current?.enqueue(backup, requiresImmediateSave(lastBackup.current, backup));
      lastBackup.current = backup;
      lastState.current = fingerprint;
    } catch { invalidState.current = state; setStatus('error'); }
  }, [sessionKey, uid]);

  // Resolves true only after every queued change was acknowledged by the server.
  const saveWorkspace = React.useCallback(async () => {
    flushEdits();
    for (let attempt = 0; attempt < 10; attempt++) {
      const current = queue.current;
      if (!current || invalidState.current || current.status === 'conflict') return false;
      if (current.status === 'error') await current.retry(); else await current.flush();
      if (current !== queue.current) return false;
      // Re-read after the await; TypeScript would otherwise keep the narrowing from above.
      const status = current.status as SaveStatus;
      if (!current.dirty && status === 'saved') return true;
      if (status === 'error' || status === 'conflict') return false;
    }
    return false;
  }, []);

  const act = async (action: () => Promise<unknown>, loginAttempt = false) => {
    if (busy) return;
    setBusy(true);
    setErrorCode(null);
    if (loginAttempt) setLoginNotice(null);
    try { await action(); } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
      setErrorCode(/^(auth|firestore)\/[a-z-]+$/.test(code) ? code : 'operation-failed');
      if (loginAttempt) {
        setLoginNotice(code === 'auth/popup-closed-by-user' ? null : code === 'auth/popup-blocked' ? 'blocked' : 'failed');
        setStatus('guest');
      } else setStatus('error');
    } finally { setBusy(false); }
  };
  const login = () => {
    void act(() => client.current!.login(), true);
  };
  const logout = () => { void act(async () => {
    if (invalidState.current) { setStatus('error'); return; }
    await queue.current?.flush();
    if (queue.current?.dirty) { setStatus(queue.current.status); return; }
    // A signed-out device keeps no copy of the memos (specs/16).
    const signedOut = client.current!.auth.currentUser?.uid;
    cacheWrites.current.cancel();
    if (signedOut) await deleteCachedWorkspace(signedOut).catch(() => {});
    await client.current!.logout();
  }); };
  const reload = () => {
    if (reviewRemote) { setReviewOpen(true); return; }
    if ((queue.current?.dirty || invalidState.current) && !window.confirm(labels.discardConfirm)) return;
    void load(client.current?.auth.currentUser ?? null);
  };
  const retry = () => {
    if (client.current && !client.current.auth.currentUser) { login(); return; }
    if (syncUnavailable.current) restartWatching.current?.();
    if (invalidState.current) changed(invalidState.current);
    if (invalidState.current) return;
    // Before the server check finished, only a new load can bring the workspace up to date.
    if (queue.current && serverChecked.current) void queue.current.retry(); else reload();
  };
  const menu = <AccountMenu labels={reviewRemote ? { ...labels, reload: syncLabels.title } : labels} name={session?.user ? session.user.displayName || session.user.email || labels.account : null} status={status} errorCode={status === 'error' ? errorCode : null} busy={busy || status === 'loading'} onLogin={login} onLogout={logout} onRetry={retry} onReload={reload} />;
  if (!session?.user) return <main className="flex min-h-screen flex-col items-center justify-center gap-5 p-6 text-center"><Link href="/" className="flex items-center gap-2"><BrandIcon /><h1 className="text-3xl font-bold">Drafta</h1></Link><p className="max-w-lg">{hasHeldEdits ? authRecoveryCopy[lang] : loginRequiredCopy[lang]}</p>{status !== 'guest' && <p role="status" aria-live="polite">{labels.status[status]}</p>}{loginNotice && <p role="alert" className="max-w-lg">{authErrorCopy[lang][loginNotice]}</p>}{status !== 'loading' && <Button disabled={busy} onClick={retry}>{isAuthenticated ? labels.retry : labels.login}</Button>}</main>;
  const resolveReview = () => {
    if (!reviewRemote || !lastBackup.current || !session.user) return;
    const remote = reviewRemote;
    try {
      const backup = preserveWorkspaceCopy(lastBackup.current, remote.backup, { now: new Date().toISOString(), newId: () => crypto.randomUUID(), copySuffix: syncLabels.suffix });
      queue.current?.dispose();
      queue.current = makeQueue(remote, repositoryFor(session.user.uid, generation.current), generation.current);
      applyRemote(backup, []); queue.current.enqueue(backup, true); setReviewRemote(null);
    } catch { setStatus('error'); }
  };
  return <>{hasHeldEdits && <p role="alert" className="px-4 py-2 text-sm">{authRecoveryCopy[lang]}</p>}<Workspace key={session.key} initialState={session.seed} remoteUpdate={remoteUpdate} accountMenu={menu} onWorkspaceChange={changed} memoHistory={session.history} saveWorkspace={saveWorkspace} /><DeleteConfirmDialog open={reviewOpen} onOpenChange={setReviewOpen} title={syncLabels.title} description={syncLabels.description} confirmText={syncLabels.keepBoth} variant="default" onConfirm={resolveReview} /></>;
}
