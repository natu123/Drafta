/** @vitest-environment jsdom */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InlineNameEditor } from './inline-name-editor';

vi.mock('@/contexts/lang-context', () => ({ useLang: () => ({ t: { cancel: 'Cancel' } }) }));

describe('inline name draft', () => {
  let container: HTMLDivElement;
  let root: Root;
  const confirm = vi.fn();
  const cancel = vi.fn();
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    confirm.mockClear(); cancel.mockClear();
    container = document.createElement('div'); document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); });
  const mount = (value = '') => act(() => root.render(<InlineNameEditor label="Name" placeholder="Untitled" confirmLabel="Save" initialValue={value} onConfirm={confirm} onCancel={cancel} />));
  const submit = () => act(() => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });

  it('focuses the draft without creating a record', () => {
    mount('Existing');
    expect(document.activeElement).toBe(container.querySelector('input'));
    expect(confirm).not.toHaveBeenCalled();
  });
  it('trims and submits once even if submission is repeated', () => {
    mount('  Name  '); submit(); submit();
    expect(confirm).toHaveBeenCalledExactlyOnceWith('Name');
  });
  it('allows explicit unnamed creation', () => {
    mount(); submit(); expect(confirm).toHaveBeenCalledWith('');
  });
  it('cancels on Escape without confirming', () => {
    mount('Draft');
    act(() => container.querySelector('input')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    expect(cancel).toHaveBeenCalledOnce(); expect(confirm).not.toHaveBeenCalled();
  });
  it('does not submit or cancel during IME composition', () => {
    mount('日本語');
    const input = container.querySelector('input')!;
    act(() => input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })));
    submit();
    act(() => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true })));
    expect(confirm).not.toHaveBeenCalled(); expect(cancel).not.toHaveBeenCalled();
    act(() => input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })));
    submit(); expect(confirm).toHaveBeenCalledWith('日本語');
  });
});
