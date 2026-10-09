/**
 * Editors write their text into app state shortly after typing stops (specs/15). Anything that
 * reads or saves the workspace first calls flushPendingEdits, so no keystroke is left behind.
 */
const editors = new Set<() => boolean>();

/** Registers an editor's flush; it returns true when it wrote pending text. */
export function registerPendingEdit(flush: () => boolean): () => void {
  editors.add(flush);
  return () => { editors.delete(flush); };
}

/** Writes every editor's pending text into app state now. Returns true if any text was written. */
export function flushPendingEdits(): boolean {
  let wrote = false;
  for (const flush of [...editors]) wrote = flush() || wrote;
  return wrote;
}
