"use client";

import { DOMSerializer, DOMParser } from '@tiptap/pm/model';

import * as React from 'react';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { all, createLowlight } from 'lowlight';
import { useEditor, EditorContent, BubbleMenu, Editor } from '@tiptap/react';
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
import Text from '@tiptap/extension-text';
import Paragraph from '@tiptap/extension-paragraph';
import { Separator } from './ui/separator';
import type { Note } from '@/lib/types';
import { TitleDocument } from './tiptap-extensions/title-document';

// Create lowlight instance with all languages to ensure markdown support
const lowlight = createLowlight(all);

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
  { name: 'Rose', value: '#E7A1B0' },
  { name: 'Orange', value: '#C49547' },
];

const extensions = [
  TitleDocument, // Custom Document Extension enforcing H1 at start
  StarterKit.configure({
    document: false, // Disable default document
    heading: {
      levels: [1, 2, 3],
    },
    codeBlock: false, // Disable default codeBlock to use lowlight
  }),
  CodeBlockLowlight.configure({
    lowlight,
    defaultLanguage: 'plaintext',
  }),
  Placeholder.configure({
    placeholder: ({ node }) => {
      if (node.type.name === 'heading' && node.attrs.level === 1) {
        return 'Untitled Note';
      }
      return 'Type \'/\' for commands...';
    },
    showOnlyCurrent: false, // Show placeholders in empty nodes even if not focused (optional)
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

  const [isPlainTextMode, setIsPlainTextMode] = React.useState(false);
  const contentRef = React.useRef(note.content);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Color Markdown → HTML変換（タイトル表示用）
  const titleToHtml = React.useCallback((title: string): string => {
    return title.replace(
      /\{color:(#[0-9A-Fa-f]{3,6})\}(.+?)\{\/color\}/gi,
      '<span style="color: $1">$2</span>'
    );
  }, []);

  // HTML → Color Markdown変換（タイトル保存用）
  const htmlToTitle = React.useCallback((html: string): string => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    temp.querySelectorAll('span[style*="color"]').forEach(span => {
      const style = span.getAttribute('style') || '';
      const hexMatch = style.match(/color:\s*(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3})/i);
      if (hexMatch && hexMatch[1].toLowerCase() !== '#000000') {
        span.replaceWith(`{color:${hexMatch[1]}}${span.textContent}{/color}`);
      } else {
        span.replaceWith(span.textContent || '');
      }
    });
    return temp.textContent || '';
  }, []);

  // Combine title and content for initial editor state
  const getInitialContent = React.useCallback((title: string, content: string) => {
    // Ensure content starts with HTML tags if it's empty or plain text
    // We construct: <h1>TITLE</h1>CONTENT
    // If content is empty, we add an empty paragraph to allow easy clicking/focusing on body.
    const titleHtml = titleToHtml(title);
    const bodyContent = content || '<p></p>';
    return `<h1>${titleHtml}</h1>${bodyContent}`;
  }, [titleToHtml]);

  const handleSave = React.useCallback((editorInstance: Editor) => {
    // Extract title (first H1) and content (rest)
    const json = editorInstance.getJSON();
    const content = editorInstance.getHTML();

    let newTitle = '';
    let newContent = '';

    // Check if first node is H1
    if (json.content && json.content.length > 0 && json.content[0].type === 'heading' && json.content[0].attrs?.level === 1) {
      // It's the title. Use DOM parser to get inner HTML of the first node for accurate color extraction
      // Or simpler: parse the full HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      const firstH1 = tempDiv.querySelector('h1');

      if (firstH1) {
        // Extract title with colors
        newTitle = htmlToTitle(firstH1.innerHTML);
        // Remove the first H1 from content
        firstH1.remove();
        newContent = tempDiv.innerHTML;
      } else {
        // Fallback if H1 missing in HTML but present in JSON (unlikely)
        newContent = content;
      }
    } else {
      // No H1 found (should be impossible with TitleDocument, but safe fallback)
      newContent = content;
    }

    contentRef.current = newContent;
    onNoteUpdate({ title: newTitle, content: newContent });
  }, [htmlToTitle, onNoteUpdate]);


  const editor = useEditor({
    extensions,
    content: getInitialContent(note.title, note.content),
    immediatelyRender: false,
    editable: !note.isProtected,
    enableInputRules: false,
    enablePasteRules: false,
    onUpdate: ({ editor }) => {
      handleSave(editor);
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none min-h-[calc(100vh-150px)]',
      },
      clipboardTextSerializer: (slice, view) => {
        try {
          const schema = view.state.schema;
          const serializer = DOMSerializer.fromSchema(schema);
          const domFragment = serializer.serializeFragment(slice.content);
          const tempDiv = document.createElement('div');
          tempDiv.appendChild(domFragment);
          return richToPlainMarkdown(tempDiv.innerHTML);
        } catch (e) {
          console.error('Failed to serialize clibpoard text to markdown', e);
          return slice.content.textBetween(0, slice.content.size, '\n', '\n');
        }
      },
      handlePaste: (view, event) => {
        const text = event.clipboardData?.getData('text/plain');
        const html = event.clipboardData?.getData('text/html');
        if (html) return false;
        if (!text) return false;

        const markdownPatterns = [
          /^#\s/m, /^-\s/m, /^\*\s/m, /^\d+\.\s/m, /^>\s/m, /^-{3,}/m, /\|.*\|.*\|/m,
        ];

        const hasMarkdown = markdownPatterns.some(pattern => pattern.test(text));

        if (hasMarkdown && !isPlainTextMode) {
          const parsedHtml = plainMarkdownToRich(text.trim());
          const parser = DOMParser.fromSchema(view.state.schema);
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = parsedHtml;
          const slice = parser.parseSlice(tempDiv);
          view.dispatch(view.state.tr.replaceSelection(slice));
          return true;
        }
        return false;
      },
    },
  });

  // Sync editable state
  React.useEffect(() => {
    if (editor) {
      editor.setEditable(!note.isProtected);
    }
  }, [editor, note.isProtected]);

  // Scroll to bottom on mount
  React.useEffect(() => {
    if (scrollContainerRef.current) {
      if (scrollDirection === 'bottom') {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      } else {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  }, [scrollDirection]);

  // Sync external note changes (switching notes)
  const prevNoteIdRef = React.useRef(note.id);
  React.useEffect(() => {
    if (editor && note.id !== prevNoteIdRef.current) {
      // Clear undo history implicitly by setting new content?
      // Tiptap doesn't clear history on setContent unless we use new editor.
      // But we are reusing editor.
      // Ideally we should clear history.
      // editor.commands.clearContent(false); // Can trigger update, be careful.

      const newContent = getInitialContent(note.title, note.content);
      editor.commands.setContent(newContent, false); // emitUpdate: false to avoid saving back immediately?

      // Need to clear history to prevents undoing to previous note
      // Unfortunately Tiptap doesn't expose clean way to clear history on same instance without hacking state 
      // or recreating editor.
      // Recreating editor (by key) might be better if we want clean history.

      contentRef.current = note.content;
      setIsPlainTextMode(false);
      prevNoteIdRef.current = note.id;
    }
  }, [note.id, note.title, note.content, editor, getInitialContent]);

  // NOTE: Simple content sync for same-note external update is complex with Title integration.
  // We skip complex sync logic for now assuming single user.

  if (!editor) {
    return null;
  }

  const handleSetColor = (color: string) => {
    editor.chain().focus().setColor(color).run();
  };

  const handleTogglePlainTextMode = () => {
    // (省略: 基本的に既存ロジックと同じだが、タイトル(H1)の扱いをどうするか？)
    // Plain Text Modeでは構造が崩れる可能性がある。
    // 今回は一旦 Plain Text Mode への切り替え時、「今のHTML」をMarkdownにするので、
    // H1は `# Title` になる。
    // 戻すときに `<h1>` に戻ればOK。
    // plainMarkdownToRich が `# ` を `<h1>` に変換するならOK。
    // utils.ts の実装次第。現状はStarterKit準拠なら `# ` はH1になるはず。

    // ...Existing logic...
    // For simplicity, reusing existing logic (might need refinement for H1 enforcement if plain text mode doesn't respect it)
    if (!editor) return;

    if (isPlainTextMode) {
      const plainHtml = editor.getHTML();
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = plainHtml;
      const lines: string[] = [];
      tempDiv.querySelectorAll('p').forEach(p => {
        const isEmptyP = (p.children.length === 1 && p.children[0].tagName === 'BR') ||
          (p.textContent?.trim() === '' && p.children.length === 0);
        if (isEmptyP) lines.push('');
        else lines.push(p.textContent?.trim() || '');
      });
      const markdownText = lines.join('\n');
      const richContent = plainMarkdownToRich(markdownText);
      // Ensure richContent starts with H1? 
      // If markdown text didn't start with #, richContent won't have H1.
      // TitleDocument will enforce H1, so setContent might fail or auto-fix.
      editor.chain().setContent(richContent, false, { preserveWhitespace: 'full' }).run();
    } else {
      const currentContent = editor.getHTML();
      const plainContent = richToPlainMarkdown(currentContent);
      const lines = plainContent.split('\n').map(p => p.trim());
      while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
      const wrappedContent = lines.map(p => p === '' ? '<p></p>' : `<p>${p}</p>`).join('');
      editor.chain().setContent(wrappedContent, false, { preserveWhitespace: 'full' }).run();
    }
    setIsPlainTextMode(!isPlainTextMode);
    editor.commands.focus();
  };

  const handleRemoveFormatting = () => {
    if (editor) {
      const currentContent = editor.getHTML();
      const plainText = removeFormatting(currentContent);
      // ... same logic ...
      // Need to ensuring H1 is preserved? 
      // removeFormatting returns plain text.
      // Converting back to HTML <p> will lose H1.
      // This function needs update to respect H1.

      // Better: Use Tiptap's unsetAllMarks() and distinct commands instead of brute force removeFormatting utility?
      // Or manually reconstruct H1 for first line.

      const lines = plainText.split('\n').map((p: string) => p.trim());
      while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();

      // Force first line to be H1?
      let newContent = '';
      if (lines.length > 0) {
        newContent += `<h1>${lines[0]}</h1>`;
        newContent += lines.slice(1).map((p: string) => p === '' ? '<p><br></p>' : `<p>${p}</p>`).join('');
      }

      if (newContent !== currentContent) {
        editor.commands.setContent(newContent, true);
        editor.commands.focus();
      }
    }
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        <div className="px-4 border-b flex items-center gap-1 shrink-0 h-[57px]">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="text-2xl w-10 h-10 shrink-0" disabled={note.isProtected}>
                {note.icon || '📝'}
              </Button>
            </PopoverTrigger>
            {!note.isProtected && (
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
            )}
          </Popover>
          <Separator orientation="vertical" className="h-6 mx-2" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo() || note.isProtected}>
                <Undo />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Undo (Ctrl+Z)</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo() || note.isProtected}>
                <Redo />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Redo (Ctrl+Y)</p></TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" className="h-6 mx-2" />
          {/* List buttons ... */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().setHorizontalRule().run()} disabled={note.isProtected}>
                <Minus />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Add Separator</p></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleBulletList().run()} disabled={note.isProtected}>
                <List />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Bullet List</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={editor.isActive('taskList') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleTaskList().run()} disabled={note.isProtected}>
                <ListChecks />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Checkbox List</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleOrderedList().run()} disabled={note.isProtected}>
                <ListOrdered />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Numbered List</p></TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-6 mx-2" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleTogglePlainTextMode}>
                {isPlainTextMode ? (
                  <span className="flex items-center text-xs font-bold">→<FileText className="w-4 h-4 ml-0.5" /></span>
                ) : (
                  <span className="flex items-center text-xs font-bold">→<Type className="w-4 h-4 ml-0.5" /></span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>{isPlainTextMode ? 'To Rich Text' : 'To Plain Text'}</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleRemoveFormatting} disabled={note.isProtected}>
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
                    disabled={note.isProtected}
                    onMouseDown={(e) => { e.preventDefault(); handleSetColor(color.value); }}
                  >
                    <span className="sr-only">{color.name}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>{color.name}</p></TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>

        {!note.isProtected && (
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
        )}

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-4"
        >
          <EditorContent editor={editor} />
        </div>
      </div>
    </TooltipProvider >
  );
};

export default TiptapEditor;
