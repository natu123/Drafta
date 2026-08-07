"use client";

import { DOMSerializer, DOMParser, Node as ProseMirrorNode } from '@tiptap/pm/model';
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
import { cn, removeFormatting, richToPlainMarkdown, plainMarkdownToRich, normalizeOrderedListTags, normalizeOrderedListHtml } from '@/lib/utils';
import { Separator } from './ui/separator';
import type { Note } from '@/lib/types';
import { TitleDocument } from './tiptap-extensions/title-document';
import { Title } from './tiptap-extensions/title-node';
import { CustomListItem } from './tiptap-extensions/custom-list-item';
import { CustomOrderedList } from './tiptap-extensions/custom-ordered-list';
import { PreserveBody } from './tiptap-extensions/preserve-body';
import { useTheme } from 'next-themes';
import { useLang } from '@/contexts/lang-context';

// Create lowlight instance with all languages to ensure markdown support
const lowlight = createLowlight(all);

interface TiptapEditorProps {
  note: Note;
  onNoteUpdate: (updatedNote: Partial<Note>) => void;
  onIconChange: (icon: string) => void;
  scrollDirection?: 'top' | 'bottom';
  navigationAction?: React.ReactNode;
}

export const emojis = ['📝', '⚡', '🔥', '💎', '⭐️', '🛒', '💼', '💡', '🎯', '📌', '❤️', '🎉', '✈️', '🌱', '🌈'];
const baseColors = [
  { name: 'Green', value: '#64A364' },
  { name: 'Blue', value: '#51A2FF' },
  { name: 'Purple', value: '#AD46FF' },
  { name: 'Rose', value: '#E7A1B0' },
  { name: 'Gold', value: '#C49547' },
  { name: 'Grey', value: '#9CA3AF' },
];
// Black for light mode, White for dark mode (both unset color when clicked)
const lightModeDefaultColor = { name: 'Black', value: '#000000' };
const darkModeDefaultColor = { name: 'White', value: '#FFFFFF' };

const staticExtensions = [
  TitleDocument,
  Title,
  PreserveBody,
  StarterKit.configure({
    document: false,
    heading: { levels: [1, 2, 3] },
    codeBlock: false,
    listItem: false,
    orderedList: false,
  }),
  CustomListItem,
  CustomOrderedList,
  CodeBlockLowlight.configure({
    lowlight,
    defaultLanguage: 'plaintext',
  }),
  TextStyle,
  Color.configure({ types: ['textStyle'] }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Table.configure({ resizable: true }),
  TableRow,
  TableCell,
  TableHeader,
];

const TiptapEditor: React.FC<TiptapEditorProps> = ({ note, onNoteUpdate, onIconChange, scrollDirection = 'bottom', navigationAction }) => {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';
  const { t } = useLang();

  // Build colors array with theme-appropriate default color
  const colors = React.useMemo(() => {
    const defaultColor = isDarkMode ? darkModeDefaultColor : lightModeDefaultColor;
    return [defaultColor, ...baseColors];
  }, [isDarkMode]);

  // Dynamic extensions including translated Placeholder
  const extensions = React.useMemo(() => [
    ...staticExtensions,
    Placeholder.configure({
      placeholder: ({ node }) => {
        if (node.type.name === 'title') return t.untitledMemo;
        return '';
      },
      showOnlyCurrent: false,
      includeChildren: false,
    }),
  ], [t.untitledMemo]);

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

  // Plain view body extraction:
  // - Normal case: body is paragraph-only, so preserve each line exactly as typed.
  // - Fallback: if non-paragraph blocks exist (e.g. accidental rich paste), convert safely via richToPlainMarkdown.
  const extractMarkdownFromPlainBody = React.useCallback((bodyContainer: HTMLElement): string => {
    const children = Array.from(bodyContainer.children);

    if (children.length === 0) {
      return bodyContainer.textContent || '';
    }

    const hasNonParagraphChild = children.some((child) => child.tagName !== 'P');
    if (hasNonParagraphChild) {
      return richToPlainMarkdown(bodyContainer.innerHTML);
    }

    const lines: string[] = [];
    children.forEach((child) => {
      if (child.tagName !== 'P') return;

      const isEmptyP =
        (child.children.length === 1 && child.children[0].tagName === 'BR') ||
        (child.textContent === '' && child.children.length === 0);

      if (isEmptyP) {
        lines.push('');
      } else {
        lines.push(child.textContent || '');
      }
    });

    return lines.join('\n');
  }, []);

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
      // Body is Markdown text wrapped in <p> tags - convert to Rich HTML for storage

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;

      const firstChild = tempDiv.firstElementChild;

      // We expect first child to be H1 because we forced it in toggle/schema.
      if (firstChild && firstChild.tagName === 'H1') {
        // In Hybrid Plain Mode, H1 is Rich (HTML), so we use htmlToTitle to extract proper title string with color tags
        newTitle = htmlToTitle(firstChild.innerHTML);
        // Remove H1 from content
        firstChild.remove();

        // Convert Plain view body to markdown robustly.
        const markdownText = extractMarkdownFromPlainBody(tempDiv);
        newContent = plainMarkdownToRich(markdownText);
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
  }, [extractMarkdownFromPlainBody, htmlToTitle, onNoteUpdate]);


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
    const lists: { pos: number; node: ProseMirrorNode }[] = [];
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
      node.forEach((itemNode: ProseMirrorNode, offset: number) => {
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
    // Keep styling deterministic across dev/prod by using only app-managed CSS.
    injectCSS: false,
    extensions,
    content: getInitialContent(note.title, note.content),
    immediatelyRender: false,
    editable: !note.isProtected,
    enableInputRules: false,
    enablePasteRules: false,
    onUpdate: ({ editor }) => {
      // Auto-renumber all ordered list items after any change
      // Use setTimeout to avoid dispatch during update
      setTimeout(() => {
        renumberAllOrderedLists(editor);
      }, 0);
      handleSave(editor);
    },
    editorProps: {
      attributes: {
        class: 'drafta-editor max-w-none focus:outline-none min-h-[calc(100vh-150px)]',
      },
      clipboardTextSerializer: (slice, view) => {
        try {
          const schema = view.state.schema;
          const serializer = DOMSerializer.fromSchema(schema);
          const domFragment = serializer.serializeFragment(slice.content);
          const tempDiv = document.createElement('div');
          tempDiv.appendChild(domFragment);
          const normalizedHtml = normalizeOrderedListHtml(tempDiv.innerHTML);
          return normalizeOrderedListTags(richToPlainMarkdown(normalizedHtml));
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
          const plainText = text || (html ? removeFormatting(html) : '');
          if (!plainText) return true;
          // Always insert plain text, even for HTML-only clipboards.
          view.dispatch(view.state.tr.insertText(plainText));
          return true;
        }

        // Rich mode: Check for Markdown patterns first (even if HTML exists)
        // This ensures Drafta-copied content pastes as Markdown for consistency
        if (text) {
          const markdownPatterns = [
            /^#\s/m, /^-\s/m, /^\*\s/m, /^\d+\.\s/m, /^>\s/m, /^-{3,}/m, /\|.*\|.*\|/m,
          ];

          const hasMarkdown = markdownPatterns.some(pattern => pattern.test(text));

          if (hasMarkdown) {
            const parsedHtml = plainMarkdownToRich(text.trim());
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = parsedHtml;
            // Mark all H1s with data-paste to prevent them from being parsed as title node
            tempDiv.querySelectorAll('h1').forEach(h1 => {
              h1.setAttribute('data-paste', 'true');
            });
            const parser = DOMParser.fromSchema(view.state.schema);
            const slice = parser.parseSlice(tempDiv);
            view.dispatch(view.state.tr.replaceSelection(slice));
            return true;
          }
        }

        // Rich mode: if HTML exists and no Markdown detected, let TipTap handle it
        if (html) return false;
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

  // Scroll based on scrollDirection (on mount and note switch)
  React.useEffect(() => {
    // Use setTimeout to ensure content is rendered
    setTimeout(() => {
      if (scrollContainerRef.current) {
        if (scrollDirection === 'bottom') {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        } else {
          scrollContainerRef.current.scrollTop = 0;
        }
      }
    }, 50);
  }, [scrollDirection, note.id]);

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
    // Black (#000000) and White (#FFFFFF) are default colors - remove color formatting instead of setting it
    // This allows the text to use the theme's default foreground color
    const lowerColor = color.toLowerCase();
    if (lowerColor === '#000000' || lowerColor === '#ffffff') {
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

    const escapeHtml = (value: string): string => {
      return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    };

    const preserveSpacesForHtml = (value: string): string => {
      const escaped = escapeHtml(value).replace(/\t/g, '    ');
      return escaped
        .split('\n')
        .map((line) => {
          let converted = line.replace(/^ +/g, (leading) => '&nbsp;'.repeat(leading.length));
          converted = converted.replace(/ {2,}/g, (spaces) => ` ${'&nbsp;'.repeat(spaces.length - 1)}`);
          return converted;
        })
        .join('\n');
    };

    const currentHtml = editor.getHTML();

    try {
      if (isPlainTextMode) {
      // Switching: Plain -> Rich
      // Current Content: H1 (Rich HTML) + P (Markdown Text)
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = currentHtml;

      const firstChild = tempDiv.firstElementChild;
      let titleHtml = '';

      // Extract Rich Title
      if (firstChild && firstChild.tagName === 'H1') {
        titleHtml = firstChild.outerHTML;
        firstChild.remove();
      }

      // Convert Plain view body to markdown robustly (supports accidental rich blocks).
      const markdownText = extractMarkdownFromPlainBody(tempDiv);
      const richBody = plainMarkdownToRich(markdownText);
      const finalContent = titleHtml + (richBody || '<p></p>');

      editor.commands.setContent(finalContent, { emitUpdate: false, parseOptions: { preserveWhitespace: 'full' } });
    } else {
      // Switching: Rich -> Plain
      // Strategy: Keep Title Rich (H1 HTML), Convert Body to Plain (MD in P)
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

      const lines = plainBody.split('\n');
      while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();

      // Wrap Markdown lines in P tags
      const wrappedBody = lines.map(line => {
        if (line === '') return '<p></p>';
        return `<p>${preserveSpacesForHtml(line)}</p>`;
      }).join('');

      const finalContent = titleHtml + (wrappedBody || '<p></p>');

      editor.commands.setContent(finalContent, { emitUpdate: false, parseOptions: { preserveWhitespace: 'full' } });
    }
    } catch (error) {
      console.error('Failed to toggle plain text mode safely:', error);
      editor.commands.setContent(currentHtml, { emitUpdate: false, parseOptions: { preserveWhitespace: 'full' } });
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
    if (!editor) return;
    const currentContent = editor.getHTML();
    const isCurrentlyPlainMode = isPlainTextMode;

    const escapeHtml = (value: string): string => {
      return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    };

    const preserveSpacesForHtml = (value: string): string => {
      const escaped = escapeHtml(value).replace(/\t/g, '    ');
      return escaped
        .split('\n')
        .map((line) => {
          let converted = line.replace(/^ +/g, (leading) => '&nbsp;'.repeat(leading.length));
          converted = converted.replace(/ {2,}/g, (spaces) => ` ${'&nbsp;'.repeat(spaces.length - 1)}`);
          return converted;
        })
        .join('\n');
    };

    const buildBodyHtml = (plainText: string): string => {
      const normalized = plainText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const blocks = normalized.split('\n\n');
      const paragraphs: string[] = [];

      while (blocks.length > 0 && blocks[blocks.length - 1] === '') {
        blocks.pop();
      }

      if (blocks.length === 0) {
        return '<p></p>';
      }

      blocks.forEach((block) => {
        if (block === '') {
          paragraphs.push('<p></p>');
          return;
        }

        const lines = block.split('\n');
        lines.forEach((line) => {
          if (line === '') {
            paragraphs.push('<p></p>');
            return;
          }
          paragraphs.push(`<p>${preserveSpacesForHtml(line)}</p>`);
        });
      });

      return paragraphs.join('');
    };

    const plainViewHtmlToRichHtml = (plainViewHtml: string): string => {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = plainViewHtml;

      const firstChild = tempDiv.firstElementChild;
      let titleHtml = '<h1></h1>';

      if (firstChild && firstChild.tagName === 'H1') {
        titleHtml = firstChild.outerHTML;
        firstChild.remove();
      }

      const markdownText = extractMarkdownFromPlainBody(tempDiv);
      const richBody = plainMarkdownToRich(markdownText);
      return titleHtml + (richBody || '<p></p>');
    };

    const richHtmlToPlainViewHtml = (richHtml: string): string => {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = richHtml;

      const firstChild = tempDiv.firstElementChild;
      let titleHtml = '<h1></h1>';

      if (firstChild && firstChild.tagName === 'H1') {
        titleHtml = firstChild.outerHTML;
        firstChild.remove();
      }

      const plainBody = richToPlainMarkdown(tempDiv.innerHTML);
      const lines = plainBody.split('\n');
      while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();

      const wrappedBody = lines.map((line) => {
        if (line === '') return '<p></p>';
        return `<p>${preserveSpacesForHtml(line)}</p>`;
      }).join('');

      return titleHtml + (wrappedBody || '<p></p>');
    };

    try {
      const richSourceContent = isCurrentlyPlainMode
        ? plainViewHtmlToRichHtml(currentContent)
        : currentContent;

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = richSourceContent;

      let plainTitle = '';
      let plainBody = '';

      const firstElement = tempDiv.firstElementChild as HTMLElement | null;
      if (firstElement && firstElement.tagName === 'H1') {
        plainTitle = removeFormatting(firstElement.outerHTML);
        firstElement.remove();
        plainBody = removeFormatting(tempDiv.innerHTML);
      } else {
        const allPlain = removeFormatting(tempDiv.innerHTML);
        const blocks = allPlain.split('\n\n');
        plainTitle = blocks.shift() || '';
        plainBody = blocks.join('\n\n');
      }

      const normalizedTitle = plainTitle
        .replace(/\n+/g, ' ')
        .replace(/\s+$/g, '');

      const nextRichContent = `<h1>${escapeHtml(normalizedTitle)}</h1>${buildBodyHtml(plainBody)}`;
      const nextContent = isCurrentlyPlainMode
        ? richHtmlToPlainViewHtml(nextRichContent)
        : nextRichContent;

      if (nextContent !== currentContent) {
        editor.commands.setContent(nextContent, { emitUpdate: false, parseOptions: { preserveWhitespace: 'full' } });
      }
      editor.commands.focus();
    } catch (error) {
      console.error('Failed to remove formatting safely:', error);
      editor.commands.setContent(currentContent, { emitUpdate: false, parseOptions: { preserveWhitespace: 'full' } });
      editor.commands.focus();
    }
  };

  const handleCopyNote = async () => {
    if (!editor) return;

    // Get HTML content
    const html = editor.getHTML();
    // Get Markdown (Drafta-MD) for plain text
    const normalizedHtml = normalizeOrderedListHtml(html);
    const markdown = normalizeOrderedListTags(richToPlainMarkdown(normalizedHtml));

    try {
      // Use ClipboardItem API to copy both HTML and Markdown
      // - Rich mode paste: uses HTML, preserves formatting
      // - Plain mode paste: uses text/plain (Markdown), can be converted back
      const clipboardItem = new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([markdown], { type: 'text/plain' }),
      });
      await navigator.clipboard.write([clipboardItem]);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 800);
    } catch {
      // Fallback: copy Markdown only
      try {
        await navigator.clipboard.writeText(markdown);
      } catch {
        const textarea = document.createElement('textarea');
        textarea.value = markdown;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 800);
    }
  };

  return (
    <TooltipProvider>
      {/* ADDED: plain-mode class for CSS targeting */}
      <div className={cn("flex flex-col h-full", isPlainTextMode && "plain-text-mode")}>
        <div className="px-2 sm:px-4 border-b flex items-center gap-1 shrink-0 h-[57px] overflow-x-auto overscroll-x-contain">
          {navigationAction}
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
            <TooltipContent><p>{t.undo}</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo() || note.isProtected}>
                <Redo />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>{t.redo}</p></TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" className="h-6 mx-2" />
          {/* List buttons ... */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().setHorizontalRule().run()} disabled={note.isProtected || isPlainTextMode}>
                <Minus />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>{t.addSeparator}</p></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleBulletList().run()} disabled={note.isProtected || isPlainTextMode}>
                <List />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>{t.bulletList}</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={editor.isActive('taskList') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleTaskList().run()} disabled={note.isProtected || isPlainTextMode}>
                <ListChecks />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>{t.checkboxList}</p></TooltipContent>
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
              <TooltipContent><p>{t.removeNumberedList}</p></TooltipContent>
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
                <TooltipContent><p>{t.numberedList}</p></TooltipContent>
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
                    {t.newListStart}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start text-sm"
                    onClick={() => {
                      continueOrderedList();
                    }}
                  >
                    {t.continueList}
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
              <TooltipContent><p>{t.numberedList}</p></TooltipContent>
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
            <TooltipContent><p>{isPlainTextMode ? t.toRichText : t.toPlainText}</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleRemoveFormatting} disabled={note.isProtected}>
                <Pilcrow />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>{t.removeFormatting}</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleCopyNote}>
                {isCopied ? <Check className="text-green-500" /> : <Copy />}
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>{t.copyMemo}</p></TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" className="h-6 mx-2" />
          <div className="flex gap-1 ml-1">
            {colors.map(color => {
              // Black/White are default colors - show as active when no color is set
              const isDefaultColor = color.value.toLowerCase() === '#000000' || color.value.toLowerCase() === '#ffffff';
              const isActive = isDefaultColor
                ? !editor.isActive('textStyle', { color: /./ }) // Active when no color is set
                : editor.isActive('textStyle', { color: color.value });
              return (
                <Tooltip key={color.name}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className={cn(
                        "w-6 h-6 rounded-full p-0 transition-opacity",
                        isActive && "ring-2 ring-primary ring-offset-2"
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
              );
            })}
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
