/** @vitest-environment jsdom */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountMenuProps } from './account-menu';

const mocks = vi.hoisted(() => ({ login: vi.fn(), restoreLanguage: vi.fn(), setTheme: vi.fn() }));
vi.mock('@/contexts/lang-context', () => ({ useLang: () => ({ lang: 'en', restoreLanguage: mocks.restoreLanguage }) }));
vi.mock('next-themes', () => ({ useTheme: () => ({ setTheme: mocks.setTheme }) }));
vi.mock('@/lib/firebase-client', () => ({ getFirebaseClient: () => ({ auth: { currentUser: null }, login: mocks.login }) }));
vi.mock('firebase/auth', () => ({ onAuthStateChanged: (_auth: unknown, callback: (user: null) => void) => { callback(null); return () => {}; } }));
vi.mock('./account-menu', () => ({ AccountMenu: (props: AccountMenuProps) => <><button onClick={props.onLogin}>Login</button><button onClick={props.onRetry}>Retry</button><span>{props.errorCode}</span></> }));
vi.mock('./delete-confirm-dialog', () => ({ DeleteConfirmDialog: ({ open, onConfirm, onOpenChange }: { open: boolean; onConfirm: () => void; onOpenChange: (open: boolean) => void }) => open ? <div role="alertdialog"><button onClick={() => { onConfirm(); onOpenChange(false); }}>Confirm login</button><button onClick={() => onOpenChange(false)}>Cancel</button></div> : null }));
import CloudSession from './cloud-session';

let root: Root;
let container: HTMLDivElement;
function Workspace({ accountMenu }: { accountMenu?: React.ReactNode }) {
  const [draft, setDraft] = React.useState('Initial preview');
  return <>{accountMenu}<button onClick={() => setDraft('Keep my draft')}>Edit draft</button><p>{draft}</p></>;
}
async function click(label: string) {
  const button = [...container.querySelectorAll('button')].find(element => element.textContent === label);
  expect(button).toBeDefined();
  await act(async () => { button!.click(); });
}
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  mocks.login.mockReset().mockRejectedValue({ code: 'auth/popup-blocked' });
  container = document.createElement('div'); document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(<CloudSession Workspace={Workspace} />));
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); });

describe('authentication retry', () => {
  it('restarts authentication after a blocked popup without resetting the draft', async () => {
    const nativeConfirm = vi.spyOn(window, 'confirm');
    await click('Edit draft'); await click('Login');
    expect(mocks.login).not.toHaveBeenCalled();
    await click('Confirm login');
    expect(mocks.login).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('auth/popup-blocked');
    await click('Retry');
    expect(container.textContent).toContain('Keep my draft');
    await click('Confirm login');
    expect(mocks.login).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain('Keep my draft');
    expect(nativeConfirm).not.toHaveBeenCalled();
  });
  it('preserves the draft when confirmation is cancelled', async () => {
    await click('Edit draft'); await click('Login'); await click('Cancel');
    expect(mocks.login).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Keep my draft');
  });
});
