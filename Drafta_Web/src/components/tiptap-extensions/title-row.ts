import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const titleRowKey = new PluginKey<boolean>('draftaTitleRow');

/**
 * The title is a row stuck above the body (AGENTS.md, Editor Layout). It shows in full by default
 * (a very long one up to five lines), is cut to one line with "…" while the body is being written,
 * and while the caret is in it scrolls inside the same five lines. This marks the two focused states: .is-editing
 * with the caret in the title, .is-body with the caret anywhere else (2026-10-26, Gles's request).
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
