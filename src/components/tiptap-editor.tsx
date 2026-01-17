"use client";

import * as React from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Undo, Redo, Bold, Italic, Strikethrough, Pilcrow, List, ListChecks, Minus } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn, removeFormatting } from '@/lib/utils';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import type { Note } from '@/lib/types';


interface TiptapEditorProps {
  note: Note;
  onNoteUpdate: (updatedNote: Partial<Note>) => void;
  onIconChange: (icon: string) => void;
  scrollDirection?: 'top' | 'bottom';
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
  TaskList,
  TaskItem.configure({
    nested: true,
  }),
];

const TiptapEditor: React.FC<TiptapEditorProps> = ({ note, onNoteUpdate, onIconChange, scrollDirection = 'bottom' }) => {

  const [currentTitle, setCurrentTitle] = React.useState(note.title);
  const isSavingRef = React.useRef(false);
  const contentRef = React.useRef(note.content);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions,
    content: note.content,
    immediatelyRender: false,
    enableInputRules: false, // Disables automatic markdown-like shortcuts (e.g. typing "- " for a list)
    enablePasteRules: false,
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

  // Scroll to bottom on mount depends on setting
  React.useEffect(() => {
    if (scrollContainerRef.current) {
      if (scrollDirection === 'bottom') {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      } else {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  }, [scrollDirection]); // Re-run if preference changes (rare but correct)

  // Immediate save function (Debounce removed per user request)
  const handleSave = React.useCallback(() => {
    onNoteUpdate({ title: currentTitle, content: contentRef.current });
  }, [currentTitle, onNoteUpdate]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setCurrentTitle(newTitle);
    onNoteUpdate({ title: newTitle });
  };

  const handleTitleBlur = () => {
    handleSave();
  };

  const handleSetColor = (color: string) => {
    if (editor) {
      editor.chain().focus().setColor(color).run();
    }
  };

  const handleRemoveFormatting = () => {
    if (editor) {
      const currentContent = editor.getHTML();
      const plainText = removeFormatting(currentContent);

      // The plain text needs to be converted back to HTML paragraphs for the editor.
      // We trim each line to ensure no leading spaces remain (e.g. after deleting a number).
      const newContent = plainText.split('\n')
        .map((p: string) => p.trim())
        .filter((p: string) => p !== '')
        .map((p: string) => `<p>${p}</p>`)
        .join('');

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
          <Separator orientation="vertical" className="h-6 mx-2" />
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
              <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
                <Minus />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Add Separator</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleBulletList().run()}>
                <List />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Bullet List</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={editor.isActive('taskList') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleTaskList().run()}>
                <ListChecks />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Checkbox List</p></TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" className="h-6 mx-2" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleRemoveFormatting}>
                <Pilcrow />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Remove Formatting</p></TooltipContent>
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

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto"
        >
          <Input
            value={currentTitle}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            placeholder="Untitled Note"
            className="text-3xl font-bold border-none focus-visible:ring-0 focus-visible:ring-offset-0 p-8 pb-4 h-auto"
          />
          <Separator className="mx-8 w-auto h-[2px] mb-8 bg-foreground/20" />
          <EditorContent editor={editor} />
        </div>
      </div>
    </TooltipProvider>
  );
};

export default TiptapEditor;
