"use client";

import { DOMSerializer, DOMParser } from '@tiptap/pm/model';

import * as React from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Undo, Redo, Bold, Italic, Strikethrough, Pilcrow, List, ListChecks, ListOrdered, Minus, FileText, Type } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn, removeFormatting, richToPlainMarkdown, plainMarkdownToRich } from '@/lib/utils';
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
      levels: [1, 2, 3], // All heading levels enabled
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
  Table.configure({
    resizable: true,
  }),
  TableRow,
  TableCell,
  TableHeader,
];

const TiptapEditor: React.FC<TiptapEditorProps> = ({ note, onNoteUpdate, onIconChange, scrollDirection = 'bottom' }) => {

  const [currentTitle, setCurrentTitle] = React.useState(note.title);
  const [isPlainTextMode, setIsPlainTextMode] = React.useState(false);
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
      // Serialize to plain text with markdown formatting
      clipboardTextSerializer: (slice, view) => {
        // 1. Serialize Slice to DOM fragment
        try {
          // Using logic assuming DOMSerializer will be imported
          const schema = view.state.schema;
          const serializer = DOMSerializer.fromSchema(schema);
          const domFragment = serializer.serializeFragment(slice.content);

          const tempDiv = document.createElement('div');
          tempDiv.appendChild(domFragment);

          // 3. Convert HTML to Markdown using our utility
          return richToPlainMarkdown(tempDiv.innerHTML);
        } catch (e) {
          console.error('Failed to serialize clibpoard text to markdown', e);
          return slice.content.textBetween(0, slice.content.size, '\n', '\n');
        }
      },
      // Handle pasting markdown content
      handlePaste: (view, event) => {
        const text = event.clipboardData?.getData('text/plain');
        const html = event.clipboardData?.getData('text/html');

        // If there is HTML, prefer it (let default handler handle it)
        if (html) return false;
        if (!text) return false;

        // Simple detection for markdown patterns
        const markdownPatterns = [
          /^#\s/m,           // Headings
          /^-\s/m,           // Unordered lists (hyphen)
          /^\*\s/m,          // Unordered lists (asterisk)
          /^\d+\.\s/m,       // Ordered lists
          /^>\s/m,           // Blockquotes
          /^-{3,}/m,         // Horizontal rules
          /\|.*\|.*\|/m,     // Tables (basic check)
        ];

        // Check if the pasted text looks like markdown
        const hasMarkdown = markdownPatterns.some(pattern => pattern.test(text));

        if (hasMarkdown) {
          // Convert markdown to HTML using our existing utility
          const parsedHtml = plainMarkdownToRich(text.trim()); // Trim to prevent trailing empty lines

          // Parse HTML to Slice and insert
          const parser = DOMParser.fromSchema(view.state.schema);
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = parsedHtml;
          const slice = parser.parseSlice(tempDiv);

          view.dispatch(view.state.tr.replaceSelection(slice));
          return true; // Prevent default paste behavior
        }
        return false;
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
      // We keep empty lines as <p><br></p> to preserve vertical spacing.
      // Filter trailing empty strings to prevent accumulation.
      const lines = plainText.split('\n').map((p: string) => p.trim());
      // Remove trailing empty strings
      while (lines.length > 0 && lines[lines.length - 1] === '') {
        lines.pop();
      }
      const newContent = lines
        .map((p: string) => p === '' ? '<p><br></p>' : `<p>${p}</p>`)
        .join('');

      // Only apply if content actually changed to avoid unnecessary undo entries
      if (newContent !== currentContent) {
        editor.commands.setContent(newContent, true);
        // Return focus to editor to clear button highlight
        editor.commands.focus();
      }
    }
  };

  const handleTogglePlainTextMode = () => {
    if (!editor) return;

    if (isPlainTextMode) {
      // Plain → Rich: Convert markdown-style back to rich text
      // Get HTML and extract text content with newlines between paragraphs
      const html = editor.getHTML();
      // Extract text from each paragraph, joining with newlines
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      const paragraphs = tempDiv.querySelectorAll('p');
      const textLines = Array.from(paragraphs).map(p => p.textContent || '');
      const markdownText = textLines.join('\n');
      const richContent = plainMarkdownToRich(markdownText);
      // Don't add to history to prevent undo interference
      editor.chain().setContent(richContent, false, { preserveWhitespace: 'full' }).run();
    } else {
      // Rich → Plain: Convert to markdown-style text
      const currentContent = editor.getHTML();
      const plainContent = richToPlainMarkdown(currentContent);
      // Wrap each line in <p>, keep empty lines as empty paragraphs for spacing
      // Filter trailing empty strings to prevent accumulation
      const lines = plainContent.split('\n').map(p => p.trim());
      while (lines.length > 0 && lines[lines.length - 1] === '') {
        lines.pop();
      }
      const wrappedContent = lines
        .map(p => p === '' ? '<p><br></p>' : `<p>${p}</p>`)
        .join('');
      // Don't add to history to prevent undo interference
      editor.chain().setContent(wrappedContent, false, { preserveWhitespace: 'full' }).run();
    }
    setIsPlainTextMode(!isPlainTextMode);
    // Return focus to editor to clear button highlight and allow immediate typing
    editor.commands.focus();
  };

  // Sync external changes
  React.useEffect(() => {
    if (note.title !== currentTitle) {
      setCurrentTitle(note.title);
    }
  }, [note.title]);

  // Clear undo history and reset mode when switching notes
  const prevNoteIdRef = React.useRef(note.id);
  React.useEffect(() => {
    if (editor && note.id !== prevNoteIdRef.current) {
      // Note changed - clear undo history to prevent cross-note undo
      editor.commands.clearContent(false);
      editor.commands.setContent(note.content, false);
      contentRef.current = note.content;
      // Reset plain text mode
      setIsPlainTextMode(false);
      prevNoteIdRef.current = note.id;
    }
  }, [note.id, note.content, editor]);

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
        <div className="px-4 border-b flex items-center gap-1 shrink-0 h-[57px]">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="text-2xl w-10 h-10 shrink-0">
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                <ListOrdered />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Numbered List</p></TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" className="h-6 mx-2" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={isPlainTextMode ? 'secondary' : 'ghost'} size="icon" onClick={handleTogglePlainTextMode}>
                {isPlainTextMode ? <Type /> : <FileText />}
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>{isPlainTextMode ? 'Convert to Rich' : 'Convert to Plain'}</p></TooltipContent>
          </Tooltip>
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
