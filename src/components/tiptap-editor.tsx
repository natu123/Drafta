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
import { Undo, Redo, Bold, Italic, Strikethrough, Pilcrow, List, ListChecks, ListOrdered, Minus, FileText, Type, Copy, Check } from 'lucide-react';
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
  const [isCopied, setIsCopied] = React.useState(false);
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

  // Ref to track plain text mode in callbacks without re-triggering dependency changes
  const isPlainTextModeRef = React.useRef(isPlainTextMode);
  React.useEffect(() => {
    isPlainTextModeRef.current = isPlainTextMode;
  }, [isPlainTextMode]);

  const handleSave = React.useCallback((editorInstance: Editor) => {
    // Extract title (first H1) and content (rest)
    const json = editorInstance.getJSON();
    const content = editorInstance.getHTML();

    let newTitle = '';
    let newContent = '';

    // Logic separation based on View Mode
    if (isPlainTextModeRef.current) {
      // PLAIN TEXT MODE
      // Strategy: Check if first child is H1 (due to Schema Enforcement in handleTogglePlainTextMode)

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;

      const firstChild = tempDiv.firstElementChild;

      // We expect first child to be H1 because we forced it in toggle/schema.
      if (firstChild && firstChild.tagName === 'H1') {
        // In Hybrid Plain Mode, H1 is Rich (HTML), so we use htmlToTitle to extract proper title string with color tags
        newTitle = htmlToTitle(firstChild.innerHTML);
        // Remove H1 from content
        firstChild.remove();
        newContent = tempDiv.innerHTML;
      } else {
        // Fallback logic
        const paragraphs = Array.from(tempDiv.querySelectorAll('p'));
        if (paragraphs.length > 0) {
          // If no H1, try to parse first paragraph? But Schema enforces H1.
          // Fallback to text content
          newTitle = paragraphs[0].textContent || '';
          paragraphs[0].remove();
          newContent = tempDiv.innerHTML;
        } else {
          newContent = content;
        }
      }

    } else {
      // RICH TEXT MODE: Look for H1 Node

      // Check if first node is H1
      if (json.content && json.content.length > 0 && json.content[0].type === 'heading' && json.content[0].attrs?.level === 1) {
        // It's the title. Use DOM parser to get inner HTML of the first node for accurate color extraction
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
          newContent = content;
        }
      } else {
        // No H1 found (safe fallback)
        newContent = content;
      }
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
      const newContent = getInitialContent(note.title, note.content);
      editor.commands.setContent(newContent, false);
      contentRef.current = note.content;
      setIsPlainTextMode(false);
      prevNoteIdRef.current = note.id;
    }
  }, [note.id, note.title, note.content, editor, getInitialContent]);

  if (!editor) {
    return null;
  }

  const handleSetColor = (color: string) => {
    editor.chain().focus().setColor(color).run();
  };

  const handleTogglePlainTextMode = () => {
    if (!editor) return;

    // Calculate next mode
    const nextMode = !isPlainTextMode;

    // CRITICAL: Manually update ref BEFORE setContent triggers synchronous handleSave/onUpdate
    isPlainTextModeRef.current = nextMode;

    if (isPlainTextMode) {
      // Switching: Plain -> Rich
      // Current Content: H1 (Rich HTML) + P (Markdown Text)
      const currentHtml = editor.getHTML();
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = currentHtml;

      const firstChild = tempDiv.firstElementChild;
      let titleHtml = '';
      let bodyMarkdownLines: string[] = [];

      // Extract Rich Title
      if (firstChild && firstChild.tagName === 'H1') {
        titleHtml = firstChild.outerHTML; // Keep H1 tag and innerHTML
        firstChild.remove();
      }

      const { from } = editor.state.selection;

      // Extract Body (Markdown Text)
      Array.from(tempDiv.children).forEach(child => {
        const isEmptyP = child.tagName === 'P' && (
          (child.children.length === 1 && child.children[0].tagName === 'BR') ||
          (child.textContent?.trim() === '' && child.children.length === 0)
        );
        if (isEmptyP) {
          bodyMarkdownLines.push('');
        } else {
          bodyMarkdownLines.push(child.textContent || ''); // Raw markdown text
        }
      });

      const markdownText = bodyMarkdownLines.join('\n'); // No trim to preserve intentional structure
      const richBody = plainMarkdownToRich(markdownText);

      // Combine: Rich Title + Rich Body
      // richBody might contain wrapper div or just HTML string. plainMarkdownToRich returns HTML string.
      const finalContent = titleHtml + richBody;

      editor.chain().setContent(finalContent, false, { preserveWhitespace: 'full' }).setTextSelection(from).run();
    } else {
      // Switching: Rich -> Plain
      // Strategy: Keep Title Rich (H1 HTML), Convert Body to Plain (MD in P)
      const currentHtml = editor.getHTML();
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = currentHtml;

      const firstChild = tempDiv.firstElementChild;
      let titleHtml = '';

      // Extract Title
      if (firstChild && firstChild.tagName === 'H1') {
        titleHtml = firstChild.outerHTML;
        firstChild.remove();
      } else {
        // Force H1 if missing (shouldn't happen with Schema)
        titleHtml = '<h1></h1>';
      }

      // Convert Body (Remaining HTML) to Markdown
      const bodyHtml = tempDiv.innerHTML;
      const plainBody = richToPlainMarkdown(bodyHtml);

      const { from } = editor.state.selection;

      const lines = plainBody.split('\n');
      while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();

      // Wrap Markdown lines in P tags
      const wrappedBody = lines.map(line => {
        return line === '' ? '<p></p>' : `<p>${line}</p>`;
      }).join('');

      const finalContent = titleHtml + (wrappedBody || '<p></p>');

      editor.chain().setContent(finalContent, false, { preserveWhitespace: 'full' }).setTextSelection(from).run();
    }

    setIsPlainTextMode(nextMode);

    // REMOVED: forced focus('start') per user feedback.
    // editor.commands.focus(); 
    // We already set selection in the chain above. Just ensure focus.
    if (!editor.isFocused) {
      editor.commands.focus();
    }

  };

  const handleRemoveFormatting = () => {
    if (editor) {
      const json = editor.getJSON();
      let plainText = '';

      // Traverse JSON to extract text with correct newlines
      // Use \n\n for block separators, \n for hardBreaks
      // IMPORTANT: Handle "empty blocks" (paragraph with only hardBreak) specially
      const traverse = (node: any) => {
        // Check if this is an "empty block" - a paragraph/heading that is visually empty
        // Cases: 1) content is undefined/empty array  2) content is only a hardBreak
        const isEmptyBlock =
          ['paragraph', 'heading'].includes(node.type) &&
          (!node.content ||
            node.content.length === 0 ||
            (node.content.length === 1 && node.content[0].type === 'hardBreak'));

        if (isEmptyBlock) {
          // Add only block separator, don't process content to avoid extra \n
          plainText += '\n\n';
          return;
        }

        // Normal processing
        if (node.type === 'text') {
          plainText += node.text;
        } else if (node.type === 'hardBreak') {
          plainText += '\n';
        } else if (node.content) {
          node.content.forEach((child: any) => traverse(child));
        }

        // Block separator: Use \n\n to distinguish blocks from inline breaks
        if (['paragraph', 'heading', 'bulletList', 'orderedList', 'listItem', 'taskItem'].includes(node.type)) {
          plainText += '\n\n';
        }
      };

      if (json.content) {
        json.content.forEach((node: any) => traverse(node));
      }

      // Strip color markdown
      plainText = plainText.replace(/\{color:(#[0-9A-Fa-f]{3,6})\}(.+?)\{\/color\}/gi, '$2');

      // Split by block separator (\n\n)
      const blocks = plainText.split('\n\n');

      // Clean up trailing empty blocks
      while (blocks.length > 0 && blocks[blocks.length - 1].trim() === '') blocks.pop();

      // Rebuild: H1 + Ps
      let newContent = '';
      if (blocks.length > 0) {
        // First block is Title (replace any internal \n with space)
        newContent += `<h1>${blocks[0].replace(/\n/g, ' ')}</h1>`;

        const bodyBlocks = blocks.slice(1);

        if (bodyBlocks.length === 0) {
          newContent += '<p></p>';
        } else {
          newContent += bodyBlocks.map(block => {
            // Empty block = empty paragraph (check exact empty string, not trimmed)
            if (block === '') return '<p></p>';
            // Internal \n = <br> (preserve line breaks within paragraph)
            return `<p>${block.replace(/\n/g, '<br>')}</p>`;
          }).join('');
        }
      } else {
        newContent = '<h1></h1><p></p>';
      }

      const currentContent = editor.getHTML();
      if (newContent !== currentContent) {
        editor.commands.setContent(newContent, true);
        editor.commands.focus();
      }
    }
  };

  const handleCopyNote = async () => {
    if (!editor) return;
    // Get full text including title
    const text = editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n');
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 800);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 800);
    }
  };

  return (
    <TooltipProvider>
      {/* ADDED: plain-mode class for CSS targeting */}
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
            {/* Logic unchanged */}
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleCopyNote}>
                {isCopied ? <Check className="text-green-500" /> : <Copy />}
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Copy Note</p></TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" className="h-6 mx-2" />
          <div className="flex gap-1 ml-1">
            {colors.map(color => (
              <Tooltip key={color.name}>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className={cn(
                      "w-6 h-6 rounded-full p-0 transition-opacity",
                      editor.isActive('textStyle', { color: color.value }) && "ring-2 ring-primary ring-offset-2"
                    )}
                    style={{ backgroundColor: color.value }}
                    disabled={note.isProtected || isPlainTextMode}
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
          className="flex-1 overflow-y-auto px-4 cursor-text"
          onMouseDown={(e) => {
            // Handle click-to-focus for the container background and editor empty area
            // For clicks on actual content nodes (p, h1, etc.), let ProseMirror handle natively
            if (editor && !note.isProtected) {
              const target = e.target as HTMLElement;
              // Intercept clicks on ScrollContainer (padding) or ProseMirror div (empty area below content)
              // Actual content nodes (p, h1, li, etc.) won't match — ProseMirror handles those
              if (target === e.currentTarget || target.classList.contains('ProseMirror')) {
                e.preventDefault();
                editor.commands.focus('end');
              }
            }
          }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>
    </TooltipProvider >
  );
};

export default TiptapEditor;
