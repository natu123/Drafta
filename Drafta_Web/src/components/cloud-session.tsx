'use client';

import * as React from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useTheme } from 'next-themes';
import { useLang } from '@/contexts/lang-context';
import { getFirebaseClient, type FirebaseClient } from '@/lib/firebase-client';
import { cloudWorkspace } from '@/lib/cloud-workspace';
import { createWorkspaceBackup } from '@/lib/workspace-backup';
import type { WorkspaceBackup } from '@/lib/workspace-backup';
import { requiresImmediateSave } from '@/lib/workspace-change';
import { workspaceToState, type WorkspaceState } from '@/lib/workspace-state';
import { WorkspaceSaveQueue } from '@/lib/workspace-save-queue';
import { AccountMenu, type SaveStatus } from './account-menu';
import { cloudCopy } from '@/lib/cloud-copy';
import { Button } from './ui/button';
import { DeleteConfirmDialog } from './delete-confirm-dialog';

type ViewProps = { initialState?: WorkspaceState; accountMenu?: React.ReactNode; onWorkspaceChange?: (state: WorkspaceState) => void };
const stateFingerprint = (state: WorkspaceState) => JSON.stringify({ notes: state.notes, groups: state.groups, settings: state.settings });

export default function CloudSession({ Workspace }: { Workspace: React.ComponentType<ViewProps> }) {
  const { lang, restoreLanguage } = useLang();
  const labels = cloudCopy[lang];
  const { setTheme } = useTheme();
  const themeSetter = React.useRef(setTheme);
  React.useEffect(() => { themeSetter.current = setTheme; }, [setTheme]);
  const client = React.useRef<FirebaseClient | null>(null);
  const queue = React.useRef<WorkspaceSaveQueue | null>(null);
  const generation = React.useRef(0);
  const guest = React.useRef<WorkspaceState | undefined>(undefined);
  const lastState = React.useRef('');
  const lastBackup = React.useRef<WorkspaceBackup | null>(null);
  const invalidState = React.useRef<WorkspaceState | null>(null);
  const [session, setSession] = React.useState<{ key: number; user: User | null; seed?: WorkspaceState } | null>(null);
  const [status, setStatus] = React.useState<SaveStatus>('loading');
  const [busy, setBusy] = React.useState(false);
  const [errorCode, setErrorCode] = React.useState<string | null>(null);
  const [loginOpen, setLoginOpen] = React.useState(false);

  const load = React.useCallback(async (user: User | null) => {
    const id = ++generation.current;
    queue.current?.dispose(); queue.current = null;
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
      queue.current = new WorkspaceSaveQueue(stored, repository.save, next => { if (id === generation.current) setStatus(invalidState.current ? 'error' : next); });
      if (!stored && seed) {
        lastBackup.current = createWorkspaceBackup(seed, document);
        queue.current.enqueue(lastBackup.current, true);
      }
      setStatus(stored ? 'saved' : 'pending');
      setSession({ key: id, user, seed });
    } catch (error) {
      if (id === generation.current) {
        const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
        const name = error instanceof Error ? error.name : 'load-failed';
        setErrorCode(/^[a-z/-]+$/.test(code) && code ? code : /^[A-Za-z]+Error$/.test(name) ? name : 'load-failed');
        setStatus('error');
      }
    }
  }, [restoreLanguage]);

  React.useEffect(() => {
    const lifecycle = generation;
    let unsubscribe = () => {};
    try {
      client.current = getFirebaseClient();
      if (!client.current) throw new Error('Firebase unavailable');
      unsubscribe = onAuthStateChanged(client.current.auth, user => { void load(user); }, () => setStatus('error'));
    } catch { setStatus('error'); }
    return () => { unsubscribe(); lifecycle.current++; queue.current?.dispose(); };
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
    if ((queue.current?.dirty || invalidState.current) && !window.confirm(labels.discardConfirm)) return;
    void load(client.current?.auth.currentUser ?? null);
  };
  const retry = () => {
    if (client.current && !client.current.auth.currentUser) { login(); return; }
    if (invalidState.current) changed(invalidState.current);
    if (invalidState.current) return;
    if (queue.current) void queue.current.retry(); else reload();
  };
  const menu = <AccountMenu labels={labels} name={session?.user ? session.user.displayName || session.user.email || labels.account : null} status={status} errorCode={status === 'error' ? errorCode : null} busy={busy || status === 'loading'} onLogin={login} onLogout={logout} onRetry={retry} onReload={reload} />;
  const loginDialog = <DeleteConfirmDialog open={loginOpen} onOpenChange={setLoginOpen} title={labels.login} description={labels.loginConfirm} confirmText={labels.login} variant="default" onConfirm={() => { void act(() => client.current!.login()); }} />;
  if (!session) return <><main className="flex min-h-screen flex-col items-center justify-center gap-4"><p role="status">{labels.status[status]}</p>{errorCode && <p role="alert">{errorCode}</p>}{status === 'error' && <Button onClick={retry}>{labels.retry}</Button>}</main>{loginDialog}</>;
  return <><Workspace key={session.key} initialState={session.seed} accountMenu={menu} onWorkspaceChange={changed} />{loginDialog}</>;
}
