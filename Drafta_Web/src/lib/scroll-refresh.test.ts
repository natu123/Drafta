/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { onResume, refreshScrollAreas } from './scroll-refresh';

afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ''; });
const setVisibility = (state: DocumentVisibilityState) => Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });

describe('returning to the home-screen app', () => {
  it('calls back once the page is shown again, not while it is hidden', () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const stop = onResume(callback);
    setVisibility('hidden'); document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(500);
    expect(callback).not.toHaveBeenCalled();
    setVisibility('visible'); document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(299);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
    stop();
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(500);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('also calls back when the page comes back from the page cache', () => {
    vi.useFakeTimers();
    setVisibility('visible');
    const callback = vi.fn();
    const stop = onResume(callback);
    window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: false }));
    vi.advanceTimersByTime(500);
    expect(callback).not.toHaveBeenCalled();
    window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true }));
    vi.advanceTimersByTime(300);
    expect(callback).toHaveBeenCalledTimes(1);
    stop();
  });

  it('stops scrolling for two frames, then gives back the inline style and the position', () => {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.push(callback); return frames.length; });
    document.body.innerHTML = '<div class="memo-list-scroll" style="overflow-y: auto"></div><div class="memo-list-scroll"></div>';
    const [shown, hidden] = [...document.querySelectorAll<HTMLElement>('.memo-list-scroll')];
    Object.defineProperty(shown, 'offsetParent', { value: document.body });
    Object.defineProperty(hidden, 'offsetParent', { value: null });
    shown.scrollTop = 120;
    refreshScrollAreas();
    expect(shown.style.overflowY).toBe('hidden');
    expect(hidden.style.overflowY).toBe('');
    frames.shift()!(0);
    expect(shown.style.overflowY).toBe('hidden');
    frames.shift()!(0);
    expect(shown.style.overflowY).toBe('auto');
    expect(shown.scrollTop).toBe(120);
  });
});
