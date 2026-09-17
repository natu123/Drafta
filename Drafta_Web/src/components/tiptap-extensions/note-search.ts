import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node } from '@tiptap/pm/model';

export type SearchMatch = { from: number; to: number };
type SearchState = { query: string; index: number; matches: SearchMatch[]; decorations: DecorationSet };
export const noteSearchKey = new PluginKey<SearchState>('draftaNoteSearch');

export function findNoteMatches(doc: Node, query: string): SearchMatch[] {
  if (!query) return [];
  const pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'giu');
  const matches: SearchMatch[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return;
    const text = node.textBetween(0, node.content.size, '\n', '\ufffc');
    for (const match of text.matchAll(pattern)) matches.push({ from: pos + 1 + match.index!, to: pos + 1 + match.index! + match[0].length });
    return false;
  });
  return matches;
}

export const NoteSearch = Extension.create({
  name: 'draftaNoteSearch',
  addProseMirrorPlugins() {
    return [new Plugin<SearchState>({
      key: noteSearchKey,
      state: {
        init: () => ({ query: '', index: 0, matches: [], decorations: DecorationSet.empty }),
        apply(tr, previous) {
          const action = tr.getMeta(noteSearchKey) as { query?: string; step?: number } | undefined;
          if (!action && !tr.docChanged) return previous;
          const query = action?.query ?? previous.query;
          const matches = findNoteMatches(tr.doc, query);
          const initial = action?.query !== undefined ? 0 : previous.index + (action?.step ?? 0);
          const index = matches.length ? (initial % matches.length + matches.length) % matches.length : 0;
          return { query, matches, index, decorations: DecorationSet.create(tr.doc, matches.map((match, i) => Decoration.inline(match.from, match.to, { class: i === index ? 'note-find-hit note-find-current' : 'note-find-hit' }))) };
        },
      },
      props: { decorations: state => noteSearchKey.getState(state)?.decorations },
    })];
  },
});
