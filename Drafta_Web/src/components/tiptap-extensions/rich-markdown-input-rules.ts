import { Extension, InputRule, wrappingInputRule, markInputRule, textblockTypeInputRule } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';

export const RichMarkdownInputRules = Extension.create<{ isEnabled: () => boolean }>({
  name: 'richMarkdownInputRules',
  priority: 1000,
  addOptions() {
    return { isEnabled: () => true };
  },
  addKeyboardShortcuts() {
    const toggle = (mark: string) => !this.options.isEnabled() || !this.editor.isEditable ? true : this.editor.commands.toggleMark(mark);
    return {
      'Mod-b': () => toggle('bold'),
      'Mod-i': () => toggle('italic'),
      'Mod-Shift-x': () => toggle('strike'),
      'Mod-e': () => toggle('code'),
      // Undo the automatic wrapper before the custom list Backspace handler runs.
      Backspace: () => this.options.isEnabled() && this.editor.isEditable && this.editor.commands.undoInputRule(),
      Enter: () => {
        if (!this.options.isEnabled() || !this.editor.isEditable) return false;
        const { state, view } = this.editor;
        const { $from, empty } = state.selection;
        if (!empty || $from.parent.type.name !== 'paragraph' || $from.parentOffset !== $from.parent.content.size) return false;
        const fence = /^(?:```|~~~)([\w+-]*)$/.exec($from.parent.textContent);
        if (fence) return this.editor.chain().deleteRange({ from: $from.start(), to: $from.end() }).setCodeBlock({ language: fence[1] || 'plaintext' }).run();
        // A Markdown table starts with a header paragraph and a delimiter paragraph.
        if ($from.depth !== 1 || $from.index(0) < 2) return false;
        const previous = state.doc.child($from.index(0) - 1);
        const cells = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
        if (previous.type.name !== 'paragraph' || !previous.textContent.includes('|') || !$from.parent.textContent.includes('|')) return false;
        const headers = cells(previous.textContent);
        const delimiters = cells($from.parent.textContent);
        if (headers.length !== delimiters.length || headers.length < 2 || !delimiters.every(cell => /^:?-{3,}:?$/.test(cell))) return false;
        const { table, tableRow, tableHeader, tableCell, paragraph } = state.schema.nodes;
        if (!table || !tableRow || !tableHeader || !tableCell) return false;
        const tableNode = table.create(null, [
          tableRow.create(null, headers.map(text => tableHeader.create(null, paragraph.create(null, text ? state.schema.text(text) : null)))),
          tableRow.create(null, headers.map(() => tableCell.create(null, paragraph.create()))),
        ]);
        const start = $from.before() - previous.nodeSize;
        const tr = state.tr.replaceWith(start, $from.after(), [tableNode, paragraph.create()]);
        tr.setSelection(TextSelection.near(tr.doc.resolve(start + tableNode.nodeSize + 1)));
        view.dispatch(tr.scrollIntoView());
        return true;
      },
    };
  },
  addInputRules() {
    const { nodes, marks } = this.editor.schema;
    const blocks = [
      // Browsers can represent a typed trailing space as a non-breaking space.
      wrappingInputRule({ find: /^>[ \u00a0]$/, type: nodes.blockquote }),
      wrappingInputRule({ find: /^[-+*][ \u00a0]$/, type: nodes.bulletList }),
      wrappingInputRule({ find: /^(\d+)\.[ \u00a0]$/, type: nodes.orderedList, getAttributes: match => ({ start: Number(match[1]), startFrom: Number(match[1]) }) }),
      wrappingInputRule({ find: /^\[([ xX]?)\][ \u00a0]$/, type: nodes.taskItem, getAttributes: match => ({ checked: match[1].toLowerCase() === 'x' }) }),
      textblockTypeInputRule({ find: /^(#{1,3})[ \u00a0]$/, type: nodes.heading, getAttributes: match => ({ level: match[1].length }) }),
      textblockTypeInputRule({ find: /^(?:```|~~~)([\w+-]*)[ \u00a0]$/, type: nodes.codeBlock, getAttributes: match => ({ language: match[1] || 'plaintext' }) }),
      new InputRule({ find: /^(?:---|___|\*\*\*)[ \u00a0]$/, handler: ({ chain, range }) => { chain().deleteRange(range).setHorizontalRule().run(); } }),
    ];
    const inline = [
      markInputRule({ find: /(?:^|\s)(\*\*(?!\s+\*\*)((?:[^*]+))\*\*(?!\s+\*\*))$/, type: marks.bold }),
      markInputRule({ find: /(?:^|\s)(__(?!\s+__)((?:[^_]+))__(?!\s+__))$/, type: marks.bold }),
      markInputRule({ find: /(?:^|\s)(\*(?!\s+\*)((?:[^*]+))\*(?!\s+\*))$/, type: marks.italic }),
      markInputRule({ find: /(?:^|\s)(_(?!\s+_)((?:[^_]+))_(?!\s+_))$/, type: marks.italic }),
      markInputRule({ find: /(?:^|\s)(~~(?!\s+~~)((?:[^~]+))~~(?!\s+~~))$/, type: marks.strike }),
      markInputRule({ find: /(?:^|\s)(`([^`]+)`)$/, type: marks.code }),
      markInputRule({ find: /\{color:(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})\}([^{}\n]+)\{\/color\}$/, type: marks.textStyle, getAttributes: match => ({ color: match[1] }) }),
    ];
    return [...blocks, ...inline].map(rule => {
      return new InputRule({
        find: rule.find,
        handler: (props) => {
          const parent = props.state.selection.$from.parent;
          if (!this.options.isEnabled() || !this.editor.isEditable || parent.type.name === 'title' || parent.type.spec.code) return null;
          if (blocks.includes(rule) && parent.type.name !== 'paragraph') return null;
          return rule.handler(props);
        },
      });
    });
  },
});
