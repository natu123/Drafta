// The iPhone's home-screen app sometimes comes back from the background with a list that no longer
// follows the finger, about one return in ten, until the list is hidden and shown again (switching
// to the tray list and back fixed it; Safari tabs were not affected). Making the shown scroll areas
// anew when the app returns does what that switch did (2026-10-26, Gles's report). The fault in
// WebKit itself is not confirmed: Playwright's WebKit on Windows scrolled every time.

const SCROLL_AREAS = '.memo-list-scroll, .tray-scroll [data-radix-scroll-area-viewport], .editor-scroll';

export function isHomeScreenApp(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** Turns off each shown scroll area's scrolling for two frames, so WebKit builds it again, and keeps its position. */
export function refreshScrollAreas(root: ParentNode = document): void {
  const areas = [...root.querySelectorAll<HTMLElement>(SCROLL_AREAS)].filter(area => area.offsetParent !== null);
  const kept = areas.map(area => ({ area, top: area.scrollTop, overflow: area.style.overflowY }));
  for (const { area } of kept) area.style.overflowY = 'hidden';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    for (const { area, top, overflow } of kept) {
      area.style.overflowY = overflow;
      area.scrollTop = top;
    }
  }));
}

/** Calls back shortly after the page comes to the front again: shown after being hidden, or restored from the page cache. */
export function onResume(callback: () => void, settle = 300): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const run = () => {
    if (document.visibilityState !== 'visible') return;
    clearTimeout(timer);
    timer = setTimeout(callback, settle);
  };
  const shown = (event: PageTransitionEvent) => { if (event.persisted) run(); };
  document.addEventListener('visibilitychange', run);
  window.addEventListener('pageshow', shown);
  return () => {
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', run);
    window.removeEventListener('pageshow', shown);
  };
}
