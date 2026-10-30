/** @vitest-environment jsdom */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DateTimeFields } from './date-time-fields';

describe('date and time fields (specs/25, 2.3)', () => {
  let container: HTMLDivElement;
  let root: Root;
  const change = vi.fn();
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div'); document.body.append(container);
    root = createRoot(container); change.mockReset();
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); });
  const render = (value: string) => act(() => root.render(<DateTimeFields value={value} onChange={change} lang="ja" pickLabel="日時" />));
  const fields = () => [...container.querySelectorAll<HTMLInputElement>('input:not([type="datetime-local"])')];
  // React listens for the native input event; the value setter must bypass React's own.
  const type = (field: HTMLInputElement, text: string) => act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field, text);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const press = (field: HTMLInputElement, key: string) => act(() => { field.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })); });

  it('shows the value in five named fields', () => {
    render('2026-10-30T11:12');
    expect(fields().map(field => field.value)).toEqual(['2026', '10', '30', '11', '12']);
    expect(fields().map(field => field.getAttribute('aria-label'))).toEqual(['年', '月', '日', '時', '分']);
  });

  it('moves on when a field is full and reports a real date and time', () => {
    render('2026-10-30T11:12');
    const [, month, day] = fields();
    act(() => month.focus());
    type(month, '11');
    expect(document.activeElement).toBe(day);
    expect(change).toHaveBeenLastCalledWith('2026-11-30T11:12');
    // A first digit that cannot start a month moves on at once.
    act(() => month.focus()); type(month, '3');
    expect(document.activeElement).toBe(day);
  });

  it('keeps a full year when moving on blurs its field', () => {
    render('2026-10-30T11:12');
    const [year, month] = fields();
    act(() => year.focus());
    type(year, '202'); type(year, '2020');
    expect(document.activeElement).toBe(month);
    expect(year.value).toBe('2020');
    expect(change).toHaveBeenLastCalledWith('2020-10-30T11:12');
  });

  it('reports nothing for a date that does not exist', () => {
    render('2026-10-30T11:12');
    type(fields()[1], '02');
    expect(change).toHaveBeenLastCalledWith('');
  });

  it('steps with the arrow keys and wraps around', () => {
    render('2026-10-30T23:59');
    press(fields()[4], 'ArrowUp');
    expect(change).toHaveBeenLastCalledWith('2026-10-30T23:00');
    press(fields()[3], 'ArrowDown');
    expect(change).toHaveBeenLastCalledWith('2026-10-30T22:00');
  });

  it('goes back with Backspace in an empty field', () => {
    render('2026-10-30T11:12');
    const [, , day, hour] = fields();
    type(hour, '');
    act(() => hour.focus()); press(hour, 'Backspace');
    expect(document.activeElement).toBe(day);
  });
});
