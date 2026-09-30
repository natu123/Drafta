/** @vitest-environment jsdom */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import type { WorkspaceBackup } from '@/lib/workspace-backup';
import type { WorkspaceState, WorkspaceUpdate } from '@/lib/workspace-state';
import type { AccountMenuProps } from './account-menu';

const mocks = vi.hoisted(() => ({ auth: { currentUser: null as User | null }, notify: null as ((user: User | null) => void) | null, load: vi.fn(), save: vi.fn(), login: vi.fn(), restoreLanguage: vi.fn(), setTheme: vi.fn() }));
vi.mock('@/contexts/lang-context', () => ({ useLang: () => ({ lang: 'en', restoreLanguage: mocks.restoreLanguage }) }));
vi.mock('next-themes', () => ({ useTheme: () => ({ setTheme: mocks.setTheme }) }));
vi.mock('@/lib/firebase-client', () => ({ getFirebaseClient: () => ({ auth: mocks.auth, db: {}, login: mocks.login }) }));
vi.mock('firebase/auth', () => ({ onAuthStateChanged: (_auth: unknown, notify: (user: User | null) => void) => { mocks.notify = notify; notify(mocks.auth.currentUser); return () => {}; } }));
vi.mock('@/lib/cloud-workspace', async importOriginal => ({ ...await importOriginal<object>(), cloudWorkspace: (_db: unknown, uid: string) => ({ load: () => mocks.load(uid), save: (input: WorkspaceBackup, base: unknown) => mocks.save(uid, input, base), history: { list: async () => [] } }) }));
vi.mock('@/lib/cloud-workspace-watch', () => ({ watchCloudWorkspace: () => () => {} }));
vi.mock('./account-menu', () => ({ AccountMenu: (props: AccountMenuProps) => <><span role="status">{props.status}</span><button onClick={props.onRetry}>Retry</button></> }));
vi.mock('./delete-confirm-dialog', () => ({ DeleteConfirmDialog: ({ open, onConfirm }: { open: boolean; onConfirm: () => void }) => open ? <button onClick={onConfirm}>Confirm login</button> : null }));
import CloudSession from './cloud-session';

const backup = (theme: 'system' | 'dark' | 'light' = 'system'): WorkspaceBackup => ({ format: 'drafta-workspace', version: 1, exportedAt: '2026-09-30T00:00:00.000Z', groups: [], notes: [], settings: { theme, language: null, listStyle: 'top', noteSort: 'manual' } });
const user = (uid: string) => ({ uid, displayName: uid } as User);
function Workspace({ initialState, remoteUpdate, onWorkspaceChange, accountMenu }: { initialState?: WorkspaceState; remoteUpdate?: WorkspaceUpdate; onWorkspaceChange?: (state: WorkspaceState) => void; accountMenu?: React.ReactNode }) {
  const [state, setState] = React.useState(initialState!);
  const shown = remoteUpdate?.state ?? state;
  return <>{accountMenu}<span data-theme>{shown.settings.theme}</span><button onClick={() => { const next = { ...shown, settings: { ...shown.settings, theme: 'dark' as const } }; setState(next); onWorkspaceChange?.(next); }}>Edit</button></>;
}
let root: Root, container: HTMLDivElement;
async function auth(uid: string | null) { await act(async () => { if (uid) mocks.save.mockImplementation(async (owner, input) => ({ uid: owner, revision: 3, backup: input })); mocks.auth.currentUser = uid ? user(uid) : null; mocks.notify!(mocks.auth.currentUser); }); }
async function click(text: string) { await act(async () => { [...container.querySelectorAll('button')].find(button => button.textContent === text)!.click(); }); }
beforeEach(async () => {
  vi.useFakeTimers(); Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  mocks.auth.currentUser = user('alice'); mocks.load.mockReset().mockImplementation(async uid => ({ uid, revision: 1, backup: backup() }));
  mocks.save.mockReset().mockRejectedValue(new Error('offline')); mocks.login.mockReset();
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => root.render(<CloudSession Workspace={Workspace} />));
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.useRealTimers(); });

describe('account-scoped interrupted edits', () => {
  it('hides unsaved edits after auth loss and recovers them for the same account', async () => {
    await click('Edit'); await auth(null);
    expect(container.querySelector('[data-theme]')).toBeNull(); expect(container.textContent).toContain('original account');
    const unload = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(unload); expect(unload.defaultPrevented).toBe(true);
    await auth('alice'); expect(container.querySelector('[data-theme]')?.textContent).toBe('dark');
    await act(async () => { await vi.advanceTimersByTimeAsync(800); });
    expect(mocks.save.mock.calls.at(-1)?.[1].settings.theme).toBe('dark');
    expect(container.querySelector('[role=status]')?.textContent).toBe('saved');
  });
  it('never seeds a different account with the held edits', async () => {
    await click('Edit'); await auth(null); await auth('bob');
    expect(container.querySelector('[data-theme]')?.textContent).toBe('system');
    expect(container.textContent).toContain('original account');
    await act(async () => { await vi.advanceTimersByTimeAsync(800); }); expect(mocks.save.mock.calls.some(call => call[0] === 'bob')).toBe(false);
    await auth('alice'); await act(async () => { await vi.advanceTimersByTimeAsync(800); });
    expect(mocks.save.mock.calls.at(-1)?.[0]).toBe('alice'); expect(mocks.save.mock.calls.at(-1)?.[1].settings.theme).toBe('dark');
  });
  it('retains the held edits after server loading fails during reauthentication', async () => {
    await click('Edit'); await auth(null); mocks.load.mockRejectedValueOnce(new Error('offline'));
    await auth('alice'); expect(container.querySelector('[data-theme]')).toBeNull();
    await click('Retry'); expect(container.querySelector('[data-theme]')?.textContent).toBe('dark');
  });
  it('merges a server change with the held local edit rather than overwriting it', async () => {
    await click('Edit'); await auth(null);
    const remote = backup(); remote.settings.language = 'ja';
    mocks.load.mockResolvedValueOnce({ uid: 'alice', revision: 2, backup: remote });
    await auth('alice'); await act(async () => { await vi.advanceTimersByTimeAsync(800); });
    const call = mocks.save.mock.calls.at(-1)!;
    expect(call[1].settings).toMatchObject({ language: 'ja', theme: 'dark' }); expect(call[2].revision).toBe(2);
  });
  it('requires review for simultaneous settings conflicts instead of overwriting the server', async () => {
    await click('Edit'); await auth(null); const count = mocks.save.mock.calls.length;
    mocks.load.mockResolvedValueOnce({ uid: 'alice', revision: 2, backup: backup('light') });
    await auth('alice'); await act(async () => { await vi.advanceTimersByTimeAsync(800); });
    expect(mocks.save).toHaveBeenCalledTimes(count);
    expect(container.querySelector('[role=status]')?.textContent).toBe('conflict');
    expect(container.querySelector('[data-theme]')?.textContent).toBe('dark');
  });
});
