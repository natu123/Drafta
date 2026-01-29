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
import { CustomListItem } from './tiptap-extensions/custom-list-item';
import { PreserveBody } from './tiptap-extensions/preserve-body';

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
  { name: 'Gold', value: '#C49547' },
];

const extensions = [
  TitleDocument, // Custom Document Extension enforcing H1 at start
  PreserveBody, // Prevent deletion of last paragraph in body
  StarterKit.configure({
    document: false, // Disable default document
    heading: {
      levels: [1, 2, 3],
    },
    codeBlock: false, // Disable default codeBlock to use lowlight
    listItem: false, // Disable default listItem to use CustomListItem with value attribute
  }),
  CustomListItem,
  CodeBlockLowlight.configure({
    lowlight,
    defaultLanguage: 'plaintext',
  }),
  Placeholder.configure({
    placeholder: ({ node }) => {
      if (node.type.name === 'heading' && node.attrs.level === 1) {
        return 'Untitled Memo';
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
    onUpdate: ({ editor, transaction }) => {
      // Auto-renumber ordered list items after any change
      if (editor.isActive('orderedList')) {
        // Use setTimeout to avoid dispatch during update and create fresh transaction
        setTimeout(() => {
          const { state, view } = editor;
          const { selection } = state;
          const { $from } = selection;

          // Find the ordered list containing the cursor
          let orderedListDepth = -1;
          for (let d = $from.depth; d > 0; d--) {
            if ($from.node(d).type.name === 'orderedList') {
              orderedListDepth = d;
              break;
            }
          }

          if (orderedListDepth > 0) {
            const orderedListPos = $from.before(orderedListDepth);
            const orderedListNode = $from.node(orderedListDepth);

            // Create a fresh transaction
            const tr = state.tr;
            let runningValue = 1;
            let needsUpdate = false;

            orderedListNode.forEach((child, offset, index) => {
              const childPos = orderedListPos + 1 + offset;
              if (index === 0) {
                runningValue = child.attrs.value !== null ? child.attrs.value : 1;
              } else {
                runningValue++;
                if (child.attrs.value !== runningValue) {
                  tr.setNodeMarkup(childPos, undefined, {
                    ...child.attrs,
                    value: runningValue
                  });
                  needsUpdate = true;
                }
              }
            });

            if (needsUpdate && tr.docChanged) {
              view.dispatch(tr);
            }
          }
        }, 0);
      }
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

        // In Plain mode: always paste as plain text only (ignore HTML formatting)
        if (isPlainTextModeRef.current) {
          if (!text) return false;
          // Insert plain text directly
          view.dispatch(view.state.tr.insertText(text));
          return true;
        }

        // Rich mode: if HTML exists, let TipTap handle it
        if (html) return false;
        if (!text) return false;

        const markdownPatterns = [
          /^#\s/m, /^-\s/m, /^\*\s/m, /^\d+\.\s/m, /^>\s/m, /^-{3,}/m, /\|.*\|.*\|/m,
        ];

        const hasMarkdown = markdownPatterns.some(pattern => pattern.test(text));

        if (hasMarkdown) {
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

  // Check if document has any ordered list items
  const hasOrderedList = React.useCallback(() => {
    if (!editor) return false;
    let found = false;
    editor.state.doc.descendants(node => {
      if (node.type.name === 'orderedList') {
        found = true;
        return false; // Stop traversing
      }
    });
    return found;
  }, [editor]);

  // Get the last ordered list item's value BEFORE the cursor position
  const getLastOrderedListValue = React.useCallback(() => {
    if (!editor) return 0;

    const { selection } = editor.state;
    const cursorPos = selection.$from.pos;
    let lastValue = 0;

    // Find the last listItem with a value that ends before cursor position
    editor.state.doc.descendants((node, pos) => {
      // Only consider listItems that end before the cursor
      const nodeEnd = pos + node.nodeSize;
      if (nodeEnd <= cursorPos && node.type.name === 'listItem' && node.attrs.value) {
        lastValue = node.attrs.value;
      }
    });

    return lastValue;
  }, [editor]);

  // Insert ordered list with specific starting value
  const insertOrderedListWithValue = React.useCallback((startValue: number) => {
    if (!editor) return;

    const isCurrentlyOL = editor.isActive('orderedList');
    const isCurrentlyUL = editor.isActive('bulletList');

    // If currently a bullet list, first convert to ordered list
    if (isCurrentlyUL) {
      editor.chain().focus().toggleBulletList().toggleOrderedList().run();
    } else if (!isCurrentlyOL) {
      // If not in any list, create an ordered list
      editor.chain().focus().toggleOrderedList().run();
    }
    // If already OL, just update the values (don't toggle off)

    // Update list items with sequential values starting from startValue
    // Only update items in the list that contains the cursor
    setTimeout(() => {
      const { state, view } = editor;
      const { tr, selection } = state;
      const { $from } = selection;

      // Find the ordered list containing the cursor
      let orderedListPos = -1;
      let orderedListNode = null;

      for (let d = $from.depth; d > 0; d--) {
        const node = $from.node(d);
        if (node.type.name === 'orderedList') {
          orderedListPos = $from.before(d);
          orderedListNode = node;
          break;
        }
      }

      if (orderedListNode && orderedListPos >= 0) {
        let itemIndex = 0;
        orderedListNode.forEach((child, offset) => {
          const childPos = orderedListPos + 1 + offset;
          const newValue = startValue + itemIndex;
          if (child.attrs.value !== newValue) {
            tr.setNodeMarkup(childPos, undefined, {
              ...child.attrs,
              value: newValue
            });
          }
          itemIndex++;
        });

        if (tr.docChanged) {
          view.dispatch(tr);
        }
      }
    }, 0);
  }, [editor]);

  // Remove ordered list and decrement subsequent list items
  const removeOrderedListAndRenumber = React.useCallback(() => {
    if (!editor) return;

    const { state } = editor;
    const { selection } = state;
    const { $from } = selection;

    // Find the current ordered list and get the value of items being removed
    let currentListStartValue = 1;
    let currentListItemCount = 0;

    for (let d = $from.depth; d > 0; d--) {
      const node = $from.node(d);
      if (node.type.name === 'orderedList') {
        node.forEach((child) => {
          if (currentListItemCount === 0 && child.attrs.value) {
            currentListStartValue = child.attrs.value;
          }
          currentListItemCount++;
        });
        break;
      }
    }

    // Calculate the end value of the list being removed
    const currentListEndValue = currentListStartValue + currentListItemCount - 1;

    // Toggle off the ordered list (convert to paragraphs)
    editor.chain().focus().toggleOrderedList().run();

    // After toggling, decrement all subsequent list items by the count of removed items
    setTimeout(() => {
      const { state: newState, view } = editor;
      const { doc } = newState;
      const tr = newState.tr;
      let needsUpdate = false;

      // Find all listItems with values GREATER than the removed list's end value
      doc.descendants((node, pos) => {
        if (node.type.name === 'listItem' && node.attrs.value) {
          // Only decrement items that had values > currentListEndValue (truly subsequent)
          if (node.attrs.value > currentListEndValue) {
            const newValue = node.attrs.value - currentListItemCount;
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              value: newValue
            });
            needsUpdate = true;
          }
        }
      });

      if (needsUpdate && tr.docChanged) {
        view.dispatch(tr);
      }
    }, 0);
  }, [editor]);

  if (!editor) {
    return null;
  }

  const handleSetColor = (color: string) => {
    // Black (#000000) is the default color - remove color formatting instead of setting it
    if (color.toLowerCase() === '#000000') {
      editor.chain().focus().unsetColor().run();
    } else {
      editor.chain().focus().setColor(color).run();
    }
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
      // OL syntax is now {ol:N}text{/ol} format (no HTML tags), so no escaping needed
      const wrappedBody = lines.map(line => {
        if (line === '') return '<p></p>';
        return `<p>${line}</p>`;
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
      const blocks: string[] = [];

      // Extract text blocks from JSON
      // Each top-level block becomes one entry in blocks array
      const extractText = (node: any): string => {
        if (node.type === 'text') {
          return node.text || '';
        } else if (node.type === 'hardBreak') {
          return '\n';
        } else if (node.content) {
          return node.content.map((child: any) => extractText(child)).join('');
        }
        return '';
      };

      const processTopLevel = (node: any) => {
        // Check if this is an "empty block"
        const isEmptyBlock =
          ['paragraph', 'heading'].includes(node.type) &&
          (!node.content ||
            node.content.length === 0 ||
            (node.content.length === 1 && node.content[0].type === 'hardBreak'));

        if (isEmptyBlock) {
          blocks.push('');
          return;
        }

        // Handle lists: extract each listItem's text as separate block
        if (node.type === 'bulletList' || node.type === 'orderedList' || node.type === 'taskList') {
          if (node.content) {
            node.content.forEach((listItem: any) => {
              const text = extractText(listItem).trim();
              if (text) blocks.push(text);
            });
          }
          return;
        }

        // Regular block (paragraph, heading, etc.)
        const text = extractText(node);
        blocks.push(text);
      };

      if (json.content) {
        json.content.forEach((node: any) => processTopLevel(node));
      }

      // Strip color markdown from all blocks
      const cleanBlocks = blocks.map(block =>
        block.replace(/\{color:(#[0-9A-Fa-f]{3,6})\}(.+?)\{\/color\}/gi, '$2')
      );

      // Clean up trailing empty blocks
      while (cleanBlocks.length > 0 && cleanBlocks[cleanBlocks.length - 1].trim() === '') {
        cleanBlocks.pop();
      }

      // Rebuild: H1 + Ps
      let newContent = '';
      if (cleanBlocks.length > 0) {
        // First block is Title (replace any internal \n with space)
        newContent += `<h1>${cleanBlocks[0].replace(/\n/g, ' ')}</h1>`;

        const bodyBlocks = cleanBlocks.slice(1);

        if (bodyBlocks.length === 0) {
          newContent += '<p></p>';
        } else {
          newContent += bodyBlocks.map(block => {
            // Empty block = empty paragraph
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
              <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().setHorizontalRule().run()} disabled={note.isProtected || isPlainTextMode}>
                <Minus />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Add Separator</p></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleBulletList().run()} disabled={note.isProtected || isPlainTextMode}>
                <List />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Bullet List</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={editor.isActive('taskList') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleTaskList().run()} disabled={note.isProtected || isPlainTextMode}>
                <ListChecks />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Checkbox List</p></TooltipContent>
          </Tooltip>
          {/* Ordered List:
              - On OL: toggle off immediately (like Bullet/Checkbox)
              - Not on OL but OL exists: show popover
              - No OL exists: create new OL starting at 1
          */}
          {editor.isActive('orderedList') ? (
            // Currently in OL: click to toggle off
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="secondary" size="icon" onClick={removeOrderedListAndRenumber} disabled={note.isProtected || isPlainTextMode}>
                  <ListOrdered />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Numbered List</p></TooltipContent>
            </Tooltip>
          ) : hasOrderedList() ? (
            // Not in OL but OL exists: show popover
            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={note.isProtected || isPlainTextMode}>
                      <ListOrdered />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent><p>Numbered List</p></TooltipContent>
              </Tooltip>
              <PopoverContent className="w-auto p-2" align="start">
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start"
                    onClick={() => {
                      const nextValue = getLastOrderedListValue() + 1;
                      insertOrderedListWithValue(nextValue);
                    }}
                  >
                    Continue numbering
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start"
                    onClick={() => insertOrderedListWithValue(1)}
                  >
                    Start new list
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            // No OL exists: create new OL starting at 1
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => insertOrderedListWithValue(1)} disabled={note.isProtected || isPlainTextMode}>
                  <ListOrdered />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Numbered List</p></TooltipContent>
            </Tooltip>
          )}

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
            <TooltipContent><p>Copy Memo</p></TooltipContent>
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
