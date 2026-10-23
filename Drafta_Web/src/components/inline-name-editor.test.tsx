/** @vitest-environment jsdom */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InlineCreate, InlineNameEditor, type InlineCreateHandle } from './inline-name-editor';

vi.mock('@/contexts/lang-context', () => ({ useLang: () => ({ t: { cancel: 'Cancel', create: 'Create' } }) }));

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


  it('keeps a picker at the start of the field, closed and open, and returns the focus after a choice', () => {
    let picked: (() => void) | undefined;
    const Picker = ({ onPicked }: { onPicked?: () => void }) => { picked = onPicked; return <button type="button" aria-label="Add to: Inbox">Inbox</button>; };
    act(() => root.render(<InlineCreate label="Add memo to Inbox" buttonLabel="Add memo" picker={<Picker />} placeholder="Untitled" onCreate={confirm} />));
    const buttons = () => [...container.querySelectorAll('button')].map(button => button.getAttribute('aria-label') ?? button.textContent);
    expect(buttons()).toEqual(['Add to: Inbox', 'Add memo']);
    act(() => container.querySelectorAll('button')[1].click());
    const input = container.querySelector('input')!;
    expect(input.getAttribute('aria-label')).toBe('Add memo to Inbox');
    expect(input.previousElementSibling?.getAttribute('aria-label')).toBe('Add to: Inbox');
    act(() => { input.blur(); picked?.(); });
    expect(document.activeElement).toBe(input);
  });

  it('opens the add field from another control and keeps a draft when asked again', () => {
    const handle = React.createRef<InlineCreateHandle>();
    act(() => root.render(<InlineCreate ref={handle} label="Add memo" placeholder="Untitled" onCreate={confirm} />));
    expect(container.querySelector('input')).toBeNull();
    act(() => handle.current!.open());
    const input = container.querySelector('input')!;
    expect(document.activeElement).toBe(input);
    act(() => { input.blur(); });
    act(() => handle.current!.open());
    expect(container.querySelector('input')).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(confirm).not.toHaveBeenCalled();
  });
});
