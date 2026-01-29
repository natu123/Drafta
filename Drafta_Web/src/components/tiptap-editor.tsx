"use client";

import { DOMSerializer, DOMParser } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';

import * as React from 'react';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { all, createLowlight } from 'lowlight';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
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
import { Title } from './tiptap-extensions/title-node';
import { CustomListItem } from './tiptap-extensions/custom-list-item';
import { CustomOrderedList } from './tiptap-extensions/custom-ordered-list';
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
  TitleDocument, // Custom Document schema: title block+
  Title, // Dedicated title node (separate from heading)
  PreserveBody, // Prevent deletion of last paragraph in body
  StarterKit.configure({
    document: false, // Disable default document (using TitleDocument)
    heading: {
      levels: [1, 2, 3], // Body headings (H1-H3)
    },
    codeBlock: false, // Disable default codeBlock to use lowlight
    listItem: false, // Disable default listItem to use CustomListItem with value attribute
    orderedList: false, // Disable default orderedList to use CustomOrderedList with newList attribute
  }),
  CustomListItem,
  CustomOrderedList,
  CodeBlockLowlight.configure({
    lowlight,
    defaultLanguage: 'plaintext',
  }),
  Placeholder.configure({
    placeholder: ({ node }) => {
      // Title node のみプレースホルダーを表示
      if (node.type.name === 'title') {
        return 'Untitled Memo';
      }
      // 本文（paragraph, heading等）にはプレースホルダーなし
      return '';
    },
    showOnlyCurrent: false, // 常に表示（フォーカス関係なし）
    includeChildren: false, // 子ノードには適用しない
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
      // RICH TEXT MODE: Look for Title Node

      // Check if first node is 'title' (custom node) or 'heading' with level 1 (fallback)
      const firstNode = json.content?.[0];
      const isTitle = firstNode?.type === 'title' ||
        (firstNode?.type === 'heading' && firstNode?.attrs?.level === 1);

      if (isTitle) {
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
        // No title found (safe fallback)
        newContent = content;
      }
    }

    contentRef.current = newContent;
    onNoteUpdate({ title: newTitle, content: newContent });
  }, [htmlToTitle, onNoteUpdate]);


  // Renumber ordered list items with smart grouping
  // 選択肢2: 全リストを毎回再計算
  // - startFrom=1 のリストは「新しいリストグループ」（1から開始）
  // - startFrom!=1 のリストは「続きのリスト」（前のリストから連番）
  // - 毎回全てのリストを走査して、続きのリストの startFrom を再計算
  const renumberAllOrderedLists = React.useCallback((editorInstance: Editor) => {
    const { state, view } = editorInstance;
    const { doc } = state;
    const tr = state.tr;
    let needsUpdate = false;
    let runningNumber = 0; // 前のリストグループからの連番

    // まず全ての orderedList の位置と情報を収集
    const lists: { pos: number; node: any }[] = [];
    doc.descendants((node, pos) => {
      if (node.type.name === 'orderedList') {
        lists.push({ pos, node });
      }
    });

    // 各リストの startFrom を計算・更新
    for (const { pos, node } of lists) {
      const currentStartFrom = node.attrs.startFrom ?? 1;
      let effectiveStartFrom: number;

      if (currentStartFrom === 1) {
        // 新しいリストグループ: 1から開始
        effectiveStartFrom = 1;
        runningNumber = 1 + node.childCount;
      } else {
        // 続きのリスト: 前のリストからの連番
        effectiveStartFrom = runningNumber;
        // startFrom が期待値と違えば更新
        if (currentStartFrom !== effectiveStartFrom) {
          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            startFrom: effectiveStartFrom
          });
          needsUpdate = true;
        }
        runningNumber = effectiveStartFrom + node.childCount;
      }

      // リスト内のアイテムに番号を振る
      let itemIndex = 0;
      node.forEach((itemNode: any, offset: number) => {
        if (itemNode.type.name === 'listItem') {
          const newValue = effectiveStartFrom + itemIndex;
          const itemPos = pos + 1 + offset;

          if (itemNode.attrs.value !== newValue) {
            tr.setNodeMarkup(itemPos, undefined, {
              ...itemNode.attrs,
              value: newValue
            });
            needsUpdate = true;
          }
          itemIndex++;
        }
      });
    }

    if (needsUpdate && tr.docChanged) {
      view.dispatch(tr);
    }
  }, []);

  const editor = useEditor({
    extensions,
    content: getInitialContent(note.title, note.content),
    immediatelyRender: false,
    editable: !note.isProtected,
    enableInputRules: false,
    enablePasteRules: false,
    onUpdate: ({ editor, transaction }) => {
      // Auto-renumber all ordered list items after any change
      // Use setTimeout to avoid dispatch during update
      setTimeout(() => {
        renumberAllOrderedLists(editor);
      }, 0);
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
      editor.commands.setContent(newContent, { emitUpdate: false });
      contentRef.current = note.content;
      setIsPlainTextMode(false);
      prevNoteIdRef.current = note.id;
    }
  }, [note.id, note.title, note.content, editor, getInitialContent]);

  // Insert NEW ordered list (startFrom=1 で新規リスト)
  // toggleOrderedList は隣接リストをマージするので、直接ノードを操作
  const insertOrderedList = React.useCallback(() => {
    if (!editor) return;

    const isCurrentlyOL = editor.isActive('orderedList');
    const isCurrentlyUL = editor.isActive('bulletList');

    if (isCurrentlyUL) {
      editor.chain().focus().toggleBulletList().run();
    }

    if (!isCurrentlyOL) {
      // 現在の段落の内容を取得
      const { state } = editor;
      const { selection, schema } = state;
      const { $from } = selection;

      // 現在のノード（段落）のテキストを取得
      const currentNode = $from.parent;
      const text = currentNode.textContent;

      // 新しい orderedList を作成（startFrom=1）
      const listItem = schema.nodes.listItem.create(
        { value: 1 },
        schema.nodes.paragraph.create(null, text ? schema.text(text) : null)
      );
      const orderedList = schema.nodes.orderedList.create(
        { startFrom: 1 },
        listItem
      );

      // 現在の段落を orderedList で置き換え
      const tr = state.tr;
      const start = $from.before($from.depth);
      const end = $from.after($from.depth);
      tr.replaceWith(start, end, orderedList);

      // カーソルを新しいリストアイテムの末尾に移動
      const newPos = start + 3 + text.length; // orderedList + listItem + paragraph の開始位置 + テキスト長
      tr.setSelection(TextSelection.near(tr.doc.resolve(newPos)));

      editor.view.dispatch(tr);
    }
  }, [editor]);

  // Continue ordered list - 前のリストの続きの番号で開始
  // 作成時に前のリストを検索し、startFrom を計算して固定
  const continueOrderedList = React.useCallback(() => {
    if (!editor) return;

    const isCurrentlyOL = editor.isActive('orderedList');
    const isCurrentlyUL = editor.isActive('bulletList');

    if (isCurrentlyUL) {
      editor.chain().focus().toggleBulletList().run();
    }

    if (!isCurrentlyOL) {
      const { state } = editor;
      const { selection, schema, doc } = state;
      const { $from } = selection;
      const cursorPos = selection.from;

      // 前のリストを検索して、続きの番号を計算
      let calculatedStartFrom = 1;
      doc.descendants((node, pos) => {
        if (node.type.name === 'orderedList' && pos < cursorPos) {
          const listStartFrom = node.attrs.startFrom ?? 1;
          const itemCount = node.childCount;
          // このリストの最後の番号 + 1 が次の開始番号
          calculatedStartFrom = listStartFrom + itemCount;
        }
      });

      // 現在のノード（段落）のテキストを取得
      const currentNode = $from.parent;
      const text = currentNode.textContent;

      // 新しい orderedList を作成（計算した startFrom で）
      const listItem = schema.nodes.listItem.create(
        { value: calculatedStartFrom },
        schema.nodes.paragraph.create(null, text ? schema.text(text) : null)
      );
      const orderedList = schema.nodes.orderedList.create(
        { startFrom: calculatedStartFrom },
        listItem
      );

      // 現在の段落を orderedList で置き換え
      const tr = state.tr;
      const start = $from.before($from.depth);
      const end = $from.after($from.depth);
      tr.replaceWith(start, end, orderedList);

      // カーソルを新しいリストアイテムの末尾に移動
      const newPos = start + 3 + text.length;
      tr.setSelection(TextSelection.near(tr.doc.resolve(newPos)));

      editor.view.dispatch(tr);
    }
  }, [editor]);

  // Check if there's any orderedList before the current cursor position
  const hasOrderedListBefore = React.useCallback((): boolean => {
    if (!editor) return false;

    const { state } = editor;
    const { doc, selection } = state;
    const cursorPos = selection.from;
    let found = false;

    doc.descendants((node, pos) => {
      if (found) return false; // Stop traversing
      if (node.type.name === 'orderedList' && pos < cursorPos) {
        found = true;
        return false;
      }
    });

    return found;
  }, [editor]);

  // Remove ordered list (convert to paragraphs)
  // Renumbering is automatically handled by onUpdate -> renumberAllOrderedLists
  const removeOrderedList = React.useCallback(() => {
    if (!editor) return;
    editor.chain().focus().toggleOrderedList().run();
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
        titleHtml = firstChild.outerHTML;
        firstChild.remove();
      }

      const { from } = editor.state.selection;

      // Extract Body (Markdown Text) - Plain mode body is P tags only
      Array.from(tempDiv.children).forEach((child) => {
        if (child.tagName !== 'P') return;

        const isEmptyP = (child.children.length === 1 && child.children[0].tagName === 'BR') ||
          (child.textContent?.trim() === '' && child.children.length === 0);
        if (isEmptyP) {
          bodyMarkdownLines.push('');
        } else {
          bodyMarkdownLines.push(child.textContent || '');
        }
      });

      const markdownText = bodyMarkdownLines.join('\n');
      const richBody = plainMarkdownToRich(markdownText);
      const finalContent = titleHtml + richBody;

      editor.chain().setContent(finalContent, { emitUpdate: false, parseOptions: { preserveWhitespace: 'full' } }).setTextSelection(from).run();
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
        if (line === '') return '<p></p>';
        return `<p>${line}</p>`;
      }).join('');

      const finalContent = titleHtml + (wrappedBody || '<p></p>');

      editor.chain().setContent(finalContent, { emitUpdate: false, parseOptions: { preserveWhitespace: 'full' } }).setTextSelection(from).run();
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
        editor.commands.setContent(newContent);
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
          {/* Ordered List: 前にリストがあればPopover、なければ直接作成 */}
          {editor.isActive('orderedList') ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={removeOrderedList}
                  disabled={note.isProtected || isPlainTextMode}
                >
                  <ListOrdered />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Remove Numbered List</p></TooltipContent>
            </Tooltip>
          ) : hasOrderedListBefore() ? (
            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={note.isProtected || isPlainTextMode}
                    >
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
                    className="justify-start text-sm"
                    onClick={() => {
                      insertOrderedList();
                    }}
                  >
                    1. 新しいリスト
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start text-sm"
                    onClick={() => {
                      continueOrderedList();
                    }}
                  >
                    N. 続きの番号
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={insertOrderedList}
                  disabled={note.isProtected || isPlainTextMode}
                >
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
          <BubbleMenu editor={editor} options={{ placement: 'top', offset: 8 }} className="bg-background border rounded-md shadow-lg p-1 flex gap-1">
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
