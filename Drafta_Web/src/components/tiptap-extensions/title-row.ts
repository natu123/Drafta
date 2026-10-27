import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, Selection, TextSelection, type EditorState } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const titleRowKey = new PluginKey<boolean>('draftaTitleRow');

const isEditing = (state: EditorState) => {
  const title = state.doc.firstChild;
  return !!titleRowKey.getState(state) && title?.type.name === 'title' && state.selection.$from.parent === title;
};
const touch = () => !!window.matchMedia?.('(pointer: coarse)').matches;

/**
 * The title is a row stuck above the body (AGENTS.md, Editor Layout). It shows in full by default
 * (a very long one up to five lines), is cut to one line with "…" while the body is being written,
 * and while the caret is in it scrolls inside the same five lines. This marks the two focused states: .is-editing
 * with the caret in the title, .is-body with the caret anywhere else (2026-10-26, Gles's request).
 * While a selection changes in it, the row scrolls to the end that moved: the iPhone's selection
 * handles don't scroll the row, and lines hidden in it showed their selection over the body (2026-10-27).
 * On touch screens the row scrolls one line per change (all at once it raced to the end), and a
 * selection stays on the side of the title line it was on: a quick swipe ran it into the body (Gles's idea).
 * Selecting the whole memo still works.
 */
export const TitleRow = Extension.create({
  name: 'draftaTitleRow',
  addProseMirrorPlugins() {
    return [new Plugin<boolean>({
      key: titleRowKey,
      state: {
        init: () => false,
        apply: (tr, focused) => tr.getMeta(titleRowKey) ?? focused,
      },
      view: () => ({
        update: (view, previous) => {
          const { selection } = view.state;
          if (!isEditing(view.state) || previous.selection.eq(selection)) return;
          const row = view.dom.firstElementChild;
          if (!row || row.scrollHeight <= row.clientHeight) return;
          const pos = selection.to !== previous.selection.to ? selection.to : selection.from;
          if (pos < 1 || pos >= view.state.doc.firstChild!.nodeSize) return;
          const caret = view.coordsAtPos(pos, pos === selection.from && !selection.empty ? 1 : -1);
          const box = row.getBoundingClientRect(), style = getComputedStyle(row);
          const top = box.top + parseFloat(style.borderTopWidth), bottom = box.bottom - parseFloat(style.borderBottomWidth);
          // coordsAtPos gives the glyphs; widen them to the whole line so lines show in full.
          const leading = Math.max(0, (parseFloat(style.lineHeight) - (caret.bottom - caret.top)) / 2);
          const step = touch() ? parseFloat(style.lineHeight) : Infinity;
          if (caret.bottom + leading > bottom) row.scrollTop += Math.min(step, caret.bottom + leading - bottom);
          else if (caret.top - leading < top) row.scrollTop -= Math.min(step, top - (caret.top - leading));
        },
      }),
      appendTransaction: (transactions, previous, state) => {
        const title = state.doc.firstChild, { selection } = state;
        if (!transactions.some(tr => tr.selectionSet) || title?.type.name !== 'title' || !(selection instanceof TextSelection) || !touch()) return null;
        const end = title.nodeSize - 1;
        const doc = state.doc, was = previous.selection;
        if ((selection.from <= end) === (selection.to <= end) || (selection.from <= 1 && selection.to >= Selection.atEnd(doc).to)) return null;
        const inTitle = was.to <= end || (was.from > end ? false : selection.anchor <= end);
        return state.tr.setSelection(inTitle
          ? TextSelection.between(doc.resolve(selection.from), doc.resolve(end), -1)
          : TextSelection.between(doc.resolve(selection.to), doc.resolve(title.nodeSize), 1));
      },
      props: {
        handleDOMEvents: {
          focus: view => { view.dispatch(view.state.tr.setMeta(titleRowKey, true)); return false; },
          blur: view => { view.dispatch(view.state.tr.setMeta(titleRowKey, false)); return false; },
        },
        decorations: state => {
          const title = state.doc.firstChild;
          if (!titleRowKey.getState(state) || !title || title.type.name !== 'title') return null;
          const inTitle = state.selection.$from.parent === title;
          return DecorationSet.create(state.doc, [Decoration.node(0, title.nodeSize, { class: inTitle ? 'is-editing' : 'is-body' })]);
        },
      },
    })];
  },
});
