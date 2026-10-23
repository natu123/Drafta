import { Extension } from '@tiptap/core';
import { NodeSelection, Selection, type EditorState } from '@tiptap/pm/state';

const atTitleEnd = ({ selection }: EditorState) => {
  const { $from } = selection;
  return selection.empty && $from.parent.type.name === 'title' && $from.parentOffset === $from.parent.content.size;
};

// The first place in the body (a cursor, or a selected block such as a rule), or a gap cursor right
// after the title.
const atBodyStart = ({ selection, doc }: EditorState) => {
  const title = doc.firstChild;
  if (!title || title.type.name !== 'title') return false;
  if (!selection.empty && !(selection instanceof NodeSelection)) return false;
  return selection.from === title.nodeSize || selection.from === Selection.findFrom(doc.resolve(title.nodeSize), 1)?.from;
};

/**
 * Keeps the left and right arrows (and word jumps) on their own side of the title line: the right
 * arrow at the end of the title and the left arrow at the start of the body stay where they are
 * (2026-10-23, Gles's request, 0.10.2). Up, down, Tab and clicks still move between the two.
 * The high priority runs this before the gap cursor and the other arrow handlers.
 */
export const TitleCaret = Extension.create({
  name: 'draftaTitleCaret',
  priority: 1000,
  addKeyboardShortcuts() {
    const right = () => atTitleEnd(this.editor.state);
    const left = () => atBodyStart(this.editor.state);
    return {
      ArrowRight: right,
      'Ctrl-ArrowRight': right,
      'Alt-ArrowRight': right,
      ArrowLeft: left,
      'Ctrl-ArrowLeft': left,
      'Alt-ArrowLeft': left,
    };
  },
});
