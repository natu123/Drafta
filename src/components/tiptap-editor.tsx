
"use client";

import * as React from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Placeholder from '@tiptap/extension-placeholder';
import { Undo, Redo, Bold, Italic, Strikethrough, Pilcrow } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn, htmlToPlainText } from '@/lib/utils';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import type { Note } from '@/lib/types';


interface TiptapEditorProps {
  note: Note;
  onNoteUpdate: (updatedNote: Partial<Note>) => void;
  onIconChange: (icon: string) => void;
}

export const emojis = ['📝', '💡', '🍎', '🌱', '💼', '🛒', '🎉', '✈️', '❤️', '✅', '❌', '💎', '⭐️', '🌈', '🪒', '💬', '🌐'];
const colors = [
  { name: 'Black', value: '#000000' },
  { name: 'Green', value: '#64A364' },
  { name: 'Blue', value: '#51A2FF' },
  { name: 'Purple', value: '#AD46FF' },
  { name: 'Rose', value: '#FF6467' },
  { name: 'Orange', value: '#C49547' },
];

const extensions = [
  StarterKit.configure({
    heading: {
      levels: [2, 3], // h1 is now outside the editor
    },
  }),
  Placeholder.configure({
    placeholder: 'Start writing your note here...',
  }),
  TextStyle,
  Color.configure({
    types: ['textStyle'],
  }),
];

const TiptapEditor: React.FC<TiptapEditorProps> = ({ note, onNoteUpdate, onIconChange }) => {

  const [currentTitle, setCurrentTitle] = React.useState(note.title);
  const isSavingRef = React.useRef(false);
  const contentRef = React.useRef(note.content);

  const editor = useEditor({
    extensions,
    content: note.content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      contentRef.current = editor.getHTML();
      handleSave();
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none px-8 pt-4 pb-8 flex-1',
      },
    },
  });

  // Debounced save function
  const handleSave = React.useCallback(() => {
    if (!isSavingRef.current) {
      isSavingRef.current = true;
      setTimeout(() => {
        onNoteUpdate({ title: currentTitle, content: contentRef.current });
        isSavingRef.current = false;
      }, 500); // 500ms delay
    }
  }, [currentTitle, onNoteUpdate]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTitle(e.target.value);
  };

  const handleTitleBlur = () => {
    handleSave();
  };

  const handleSetColor = (color: string) => {
    if (editor) {
      editor.chain().focus().setColor(color).run();
    }
  };

  const handleConvertToPlainText = () => {
    if (editor) {
      const currentContent = editor.getHTML();
      const plainText = htmlToPlainText(currentContent);

      // The plain text needs to be converted back to HTML paragraphs for the editor
      const newContent = plainText.split('\n').map(p => `<p>${p}</p>`).join('');

      editor.commands.setContent(newContent, true);
    }
  };

  // Sync external changes
  React.useEffect(() => {
    if (note.title !== currentTitle) {
      setCurrentTitle(note.title);
    }
  }, [note.title]);

  React.useEffect(() => {
    if (editor && note.content !== contentRef.current) {
      const { from, to } = editor.state.selection;
      editor.commands.setContent(note.content, false);
      // Only set selection if the editor has focus to avoid grabbing it unexpectedly
      if (editor.isFocused) {
        editor.commands.setTextSelection({ from, to });
      }
      contentRef.current = note.content;
    }
  }, [note.content, editor]);

  if (!editor) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        <div className="p-2 border-b flex items-center gap-1 flex-wrap">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="text-2xl w-12 h-12 shrink-0">
                {note.icon || '📝'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <div className="grid grid-cols-5 gap-2">
                {emojis.map((emoji) => (
                  <Button
                    key={emoji}
                    variant="ghost"
                    size="icon"
                    className={cn("text-xl rounded-md", note.icon === emoji && "bg-primary/20")}
                    onClick={() => onIconChange(emoji)}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
                <Undo />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Undo (Ctrl+Z)</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
                <Redo />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Redo (Ctrl+Y)</p></TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" className="h-6 mx-2" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleConvertToPlainText}>
                <Pilcrow />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Convert to Plain Text</p></TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" className="h-6 mx-2" />
          <div className="flex gap-1 ml-1">
            {colors.map(color => (
              <Tooltip key={color.name}>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className={cn("w-6 h-6 rounded-full p-0", editor.isActive('textStyle', { color: color.value }) && "ring-2 ring-primary ring-offset-2")}
                    style={{ backgroundColor: color.value }}
                    onClick={() => handleSetColor(color.value)}
                  >
                    <span className="sr-only">{color.name}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>{color.name}</p></TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>

        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="bg-background border rounded-md shadow-lg p-1 flex gap-1">
          <Button
            onClick={() => editor.chain().focus().toggleBold().run()}
            variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
            size="icon"
          >
            <Bold />
          </Button>
          <Button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
            size="icon"
          >
            <Italic />
          </Button>
          <Button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            variant={editor.isActive('strike') ? 'secondary' : 'ghost'}
            size="icon"
          >
            <Strikethrough />
          </Button>
        </BubbleMenu>

        <div className="flex-1 overflow-y-auto">
          <Input
            value={currentTitle}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            placeholder="Untitled Note"
            className="text-3xl font-bold border-none focus-visible:ring-0 focus-visible:ring-offset-0 p-8 pb-4 h-auto"
          />
          <Separator className="mx-8 w-auto" />
          <EditorContent editor={editor} />
        </div>
      </div>
    </TooltipProvider>
  );
};

export default TiptapEditor;
