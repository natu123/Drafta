"use client";

import { DOMSerializer, DOMParser, Node as ProseMirrorNode } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';

import * as React from 'react';
import { useEditor, useEditorState, Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { Undo, Redo, Bold, Italic, Strikethrough, Code, Pilcrow, List, ListChecks, ListOrdered, Minus, FileText, Type, Search, Palette, Copy } from 'lucide-react';
import { NoteSearch } from './tiptap-extensions/note-search';
import { TitlePlaceholder } from './tiptap-extensions/title-placeholder';
import { TitleRow } from './tiptap-extensions/title-row';
import { TitleCaret } from './tiptap-extensions/title-caret';
import { NoteFind } from './note-find';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn, removeFormatting, richToPlainMarkdown, plainMarkdownToRich, normalizeOrderedListTags, normalizeOrderedListHtml } from '@/lib/utils';
import { Separator } from './ui/separator';
import type { Note } from '@/lib/types';
import { documentExtensions } from './tiptap-extensions/document-schema';
import { RichMarkdownInputRules } from './tiptap-extensions/rich-markdown-input-rules';
import { SlashCommandMenu } from './slash-command-menu';
import { useTheme } from 'next-themes';
import { useLang } from '@/contexts/lang-context';
import { useShortcutMod } from '@/hooks/use-client-ready';
import { emojis } from './editor-options';
import { isEditLockedSample } from '@/lib/sample-notes';
import { sampleLockCopy } from '@/lib/sample-lock-copy';
import { registerPendingEdit } from '@/lib/pending-edits';

// Typing marks the memo dirty; its HTML is written into app state once typing pauses (specs/15).
export const EDITOR_SAVE_DELAY_MS = 300;

interface TiptapEditorProps {
  externalRevision?: number;
  note: Note;
  /** Receives the memo's text with the ID of the memo this editor showed, even if a flush runs late. */
  onNoteUpdate: (updatedNote: Partial<Note>, noteId: string) => void;
  /** Creates an editable copy of a read-only guide sample. */
  onDuplicate?: () => void;
  onIconChange: (icon: string) => void;
  scrollDirection?: 'top' | 'bottom';
  /** Pin, history and delete for this memo, at the right end of the toolbar (AGENTS.md, Editor Layout). */
  memoActions?: React.ReactNode;
  /** The focus view toggle at the start of the toolbar, and Tabs with the recent memos before the memo actions (tablets and PCs, AGENTS.md, Web Layout). */
  toolbarStart?: React.ReactNode;
  toolbarEnd?: React.ReactNode;
}

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

/**
 * Puts the editor's view into the page. TipTap's EditorContent draws the whole memo a second time
 * on mount, for React node views, and a third time on unmount; this app has none (0.8.5).
 */
function EditorMount({ editor, ...props }: { editor: Editor | null } & React.HTMLAttributes<HTMLDivElement>) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    const element = ref.current;
    if (!editor || editor.isDestroyed || !element) return;
    const host = editor.view.dom.parentNode;
    if (host && host !== element) element.replaceChildren(...host.childNodes);
    editor.setOptions({ element });
  }, [editor]);
  return <div ref={ref} {...props} />;
}

const TiptapEditor: React.FC<TiptapEditorProps> = ({ note, onNoteUpdate, onIconChange, scrollDirection = 'bottom', onDuplicate, externalRevision = 0, memoActions, toolbarStart, toolbarEnd }) => {
  // isProtected also blocks deletion; guide samples only block editing.
  const readOnly = Boolean(note.isProtected) || isEditLockedSample(note);
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';
  const { t, lang } = useLang();
  const shortcutMod = useShortcutMod();
  const [findOpen, setFindOpen] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const paletteId = React.useId();
  // Build colors array with theme-appropriate default color
  const colors = React.useMemo(() => {
    const defaultColor = isDarkMode ? darkModeDefaultColor : lightModeDefaultColor;
    return [defaultColor, ...baseColors];
  }, [isDarkMode]);

  // Dynamic extensions including translated Placeholder
  const isPlainTextModeRef = React.useRef(false);
  const extensions = React.useMemo(() => [
    ...documentExtensions,
    NoteSearch,
    // TipTap stores this callback and evaluates it during input events, not render.
    // eslint-disable-next-line react-hooks/refs
    RichMarkdownInputRules.configure({ isEnabled: () => !isPlainTextModeRef.current }),
    TitlePlaceholder.configure({ placeholder: () => t.untitledMemo }),
    TitleCaret,
    TitleRow,
  ], [t.untitledMemo]);

  const [isPlainTextMode, setIsPlainTextMode] = React.useState(false);
  const contentRef = React.useRef(note.content);
  const noteIdRef = React.useRef(note.id);
  React.useLayoutEffect(() => { noteIdRef.current = note.id; }, [note.id]);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Color Markdown → HTML変換（タイトル表示用）
  const titleToHtml = React.useCallback((title: string): string => {
    return title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(
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
    onNoteUpdate({ title: newTitle, content: newContent }, noteIdRef.current);
  }, [extractMarkdownFromPlainBody, htmlToTitle, onNoteUpdate]);

  // Serializing a long memo on every keystroke froze typing; the latest edit waits here instead.
  const pendingSave = React.useRef<{ editor: Editor; timer: ReturnType<typeof setTimeout> } | null>(null);
  const handleSaveRef = React.useRef(handleSave);
  React.useLayoutEffect(() => { handleSaveRef.current = handleSave; }, [handleSave]);
  const flushSave = React.useCallback(() => {
    const pending = pendingSave.current;
    if (!pending) return false;
    clearTimeout(pending.timer);
    pendingSave.current = null;
    handleSaveRef.current(pending.editor);
    return true;
  }, []);
  // Switching memos unmounts this editor; its pending text belongs to the memo it showed.
  React.useEffect(() => {
    const unregister = registerPendingEdit(flushSave);
    return () => { unregister(); flushSave(); };
  }, [flushSave]);


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
    // The editor is only drawn in the browser (no page is prerendered with a memo open), so it is
    // made with the first render instead of one render later (0.8.5).
    immediatelyRender: true,
    editable: !readOnly,
    enableInputRules: ['richMarkdownInputRules'],
    enablePasteRules: false,
    onUpdate: ({ editor, transaction }) => {
      // Initialization may emit an update without changing the document.
      // Do not treat opening an example as a user edit.
      if (!transaction.docChanged) return;
      // Auto-renumber all ordered list items after any change
      // Use setTimeout to avoid dispatch during update
      setTimeout(() => {
        renumberAllOrderedLists(editor);
      }, 0);
      if (pendingSave.current) clearTimeout(pendingSave.current.timer);
      pendingSave.current = { editor, timer: setTimeout(flushSave, EDITOR_SAVE_DELAY_MS) };
    },
    onBlur: () => { flushSave(); },
    editorProps: {
      attributes: {
        class: 'drafta-editor max-w-none focus:outline-hidden min-h-[calc(100vh-150px)]',
      },
      // The title row stays at the top, so the caret is kept clear of it when it is scrolled into view.
      scrollMargin: { top: 64, bottom: 8, left: 5, right: 5 },
      clipboardTextSerializer: (slice, view) => {
        try {
          const schema = view.state.schema;
          const serializer = DOMSerializer.fromSchema(schema);
          const domFragment = serializer.serializeFragment(slice.content);
          const tempDiv = document.createElement('div');
          tempDiv.appendChild(domFragment);
          const normalizedHtml = normalizeOrderedListHtml(tempDiv.innerHTML);
          const markdown = normalizeOrderedListTags(richToPlainMarkdown(normalizedHtml));
          // The title is the memo's name, not a heading: copied, it is plain text without "# " (0.8.6).
          return slice.content.firstChild?.type.name === 'title' ? markdown.replace(/^# /, '') : markdown;
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
      editor.setEditable(!readOnly);
    }
  }, [editor, readOnly]);

  // Scroll based on scrollDirection (on mount and note switch)
  const previousExternalRevision = React.useRef(externalRevision);
  React.useEffect(() => {
    if (previousExternalRevision.current !== externalRevision) return;
    // Use setTimeout to ensure content is rendered
    let frame = 0;
    const timer = setTimeout(() => {
      const box = scrollContainerRef.current;
      if (!box) return;
      if (scrollDirection !== 'bottom') { box.scrollTop = 0; return; }
      // The end of the text, not of the empty space kept below it for taps: a memo that fits stays
      // at its title (on phones the space made even short memos open below the title, 2026-10-26).
      // A phone shows the editor pane as the memo opens, so wait a few frames for it to have a size.
      let tries = 0;
      const toEnd = () => {
        const last = box.querySelector('.ProseMirror')?.lastElementChild?.getBoundingClientRect();
        if ((!box.clientHeight || !last?.height) && ++tries < 10) { frame = requestAnimationFrame(toEnd); return; }
        const end = last ? last.bottom - box.getBoundingClientRect().top + box.scrollTop + 16 : box.scrollHeight;
        box.scrollTop = Math.max(0, end - box.clientHeight);
      };
      toEnd();
    }, 50);
    return () => { clearTimeout(timer); cancelAnimationFrame(frame); };
  }, [scrollDirection, note.id, externalRevision]);

  // Sync external note changes (switching notes)
  const prevNoteIdRef = React.useRef(note.id);
  const prevSampleContentRef = React.useRef(note.content);
  const prevSampleTitleRef = React.useRef(note.title);
  React.useEffect(() => {
    const external = previousExternalRevision.current !== externalRevision;
    if (editor && (external || note.id !== prevNoteIdRef.current || (note.sampleKey && (note.content !== prevSampleContentRef.current || note.title !== prevSampleTitleRef.current)))) {
      const selection = editor.state.selection;
      const scrollTop = scrollContainerRef.current?.scrollTop;
      const oldTitleSize = editor.state.doc.firstChild?.nodeSize ?? 0;
      const keepPlain = external && isPlainTextModeRef.current;
      const body = keepPlain ? richToPlainMarkdown(note.content).split('\n').map(line => `<p>${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') || '<br>'}</p>`).join('') : note.content;
      const newContent = getInitialContent(note.title, body);
      editor.commands.setContent(newContent, { emitUpdate: false });
      contentRef.current = note.content;
      if (!external) setIsPlainTextMode(false);
      if (external) {
        const delta = (editor.state.doc.firstChild?.nodeSize ?? 0) - oldTitleSize;
        const position = (value: number) => Math.max(1, Math.min(editor.state.doc.content.size - 1, value + (value >= oldTitleSize ? delta : 0)));
        editor.commands.setTextSelection({ from: position(selection.from), to: position(selection.to) });
        if (scrollContainerRef.current && scrollTop !== undefined) scrollContainerRef.current.scrollTop = scrollTop;
      }
      previousExternalRevision.current = externalRevision;
      prevNoteIdRef.current = note.id;
      prevSampleContentRef.current = note.content;
      prevSampleTitleRef.current = note.title;
    }
  }, [note.id, note.title, note.content, note.sampleKey, editor, getInitialContent, externalRevision]);

  // Insert NEW ordered list (startFrom=1 で新規リスト)
  // toggleOrderedList は隣接リストをマージするので、直接ノードを操作
  const insertOrderedList = React.useCallback(() => {
    if (!editor || editor.state.selection.$from.parent.type.name === 'title') return;

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
    if (!editor || editor.state.selection.$from.parent.type.name === 'title') return;

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
  // The toolbar is not drawn again on every transaction; it only needs to know when the caret enters or leaves the title.
  const caretInTitle = useEditorState({ editor, selector: ({ editor: current }) => current?.state.selection.$from.parent.type.name === 'title' }) ?? false;

  const removeOrderedList = React.useCallback(() => {
    if (!editor) return;
    editor.chain().focus().toggleOrderedList().run();
  }, [editor]);

  if (!editor) {
    return null;
  }
  const blockLocked = readOnly || isPlainTextMode || caretInTitle;
  const findButton = <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label={t.findInMemo} onClick={() => setFindOpen(open => !open)}><Search /></Button></TooltipTrigger><TooltipContent>{t.findInMemo}</TooltipContent></Tooltip>;

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
    // Pending text is read in the current mode, so write it before the mode changes.
    flushSave();

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
    // Keep the reading position: the same share of the memo stays in view after the switch.
    const scroller = scrollContainerRef.current;
    const readRatio = scroller && scroller.scrollHeight > scroller.clientHeight ? scroller.scrollTop / (scroller.scrollHeight - scroller.clientHeight) : 0;

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
      isPlainTextModeRef.current = isPlainTextMode;
      editor.commands.setContent(currentHtml, { emitUpdate: false, parseOptions: { preserveWhitespace: 'full' } });
      return;
    }

    setIsPlainTextMode(nextMode);

    // Replacing the document leaves the caret at its end; put it where the reader was instead,
    // after the new layout, without scrolling to it.
    requestAnimationFrame(() => {
      const box = scrollContainerRef.current;
      if (!box || editor.isDestroyed) return;
      box.scrollTop = readRatio * Math.max(0, box.scrollHeight - box.clientHeight);
      const view = editor.view.dom.getBoundingClientRect();
      const visibleTop = Math.max(view.top, box.getBoundingClientRect().top) + 8;
      const hit = editor.view.posAtCoords({ left: view.left + 24, top: visibleTop });
      if (hit) editor.commands.setTextSelection(hit.pos);
      editor.commands.focus(null, { scrollIntoView: false });
    });
  };

  const handleRemoveFormatting = () => {
    if (!editor) return;
    flushSave();
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

  return (
    <TooltipProvider delayDuration={200} disableHoverableContent>
      <SlashCommandMenu editor={editor} enabled={!isPlainTextMode && !readOnly} />
      {/* ADDED: plain-mode class for CSS targeting */}
      <div className={cn("editor-shell flex flex-col h-full min-w-0", isPlainTextMode && "plain-text-mode", note.isCompleted && "memo-completed")} onKeyDownCapture={event => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
          event.preventDefault(); setFindOpen(true);
          const shell = event.currentTarget;
          requestAnimationFrame(() => shell.querySelector<HTMLInputElement>('.note-find input')?.focus());
        }
      }}>
        <div className="editor-toolbar border-b bg-background px-2 py-1">
          <div className="editor-tools">
            {toolbarStart}
            <div className="editor-tools-content">
          <Tooltip>
            {/* Logic unchanged */}
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t.undo} onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo() || readOnly}>
                <Undo />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>{t.undo}</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t.redo} onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo() || readOnly}>
                <Redo />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>{t.redo}</p></TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" className="h-6 mx-2" />
          {/* List buttons ... */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t.addSeparator} onClick={() => editor.chain().focus().setHorizontalRule().run()} disabled={blockLocked}>
                <Minus />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>{t.addSeparator}</p></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'} size="icon" aria-label={t.bulletList} onClick={() => editor.chain().focus().toggleBulletList().run()} disabled={blockLocked}>
                <List />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>{t.bulletList}</p></TooltipContent>
          </Tooltip>
          {/* Ordered List: 前にリストがあればPopover、なければ直接作成 */}
          {editor.isActive('orderedList') ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  aria-label={t.removeNumberedList}
                  onClick={removeOrderedList}
                  disabled={blockLocked}
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
                      aria-label={t.numberedList}
                      disabled={blockLocked}
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
                  aria-label={t.numberedList}
                  onClick={insertOrderedList}
                  disabled={blockLocked}
                >
                  <ListOrdered />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>{t.numberedList}</p></TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={editor.isActive('taskList') ? 'secondary' : 'ghost'} size="icon" aria-label={t.checkboxList} onClick={() => editor.chain().focus().toggleTaskList().run()} disabled={blockLocked}>
                <ListChecks />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>{t.checkboxList}</p></TooltipContent>
          </Tooltip>


            </div>
            <Button className="editor-palette-toggle" variant="ghost" size="icon" aria-label={t.colorPalette} title={t.colorPalette} aria-expanded={paletteOpen} aria-controls={paletteId} onClick={() => setPaletteOpen(open => !open)}><Palette /></Button>
            {/* Right: Plain/Rich, Remove formatting, then delete, history, search and pin, then Tabs on
                tablets and PCs; on phones this group is the first row (AGENTS.md, Editor Layout). */}
            <div className="editor-toolbar-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={isPlainTextMode ? t.toRichText : t.toPlainText} onClick={handleTogglePlainTextMode}>
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
              <Button variant="ghost" size="icon" aria-label={t.removeFormatting} onClick={handleRemoveFormatting} disabled={readOnly}>
                <Pilcrow />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>{t.removeFormatting}</p></TooltipContent>
          </Tooltip>
              {React.isValidElement<{ search?: React.ReactNode }>(memoActions) ? React.cloneElement(memoActions, { search: findButton }) : <div className="editor-memo-actions">{findButton}</div>}
              {toolbarEnd}
            </div>
          <div id={paletteId} className="editor-palette" hidden={!paletteOpen}>
            {/* Drawn when shown: every memo opens with the palette closed (0.8.5). */}
            {paletteOpen && colors.map(color => {
              // Black/White are default colors - show as active when no color is set
              const isDefaultColor = color.value.toLowerCase() === '#000000' || color.value.toLowerCase() === '#ffffff';
              const isActive = isDefaultColor
                ? !editor.isActive('textStyle', { color: /./ }) // Active when no color is set
                : editor.isActive('textStyle', { color: color.value });
              return (
                <Tooltip key={color.name}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "w-8 h-10 rounded-md p-1 transition-opacity"
                      )}
                      aria-pressed={isActive}
                      disabled={readOnly || isPlainTextMode}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSetColor(color.value)}
                    >
                      <span aria-hidden="true" className={cn("block h-5 w-5 rounded-full border", isActive && "ring-2 ring-primary ring-offset-2")} style={{ backgroundColor: color.value }} />
                      <span className="sr-only">{color.name}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{color.name}</p></TooltipContent>
                </Tooltip>
              );
            })}
          </div>
          </div>

        </div>

        {findOpen && <NoteFind editor={editor} onClose={() => setFindOpen(false)} />}
        {!readOnly && (
          <BubbleMenu editor={editor} shouldShow={({ from, to }) => !window.matchMedia('(hover: none) and (pointer: coarse)').matches && !isPlainTextMode && editor.isEditable && from !== to} options={{ placement: 'top', offset: 8 }} className="selection-format-menu bg-background border rounded-md shadow-lg p-1 grid grid-cols-2 sm:grid-cols-4 gap-1 max-w-[calc(100vw-16px)]">
            {[
              { mark: 'bold', label: t.formatBold, icon: Bold, key: 'B', run: () => editor.chain().focus().toggleBold().run() },
              { mark: 'italic', label: t.formatItalic, icon: Italic, key: 'I', run: () => editor.chain().focus().toggleItalic().run() },
              { mark: 'strike', label: t.formatStrike, icon: Strikethrough, key: 'Shift+X', run: () => editor.chain().focus().toggleStrike().run() },
              { mark: 'code', label: t.formatCode, icon: Code, key: 'E', run: () => editor.chain().focus().toggleCode().run() },
            ].map(({ mark, label, icon: Icon, key, run }) => (
              <Tooltip key={mark}>
                <TooltipTrigger asChild>
                  <Button onMouseDown={event => event.preventDefault()} onClick={run} disabled={!editor.can().toggleMark(mark)} variant={editor.isActive(mark) ? 'secondary' : 'ghost'} className="h-auto min-h-11 flex-col gap-1 px-2 py-1" aria-label={label} aria-pressed={editor.isActive(mark)}>
                    <Icon /><kbd className="text-[10px] font-normal">{shortcutMod}+{key}</kbd>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{label}</TooltipContent>
              </Tooltip>
            ))}
          </BubbleMenu>
        )}

        <div
          ref={scrollContainerRef}
          className="editor-scroll flex-1 overflow-y-auto px-4 cursor-text"
          onMouseDown={(e) => {
            // Clicks land where they point. The scrollbar belongs to the browser; ProseMirror
            // resolves its own area (gaps between blocks) to the nearest position. Only the space
            // below the last line puts the caret at the end, and the side padding at the nearest
            // text. Forcing focus('end') for every non-text click used to move the caret and the
            // view to the end of the memo on most clicks.
            if (!editor || readOnly || e.button !== 0) return;
            const box = e.currentTarget;
            const onPadding = e.target === box;
            if (!onPadding && e.target !== editor.view.dom) return;
            if (e.clientX >= box.getBoundingClientRect().left + box.clientLeft + box.clientWidth) return;
            const last = editor.view.dom.lastElementChild?.getBoundingClientRect();
            const belowContent = !last || e.clientY > last.bottom;
            if (!onPadding && !belowContent) return;
            e.preventDefault();
            const doc = editor.view.dom.getBoundingClientRect();
            const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low + 1), high - 1);
            const hit = belowContent ? null : editor.view.posAtCoords({ left: clamp(e.clientX, doc.left, doc.right), top: clamp(e.clientY, doc.top, doc.bottom) });
            editor.chain().setTextSelection(hit?.pos ?? editor.state.doc.content.size).focus(null, { scrollIntoView: false }).run();
          }}
        >
          {onDuplicate && isEditLockedSample(note) && !note.isDeleted && (
            <div role="note" className="mt-3 flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1">{sampleLockCopy[lang].notice}</span>
              <Button variant="outline" size="sm" onClick={onDuplicate}><Copy />{sampleLockCopy[lang].duplicate}</Button>
            </div>
          )}
          <div className="editor-document relative">
          <div className="editor-title-icon">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="text-2xl w-10 h-10 shrink-0" disabled={readOnly}>
                {note.icon || '📝'}
              </Button>
            </PopoverTrigger>
            {!readOnly && (
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
          </div>
          <EditorMount editor={editor} dir="auto" />
          </div>
        </div>
      </div>
    </TooltipProvider >
  );
};

export default TiptapEditor;
