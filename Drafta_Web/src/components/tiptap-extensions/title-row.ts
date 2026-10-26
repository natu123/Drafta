import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const titleRowKey = new PluginKey<boolean>('draftaTitleRow');

/**
 * The title is a one-line row stuck above the body (AGENTS.md, Editor Layout): a long title is cut
 * off with "…" there, and shows in full, wrapped, while the caret is in it. This marks it then.
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
          if (!titleRowKey.getState(state) || !title || title.type.name !== 'title' || state.selection.$from.parent !== title) return null;
          return DecorationSet.create(state.doc, [Decoration.node(0, title.nodeSize, { class: 'is-editing' })]);
        },
      },
    })];
  },
});
