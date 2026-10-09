import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const titlePlaceholderKey = new PluginKey('draftaTitlePlaceholder');

/**
 * Shows the placeholder on an empty title only (styled in globals.css).
 * TipTap's Placeholder walked the whole document on every keystroke, which cost
 * ~160ms per character in a 345KB memo; this looks at the first node alone (specs/15).
 */
export const TitlePlaceholder = Extension.create<{ placeholder: () => string }>({
  name: 'draftaTitlePlaceholder',
  addOptions() {
    return { placeholder: () => '' };
  },
  addProseMirrorPlugins() {
    const { placeholder } = this.options;
    return [new Plugin({
      key: titlePlaceholderKey,
      props: {
        decorations: ({ doc }) => {
          const title = doc.firstChild;
          if (!title || title.type.name !== 'title' || title.content.size > 0) return null;
          return DecorationSet.create(doc, [Decoration.node(0, title.nodeSize, { class: 'is-empty', 'data-placeholder': placeholder() })]);
        },
      },
    })];
  },
});
