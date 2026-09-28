'use client';

import * as React from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useTheme } from 'next-themes';
import { useLang } from '@/contexts/lang-context';
import { getFirebaseClient, type FirebaseClient } from '@/lib/firebase-client';
import { cloudWorkspace, type SavedWorkspace } from '@/lib/cloud-workspace';
import { watchCloudWorkspace } from '@/lib/cloud-workspace-watch';
import { mergeWorkspaces, preserveWorkspaceCopy } from '@/lib/workspace-merge';
import { syncCopy } from '@/lib/sync-copy';
import { toast } from '@/hooks/use-toast';
import { createWorkspaceBackup } from '@/lib/workspace-backup';
import type { WorkspaceBackup } from '@/lib/workspace-backup';
import { requiresImmediateSave } from '@/lib/workspace-change';
import { workspaceToState, type WorkspaceState, type WorkspaceUpdate } from '@/lib/workspace-state';
import { WorkspaceSaveQueue } from '@/lib/workspace-save-queue';
import { AccountMenu, type SaveStatus } from './account-menu';
import { cloudCopy } from '@/lib/cloud-copy';
import { Button } from './ui/button';
import { DeleteConfirmDialog } from './delete-confirm-dialog';

type ViewProps = { initialState?: WorkspaceState; remoteUpdate?: WorkspaceUpdate; accountMenu?: React.ReactNode; onWorkspaceChange?: (state: WorkspaceState) => void };
const stateFingerprint = (state: WorkspaceState) => JSON.stringify({ notes: state.notes, groups: state.groups, settings: state.settings });

export default function CloudSession({ Workspace }: { Workspace: React.ComponentType<ViewProps> }) {
  const { lang, restoreLanguage } = useLang();
  const labels = cloudCopy[lang];
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
  const guest = React.useRef<WorkspaceState | undefined>(undefined);
  const lastState = React.useRef('');
  const lastBackup = React.useRef<WorkspaceBackup | null>(null);
  const invalidState = React.useRef<WorkspaceState | null>(null);
  const [session, setSession] = React.useState<{ key: number; user: User | null; seed?: WorkspaceState } | null>(null);
  const [status, setStatus] = React.useState<SaveStatus>('loading');
  const [busy, setBusy] = React.useState(false);
  const [errorCode, setErrorCode] = React.useState<string | null>(null);
  const [loginOpen, setLoginOpen] = React.useState(false);
  const [remoteUpdate, setRemoteUpdate] = React.useState<WorkspaceUpdate | undefined>(undefined);
  const [reviewRemote, setReviewRemote] = React.useState<SavedWorkspace | null>(null);
  const [reviewOpen, setReviewOpen] = React.useState(false);

  const applyRemote = React.useCallback((backup: WorkspaceBackup, copies: { originalId: string; copyId: string }[]) => {
    const state = workspaceToState(backup, document);
    lastState.current = stateFingerprint(state); lastBackup.current = backup;
    restoreLanguage(state.settings.language); themeSetter.current(state.settings.theme);
    setRemoteUpdate({ sequence: ++updateSequence.current, state, copies });
    if (copies.length) toast({ description: syncLabelsRef.current.copied });
  }, [restoreLanguage]);
  const makeQueue = React.useCallback((stored: SavedWorkspace | null, repository: ReturnType<typeof cloudWorkspace>, id: number) => new WorkspaceSaveQueue(stored, repository.save, next => {
    if (id === generation.current) setStatus(invalidState.current || syncUnavailable.current ? 'error' : next);
  }, {
    load: repository.load,
    merge: (base, local, remote) => mergeWorkspaces(base, local, remote, { now: new Date().toISOString(), newId: () => crypto.randomUUID(), copySuffix: syncLabelsRef.current.suffix }),
    apply: (backup, copies) => { if (id === generation.current) applyRemote(backup, copies); },
    review: remote => { if (id === generation.current) setReviewRemote(remote); },
  }), [applyRemote]);

  const load = React.useCallback(async (user: User | null) => {
    const id = ++generation.current;
    stopWatching.current?.(); stopWatching.current = null;
    restartWatching.current = null; syncUnavailable.current = false;
    queue.current?.dispose(); queue.current = null;
    setRemoteUpdate(undefined); setReviewRemote(null); setReviewOpen(false);
    invalidState.current = null;
    setErrorCode(null);
    setSession(null); setStatus('loading');
    if (!user) {
      guest.current = undefined;
      setSession({ key: id, user: null }); setStatus('guest'); return;
    }
    try {
      const repository = cloudWorkspace(client.current!.db, user.uid);
      const stored = await repository.load();
      if (id !== generation.current) return;
      const seed = stored ? workspaceToState(stored.backup, document) : guest.current;
      guest.current = undefined;
      if (seed) { restoreLanguage(seed.settings.language); themeSetter.current(seed.settings.theme); }
      lastState.current = seed ? stateFingerprint(seed) : '';
      lastBackup.current = stored?.backup ?? null;
      queue.current = makeQueue(stored, repository, id);
      if (!stored && seed) {
        lastBackup.current = createWorkspaceBackup(seed, document);
        queue.current.enqueue(lastBackup.current, true);
      }
      setStatus(stored ? 'saved' : 'pending');
      setSession({ key: id, user, seed });
      restartWatching.current = () => {
        stopWatching.current?.();
        stopWatching.current = watchCloudWorkspace(client.current!.db, user.uid, remote => {
          if (id !== generation.current) return;
          syncUnavailable.current = false; setErrorCode(null);
          if (!invalidState.current) queue.current?.acceptRemote(remote);
          setStatus(invalidState.current ? 'error' : queue.current?.status ?? 'saved');
        }, () => {
          if (id === generation.current) { syncUnavailable.current = true; setErrorCode('sync-unavailable'); setStatus('error'); }
        });
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
  }, [restoreLanguage, makeQueue]);

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
      if (queue.current?.dirty || invalidState.current) { event.preventDefault(); event.returnValue = ''; }
    };
    const flush = () => { void queue.current?.flush(); };
    const visibility = () => { if (document.visibilityState === 'hidden') flush(); };
    const saveShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); flush(); }
    };
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('blur', flush);
    document.addEventListener('focusout', flush);
    window.addEventListener('keydown', saveShortcut);
    document.addEventListener('visibilitychange', visibility);
    return () => { window.removeEventListener('beforeunload', beforeUnload); window.removeEventListener('blur', flush); document.removeEventListener('visibilitychange', visibility); document.removeEventListener('focusout', flush); window.removeEventListener('keydown', saveShortcut); };
  }, []);

  const sessionKey = session?.key;
  const uid = session?.user?.uid;
  const changed = React.useCallback((state: WorkspaceState) => {
    if (sessionKey !== generation.current) return;
    if (!uid) { guest.current = state; return; }
    if (client.current?.auth.currentUser?.uid !== uid) return;
    const fingerprint = stateFingerprint(state);
    if (fingerprint === lastState.current) {
      if (invalidState.current) { invalidState.current = null; setStatus(queue.current?.status ?? 'pending'); }
      return;
    }
    try {
      const backup = createWorkspaceBackup(state, document);
      invalidState.current = null;
      queue.current?.enqueue(backup, requiresImmediateSave(lastBackup.current, backup));
      lastBackup.current = backup;
      lastState.current = fingerprint;
    } catch { invalidState.current = state; setStatus('error'); }
  }, [sessionKey, uid]);

  const act = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setErrorCode(null);
    try { await action(); } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
      setErrorCode(/^(auth|firestore)\/[a-z-]+$/.test(code) ? code : 'operation-failed');
      setStatus('error');
    } finally { setBusy(false); }
  };
  const login = () => {
    if (!busy) setLoginOpen(true);
  };
  const logout = () => { void act(async () => {
    if (invalidState.current) { setStatus('error'); return; }
    await queue.current?.flush();
    if (queue.current?.dirty) { setStatus(queue.current.status); return; }
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
    if (queue.current) void queue.current.retry(); else reload();
  };
  const menu = <AccountMenu labels={reviewRemote ? { ...labels, reload: syncLabels.title } : labels} name={session?.user ? session.user.displayName || session.user.email || labels.account : null} status={status} errorCode={status === 'error' ? errorCode : null} busy={busy || status === 'loading'} onLogin={login} onLogout={logout} onRetry={retry} onReload={reload} />;
  const loginDialog = loginOpen ? <DeleteConfirmDialog open onOpenChange={setLoginOpen} title={labels.login} description={labels.loginConfirm} confirmText={labels.login} variant="default" onConfirm={() => { void act(() => client.current!.login()); }} /> : null;
  if (!session) return <><main className="flex min-h-screen flex-col items-center justify-center gap-4"><p role="status">{labels.status[status]}</p>{errorCode && <p role="alert">{errorCode}</p>}{status === 'error' && <Button onClick={retry}>{labels.retry}</Button>}</main>{loginDialog}</>;
  const resolveReview = () => {
    if (!reviewRemote || !lastBackup.current || !session.user) return;
    const remote = reviewRemote;
    try {
      const backup = preserveWorkspaceCopy(lastBackup.current, remote.backup, { now: new Date().toISOString(), newId: () => crypto.randomUUID(), copySuffix: syncLabels.suffix });
      queue.current?.dispose();
      queue.current = makeQueue(remote, cloudWorkspace(client.current!.db, session.user.uid), generation.current);
      applyRemote(backup, []); queue.current.enqueue(backup, true); setReviewRemote(null);
    } catch { setStatus('error'); }
  };
  return <><Workspace key={session.key} initialState={session.seed} remoteUpdate={remoteUpdate} accountMenu={menu} onWorkspaceChange={changed} />{loginDialog}<DeleteConfirmDialog open={reviewOpen} onOpenChange={setReviewOpen} title={syncLabels.title} description={syncLabels.description} confirmText={syncLabels.keepBoth} variant="default" onConfirm={resolveReview} /></>;
}
