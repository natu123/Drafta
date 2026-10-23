"use client";

import * as React from 'react';
import { createPortal, flushSync } from 'react-dom';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import { noteWithContent, sameNoteBody, type WorkspaceState, type WorkspaceUpdate } from '@/lib/workspace-state';
import { hasBody } from '@/lib/note-source';
import { PREVIEW_CHARACTERS } from '@/lib/note-text';
import { storageCopy } from '@/lib/storage-copy';
import type { MemoHistoryRepository, MemoHistoryVersion } from '@/lib/memo-history';
import { restoreHistoryCopy } from '@/lib/memo-history-restore';
import { memoHistoryCopy } from '@/lib/memo-history-copy';
import { MemoHistoryAction } from '@/components/memo-history-action';
import { MemoActions } from '@/components/memo-actions';
import { MobileNav, type MobilePane } from '@/components/mobile-nav';
import { mobileCopy } from '@/lib/mobile-copy';
import { toast } from '@/hooks/use-toast';

export type WorkspaceViewProps = {
  remoteUpdate?: WorkspaceUpdate;
  initialState?: WorkspaceState;
  accountMenu?: React.ReactNode;
  onWorkspaceChange?: (state: WorkspaceState) => void;
  memoHistory?: Pick<MemoHistoryRepository, 'list'>;
  saveWorkspace?: () => Promise<boolean>;
  /** This device's account key for restoring what was open (AGENTS.md, View Restore). */
  viewKey?: string;
  /** Shown above the header, such as the Playground's not-saved notice. */
  notice?: React.ReactNode;
  /** How many memo bodies are on this device; set only while they are arriving. */
  bodyProgress?: { loaded: number; total: number } | null;
  /** Asks for the body of the memo being opened before the others. */
  onNeedBody?: (noteId: string) => void;
  /** Why the workspace is not saved, when it is not: phones show it above the bottom navigation. */
  saveProblem?: string | null;
};
import { useLang } from '@/contexts/lang-context';
import { useClientReady, useShortcutMod } from '@/hooks/use-client-ready';
import { Minus, Inbox, Trash2, RotateCcw, FolderInput, CheckSquare, X, ChevronLeft, Menu, Pencil, Pin, ChevronDown, Layers, Settings } from 'lucide-react';
import { InlineCreate, InlineNameEditor, TrayMenu, type InlineCreateHandle } from '@/components/inline-name-editor';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import Header, { LanguageMenu } from '@/components/header';
import VerticalTabs from '@/components/vertical-note-tabs';
import { emojis } from '@/components/editor-options';
import type { Note, Group, HistoryItem, OpenTab } from '@/lib/types';
import { notes as initialNotes, groups as initialGroups } from '@/lib/data';
import { localizeSampleNote, applySampleEdit, isEditLockedSample, duplicateSampleForEdit } from '@/lib/sample-notes';
import { sampleLockCopy } from '@/lib/sample-lock-copy';
import { localizeUntitledGroup } from '@/lib/group-display';
import { pinnedNotes, regularNotes, reorderPinSection } from '@/lib/pin-order';
import { cn, htmlToSimpleText, stripColorMarkdown } from '@/lib/utils';
import SettingsDialog from '@/components/settings-dialog';
import { ImportDialog } from '@/components/import-dialog';
import { ExportDialog } from '@/components/export-dialog';
import SearchDialog from '@/components/search-dialog';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal } from '@/components/ui/dropdown-menu';
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import { DndContext, closestCenter, KeyboardSensor, MouseSensor, TouchSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import type { Modifier } from '@dnd-kit/core';
import { a11yCopy, withName } from '@/lib/a11y-copy';
import { DEFAULT_LIST_STYLE, initialSampleOrder, notesForListStyle } from '@/lib/list-style';
import { readViewState, restoreView, writeViewState } from '@/lib/view-state';
import { ALL_MEMOS, allMemos, trayForNewMemos } from '@/lib/all-memos';



const Editor = dynamic(() => import('@/components/editor'), {
  ssr: false,
  loading: () => <EditorLoading />,
});

function EditorLoading() {
  const { lang } = useLang();
  return (
    <div className="flex h-full w-full flex-col" role="status" aria-label={a11yCopy[lang].loadingEditor}>
      <div className="flex h-[57px] shrink-0 items-center gap-2 border-b px-4">
        <div className="h-8 w-8 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex-1 p-6">
        <div className="mb-6 h-8 w-2/3 animate-pulse rounded bg-muted" />
        <div className="mb-3 h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

// カスタムモディファイア: SortableContextの範囲内に制限
const createRestrictToSortableArea = (sortableAreaRef: React.RefObject<HTMLDivElement | null>): Modifier => {
  return ({ transform, draggingNodeRect }) => {
    if (!sortableAreaRef.current || !draggingNodeRect) {
      return transform;
    }

    const sortableRect = sortableAreaRef.current.getBoundingClientRect();
    const { top: dragTop, bottom: dragBottom } = draggingNodeRect;

    // ドラッグ中のアイテムがSortableArea外に出ないように制限
    let newY = transform.y;

    // 上限チェック（SortableAreaの上端より上に行かない）
    const minY = sortableRect.top - dragTop;
    // 下限チェック（SortableAreaの下端より下に行かない）
    const maxY = sortableRect.bottom - dragBottom;

    newY = Math.max(minY, Math.min(maxY, newY));

    return {
      ...transform,
      y: newY,
    };
  };
};
type ViewMode = 'list' | 'grid';



interface HomeSectionProps {
  pinsCollapsed: boolean;
  onTogglePins: () => void;
  onTogglePin: (id: string) => void;
  title: string;
  icon: React.ElementType;
  items: Note[];
  onItemSelect: (id: string, type: 'note') => void;
  activeId?: string | null;
  onReorderNotes: (newOrder: Note[]) => void;
  itemType: 'note';
  viewMode: ViewMode;
  onDeleteItem: (id: string) => void;
  onRestoreItem?: (id: string) => void;
  onPermanentDeleteItem?: (id: string) => void;
  onToggleComplete?: (id: string, isCompleted: boolean) => void;
  isTrash?: boolean;
  scrollDirection: 'top' | 'bottom';
  isVisible?: boolean;
  /** False while a phone shows another pane (AGENTS.md, Mobile Layout). */
  paneShown?: boolean;

  // Selection Mode Props
  isSelectionMode: boolean;
  onToggleSelectionMode: () => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onBulkDelete: () => void;
  onBulkMove: (targetGroupId: string) => void;
  onRestoreGroup?: (id: string) => void;
  onPermanentDeleteGroup?: (id: string) => void;

  groups: Group[]; // For Move Menu
  onAddSeparator?: () => void;
  onQuickAdd?: (title: string) => void;
  /** Names the tray a memo goes to where it is not the one shown (the all memos view). */
  quickAddLabel?: string;
  /** Opens the add field from elsewhere, like the phone's New button. */
  quickAddRef?: React.Ref<InlineCreateHandle>;
  onIconChange?: (id: string, icon: string) => void;
  leadingAction?: React.ReactNode;
  onRenameTray?: (name: string) => void;
  trayNameValue?: string;
  /** The all memos view: order follows edits, so memos are not dragged; each shows its tray. */
  trayNames?: Map<string, string>;
}

// Sortable Note Item Component
interface SortableNoteItemProps {
  onTogglePin?: (id: string) => void;
  item: Note;
  /** Whether this card is the open memo or selected: only cards whose own state changed re-render. */
  isActive: boolean;
  isSelectionMode: boolean;
  isSelected: boolean;
  isTrash?: boolean;
  canDrag: boolean;
  onToggleSelect: (id: string) => void;
  onItemSelect: (id: string) => void;
  onToggleComplete?: (id: string, isCompleted: boolean) => void;
  onDeleteItem: (id: string) => void;
  onRestoreItem?: (id: string) => void;
  onPermanentDeleteItem?: (id: string) => void;
  onIconChange?: (id: string, icon: string) => void;
  /** Shown in the all memos view, where memos from every tray meet. */
  trayName?: string;
}


// Cards drawn when a tray opens, and per step after that (HomeSection, 0.8.5).
const FIRST_CARDS = 24;
const MORE_CARDS = 40;
// Quiet time after a touch or scroll of the list before the next cards are drawn.
const FILL_QUIET_MS = 300;
// Height of a card with its margin (globals.css, .memo-item), kept for cards not drawn yet.
const cardHeight = (note: Note) => note.type === 'separator' ? 40 : note.plainTextContent?.trim() ? 74 : 70;

type ListSection = { pinned: boolean; list: Note[] };
/** The `count` cards nearest the side where the list opens, and the height of the cards left out. */
function nearestCards(sections: ListSection[], count: number, fromEnd: boolean, pinsCollapsed: boolean) {
  let left = count;
  const drawn = new Map<ListSection, { cards: Note[]; rest: number }>();
  for (const section of fromEnd ? [...sections].reverse() : sections) {
    // Collapsed pins are hidden; they are drawn last, with no space kept for them.
    const hidden = section.pinned && pinsCollapsed;
    const take = hidden ? 0 : Math.min(left, section.list.length);
    left -= take;
    const cut = fromEnd ? section.list.length - take : take;
    const cards = fromEnd ? section.list.slice(cut) : section.list.slice(0, cut);
    const skipped = fromEnd ? section.list.slice(0, cut) : section.list.slice(cut);
    drawn.set(section, { cards, rest: hidden ? 0 : skipped.reduce((sum, note) => sum + cardHeight(note), 0) });
  }
  return sections.map(section => ({ ...section, ...drawn.get(section)! }));
}

type SortableBinding = Pick<ReturnType<typeof useSortable>, 'attributes' | 'listeners' | 'setNodeRef' | 'isDragging'> & { transform: string | undefined; transition: string | undefined };

const SortableNoteItemView: React.FC<SortableNoteItemProps & SortableBinding> = ({
  item, isActive, isSelectionMode, isSelected, isTrash, canDrag, trayName,
  onToggleSelect, onItemSelect, onToggleComplete, onDeleteItem, onRestoreItem, onPermanentDeleteItem, onIconChange, onTogglePin,
  attributes, listeners, setNodeRef, transform, transition, isDragging,
}) => {
  const { t, lang } = useLang();
  const a11y = a11yCopy[lang];

  // dnd-kit標準のtransform使用（モディファイアで軸制限）
  // ドラッグ中は非表示にしてDragOverlayのみ表示
  const style: React.CSSProperties = isDragging
    ? { opacity: 0 }
    : {
        transform,
        transition: transition ?? 'transform 200ms ease',
      };

  // Separator rendering
  if (item.type === 'separator') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...(canDrag ? { ...attributes, ...listeners } : {})}
        className={cn(
          "memo-drag-target group relative w-full flex items-center px-0 py-2 mx-[-8px] width-[calc(100%+16px)]",
          isSelectionMode && isSelected ? "bg-primary/10" : ""
        )}
        onClick={() => isSelectionMode && onToggleSelect(item.id)}
      >
        <div className="w-8 flex justify-center shrink-0">
          {isSelectionMode && (
            <Checkbox
              aria-label={a11y.selectSeparator}
              checked={isSelected}
              onCheckedChange={() => onToggleSelect(item.id)}
            />
          )}
        </div>
        <div className="flex-1 h-px border-b-2 border-dotted border-gray-400/50" />
        <div className="w-8 flex justify-center shrink-0">
          {!isSelectionMode && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={a11y.deleteSeparator}
              className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Regular note card
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("memo-item relative mb-2 w-full", !item.plainTextContent?.trim() && "memo-item-plain")}
    >
      <div
        {...(canDrag && !item.isProtected ? { ...attributes, ...listeners } : {})}
        className={cn(
          "memo-drag-target flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer group hover:shadow-md min-w-0 overflow-hidden",
          isActive && !isSelectionMode
            ? "bg-primary/10 border-primary/50 shadow-xs"
            : item.isProtected
              ? "bg-[#64A364]/10 border-[#64A364]/30 hover:border-[#64A364]/50"
              : "bg-card border-border/60 hover:border-primary/30",
          isSelectionMode && isSelected ? "ring-2 ring-primary bg-primary/5" : ""
        )}
        onClick={() => {
          if (isSelectionMode) {
            onToggleSelect(item.id);
          } else {
            onItemSelect(item.id);
          }
        }}
      >
        {!isTrash && onToggleComplete && (
          <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              aria-label={stripColorMarkdown(item.title) || t.untitledMemo}
              checked={item.isCompleted || false}
              onCheckedChange={(checked) => onToggleComplete(item.id, checked as boolean)}
              className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground border-muted-foreground/50"
              disabled={isSelectionMode}
            />
          </div>
        )}

        <div className={cn("flex-1 min-w-0 min-h-[44px] relative", !item.plainTextContent?.trim() && "flex items-center")}>
          <div className={cn("flex items-center justify-between gap-1.5 w-full pr-8", !item.plainTextContent?.trim() && "pr-20")}>
            <div className="flex items-center gap-1.5 min-w-0 flex-1 translate-x-[-4px]">
              <div onClick={(e) => e.stopPropagation()}>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-7 w-7 text-base hover:bg-accent/20 transition-colors rounded-md shrink-0",
                        (isSelectionMode || item.isProtected) && "pointer-events-none"
                      )}
                      disabled={item.isProtected}
                    >
                      {item.icon || '📝'}
                    </Button>
                  </PopoverTrigger>
                  {!item.isProtected && (
                    <PopoverContent className="w-auto p-2" align="start">
                      <div className="grid grid-cols-5 gap-2">
                        {emojis.map((emoji) => (
                          <Button
                            key={emoji}
                            variant="ghost"
                            size="icon"
                            className={cn("text-lg h-8 w-8 rounded-md", item.icon === emoji && "bg-primary/20")}
                            onClick={() => onIconChange?.(item.id, emoji)}
                          >
                            {emoji}
                          </Button>
                        ))}
                      </div>
                    </PopoverContent>
                  )}
                </Popover>
              </div>
              <p className={cn("font-medium truncate transition-colors", isActive && !isSelectionMode ? "text-primary" : "text-foreground", item.isCompleted && "line-through opacity-70")}>
                {stripColorMarkdown(item.title) || t.untitledMemo}
              </p>
            </div>
          </div>
          <div className={cn("flex justify-between items-center min-w-0 overflow-hidden", item.plainTextContent?.trim() ? "mt-1" : "absolute right-0 bottom-0")}>
            {/* One truncated line shows a few dozen characters; laying out whole memos took most of a tray switch. */}
            <p className="text-xs text-muted-foreground truncate flex-1 pr-2 overflow-hidden">{item.plainTextContent?.slice(0, PREVIEW_CHARACTERS)}</p>
            {trayName !== undefined && <span className="memo-tray text-[10px] text-muted-foreground truncate max-w-[40%] shrink-0 mr-2">{trayName}</span>}
            <span className="memo-date text-[10px] text-muted-foreground shrink-0">
              {new Date(item.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {!isTrash && onTogglePin && <Button variant="ghost" size="icon" className={cn("memo-pin absolute right-1 top-1 size-7", item.isPinned && "text-[#C49547]")} aria-label={item.isPinned ? t.unpinMemo : t.pinMemo} aria-pressed={Boolean(item.isPinned)} onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); onTogglePin(item.id); }}><Pin className={item.isPinned ? 'fill-current' : ''} /></Button>}
        {/* Restore view actions only - normal delete uses selection mode */}
        {!isSelectionMode && isTrash && (
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" aria-label={withName(a11y.restoreMemo, stripColorMarkdown(item.title) || t.untitledMemo)} className="h-8 w-8 text-primary" onClick={(e) => { e.stopPropagation(); onRestoreItem?.(item.id); }}>
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label={withName(a11y.deleteMemoForever, stripColorMarkdown(item.title) || t.untitledMemo)} className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); onPermanentDeleteItem?.(item.id); }}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// Typing in one memo re-renders only that card's body (specs/15). dnd-kit re-renders every
// sortable on each list render, so the hook stays in this thin wrapper and passes stable values.
const MemoizedNoteItemView = React.memo(SortableNoteItemView);
// Memoized as well, so opening a memo or selecting one re-renders two cards instead of every card.
const SortableNoteItem = React.memo(function SortableNoteItem(props: SortableNoteItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.item.id,
    disabled: !props.canDrag || props.item.isProtected,
  });
  return <MemoizedNoteItemView {...props} attributes={attributes} listeners={listeners} setNodeRef={setNodeRef}
    transform={CSS.Transform.toString(transform)} transition={transition} isDragging={isDragging} />;
});

// emojis is imported from tiptap-editor.tsx

// Sortable Group Item Component for Left Sidebar
interface SortableGroupItemProps {
  onTogglePin: (id: string) => void;
  onRename: (id: string, name: string) => void;
  rawName: string;
  group: Group;
  activeGroupId: string;
  hasNotes: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

const SortableGroupItem: React.FC<SortableGroupItemProps> = ({
  group, activeGroupId, hasNotes, onSelect, onDelete, onRename, rawName, onTogglePin
}) => {
  const { t, lang } = useLang();
  const a11y = a11yCopy[lang];
  const [editingName, setEditingName] = React.useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: group.id,
    disabled: editingName,
  });

  // dnd-kit標準のtransform使用（モディファイアで軸制限）
  // ドラッグ中は非表示にしてDragOverlayのみ表示
  const style: React.CSSProperties = isDragging
    ? { opacity: 0 }
    : {
        transform: CSS.Transform.toString(transform),
        transition: transition ?? 'transform 200ms ease',
      };

  // Separator rendering
  if (group.type === 'separator') {
    return (
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className="relative flex items-center px-0 py-2 transition-all group/separator"
        style={{ ...style, width: 'calc(100% + 32px)', marginLeft: '-16px' }}
      >
        <div className="w-8 flex justify-center shrink-0" />
        <div className="flex-1 h-px border-b-2 border-dotted border-gray-400/50" />
        <div className="w-8 flex justify-center shrink-0">
          <Button
            variant="ghost"
            size="icon"
            aria-label={a11y.deleteSeparator}
            className="h-6 w-6 text-destructive opacity-0 group-hover/separator:opacity-100 transition-opacity"
            onClick={(e) => { e.stopPropagation(); onDelete(group.id); }}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    );
  }

  // Regular group item
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="tray-row relative group/list w-full"
    >
      {editingName ? <InlineNameEditor initialValue={rawName} label={t.renameTray} placeholder={t.untitledTray} confirmLabel={t.renameTray}
        onConfirm={value => { onRename(group.id, value); setEditingName(false); }} onCancel={() => setEditingName(false)} /> : <div {...attributes} {...listeners}>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-2 h-9 pr-16",
              activeGroupId === group.id
                ? cn(
                  "bg-primary/15 hover:bg-primary/20",
                  hasNotes ? "text-foreground font-medium" : "text-muted-foreground font-normal opacity-70"
                )
                : (!hasNotes && "text-muted-foreground font-normal opacity-70 hover:text-muted-foreground hover:opacity-70")
          )}
          onClick={() => onSelect(group.id)}
        >
          <Inbox className="w-4 h-4" />
          <span className="truncate">{group.name}</span>
        </Button>
      </div>

      }
      {!editingName && <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
        <TrayMenu label={`${t.tray}: ${group.name}`} onRename={() => setEditingName(true)} onDelete={() => onDelete(group.id)} />
        <Button variant="ghost" size="icon" className={cn('size-7', group.isPinned && 'text-[#C49547]')} aria-label={`${group.isPinned ? t.unpinTray : t.pinTray}: ${group.name}`} aria-pressed={Boolean(group.isPinned)} onPointerDown={event => event.stopPropagation()} onClick={() => onTogglePin(group.id)}><Pin className={group.isPinned ? 'fill-current' : ''} /></Button>
      </div>}
    </div>
  );
};

// Module constants keep dnd-kit's sensors and card listeners stable across renders.
const NOTE_MOUSE_SENSOR = { activationConstraint: { distance: 8 } }; // Start drag after 8px of movement
const NOTE_TOUCH_SENSOR = { activationConstraint: { delay: 350, tolerance: 8 } };
const NOTE_KEYBOARD_SENSOR = { coordinateGetter: sortableKeyboardCoordinates };

const HomeSection: React.FC<HomeSectionProps> = ({
  title, icon: Icon, items, onItemSelect, activeId, onReorderNotes, itemType,
  viewMode, pinsCollapsed, onTogglePins, onTogglePin,
  onDeleteItem, onRestoreItem, onPermanentDeleteItem, onToggleComplete, isTrash,
  scrollDirection, isVisible = true, paneShown = true,
  isSelectionMode, onToggleSelectionMode, selectedIds, onToggleSelect, onBulkDelete, onBulkMove,
  groups, onAddSeparator, onQuickAdd, quickAddLabel, quickAddRef, onRestoreGroup, onPermanentDeleteGroup,
  onIconChange, leadingAction, onRenameTray, trayNameValue, trayNames
}) => {
  const { t, lang } = useLang();
  const a11y = a11yCopy[lang];
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const [isRenamingTray, setIsRenamingTray] = React.useState(false);
  const sortableAreaRef = React.useRef<HTMLDivElement>(null);

  // dnd-kit setup
  const [activeDragId, setActiveDragId] = React.useState<string | null>(null);
  const canDragNotes = !isSelectionMode && !isTrash && !trayNames;

  // SortableContext範囲内に制限するカスタムモディファイア
  const restrictToSortableArea = React.useMemo(
    // The factory only reads this ref later, inside dnd-kit's drag callback.
    // eslint-disable-next-line react-hooks/refs
    () => createRestrictToSortableArea(sortableAreaRef),
    []
  );

  const sensors = useSensors(
    useSensor(MouseSensor, NOTE_MOUSE_SENSOR),
    useSensor(TouchSensor, NOTE_TOUCH_SENSOR),
    useSensor(KeyboardSensor, NOTE_KEYBOARD_SENSOR)
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex(item => item.id === active.id);
    const newIndex = items.findIndex(item => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = reorderPinSection(items, String(active.id), String(over.id));
    onReorderNotes(newOrder);
  };

  const activeDragItem = activeDragId ? items.find(item => item.id === activeDragId) : null;

  // Center column scroll based on scrollDirection: when the list opens, the style changes, or the
  // user adds a memo. Memos synced from another device or deleted keep the reading position.
  const scrollAfterAdd = React.useRef(false);
  const createMemo = React.useCallback((title: string) => { scrollAfterAdd.current = true; onQuickAdd?.(title); }, [onQuickAdd]);
  const lastCount = React.useRef(items.length);
  // A phone shows one pane at a time and changes the list style from the tray list, so a move to
  // the edge asked for while the list is hidden waits until it is shown; showing it again otherwise
  // keeps the reading position (returning from the editor).
  const pendingEdge = React.useRef(false);
  const wasShown = React.useRef(paneShown);
  React.useEffect(() => {
    const countChanged = items.length !== lastCount.current;
    lastCount.current = items.length;
    const justShown = paneShown && !wasShown.current;
    const justHidden = !paneShown && wasShown.current;
    wasShown.current = paneShown;
    if (justHidden || (justShown && !pendingEdge.current)) return;
    if (countChanged && !scrollAfterAdd.current && !justShown) return;
    scrollAfterAdd.current = false;
    if (!paneShown) { pendingEdge.current = true; return; }
    pendingEdge.current = false;
    if (!isVisible) return; // Only scroll when visible
    let frame = 0;
    const timer = setTimeout(() => {
      const scrollContainer = scrollAreaRef.current;
      if (!scrollContainer) return;
      if (scrollDirection !== 'bottom') { scrollContainer.scrollTop = 0; return; }
      // Cards appear as they come into view and may differ from their estimated height, so the
      // bottom is set again until it stays put (a few frames at most).
      let tries = 0;
      const toBottom = () => {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
        if (++tries < 8 && scrollContainer.scrollHeight - scrollContainer.clientHeight - scrollContainer.scrollTop > 1) frame = requestAnimationFrame(toBottom);
        else if (tries < 3) frame = requestAnimationFrame(toBottom);
      };
      toBottom();
    }, 50);
    return () => { clearTimeout(timer); cancelAnimationFrame(frame); };
  }, [scrollDirection, items.length, isVisible, paneShown]);

  const deletedGroups = React.useMemo(() => {
    if (!isTrash) return [];
    return groups.filter(g => g.isDeleted);
  }, [isTrash, groups]);

  // Stable card callbacks read the latest props, so unchanged memo cards can skip rendering.
  const cardProps = React.useRef({ onToggleSelect, onItemSelect, itemType, onToggleComplete, onDeleteItem, onRestoreItem, onPermanentDeleteItem, onIconChange, onTogglePin });
  React.useLayoutEffect(() => {
    cardProps.current = { onToggleSelect, onItemSelect, itemType, onToggleComplete, onDeleteItem, onRestoreItem, onPermanentDeleteItem, onIconChange, onTogglePin };
  });
  const cardActions = React.useMemo(() => ({
    onToggleSelect: (id: string) => cardProps.current.onToggleSelect(id),
    onItemSelect: (id: string) => cardProps.current.onItemSelect(id, cardProps.current.itemType),
    onToggleComplete: (id: string, isCompleted: boolean) => cardProps.current.onToggleComplete?.(id, isCompleted),
    onDeleteItem: (id: string) => cardProps.current.onDeleteItem(id),
    onRestoreItem: (id: string) => cardProps.current.onRestoreItem?.(id),
    onPermanentDeleteItem: (id: string) => cardProps.current.onPermanentDeleteItem?.(id),
    onIconChange: (id: string, icon: string) => cardProps.current.onIconChange?.(id, icon),
    onTogglePin: (id: string) => cardProps.current.onTogglePin(id),
  }), []);
  // Drawing every card of a big tray at once froze a phone for about a second (0.8.5). The cards
  // nearest where the list opens come first and the rest follow between frames; until then a
  // space of their height keeps the scroll position and the scrollbar where they will be.
  const [shownCards, setShownCards] = React.useState(() => items.length <= FIRST_CARDS ? Infinity : FIRST_CARDS);
  const filling = viewMode === 'list' && shownCards < items.length;
  // The drag sensor makes the page wait for each touch move, so a phone could not scroll while a step
  // ran: the next cards wait until the list has not been touched or scrolled for a moment (0.8.6).
  const lastTouch = React.useRef(0);
  const touched = React.useCallback(() => { if (filling) lastTouch.current = performance.now(); }, [filling]);
  React.useEffect(() => {
    if (!filling || activeDragId) return;
    const total = items.length;
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const next = () => {
      const quiet = performance.now() - lastTouch.current;
      if (quiet < FILL_QUIET_MS) { timer = setTimeout(next, FILL_QUIET_MS - quiet); return; }
      frame = requestAnimationFrame(() => React.startTransition(() => setShownCards(count => count + MORE_CARDS >= total ? Infinity : count + MORE_CARDS)));
    };
    next();
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); };
  }, [filling, shownCards, activeDragId, items.length]);
  const drawnSections = React.useMemo(() => {
    const pinnedSection = { pinned: true, list: pinnedNotes(items) };
    const regularSection = { pinned: false, list: regularNotes(items) };
    // Pins sit on the side where the list opens: top for Add to Top, bottom for Add to Bottom (AGENTS.md, Pins).
    const sections = isTrash ? [{ pinned: false, list: items }] : scrollDirection === 'bottom' ? [regularSection, pinnedSection] : [pinnedSection, regularSection];
    return filling ? nearestCards(sections, shownCards, scrollDirection === 'bottom', pinsCollapsed) : sections.map(section => ({ ...section, cards: section.list, rest: 0 }));
  }, [items, isTrash, scrollDirection, filling, shownCards, pinsCollapsed]);

  // IDs match [A-Za-z0-9_-], so the joined key is unambiguous; dnd-kit sees the same arrays while order is unchanged.
  const sectionKey = drawnSections.map(section => section.cards.map(item => item.id).join(' ')).join('|');
  const sectionIds = React.useMemo(() => sectionKey.split('|').map(ids => ids ? ids.split(' ') : []), [sectionKey]);

  // The add field sits where new memos appear: above the list, or below it in the chat style (AGENTS.md, Creation).
  // Keep the draft local until the inline form is confirmed.
  const addField = onQuickAdd && !isTrash ? (
    <div className={cn("memo-add px-2 py-1.5 shrink-0", scrollDirection === 'bottom' ? "border-t" : "border-b")} style={{ backgroundColor: 'hsl(var(--accent) / 0.15)' }}>
      <InlineCreate ref={quickAddRef} label={quickAddLabel ?? t.addMemo} placeholder={t.untitledMemo} onCreate={createMemo} />
    </div>
  ) : null;

  return (
    <Card className="h-full w-full border-none shadow-none bg-transparent flex flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between px-4 border-b bg-background/95 backdrop-blur z-20 sticky top-0 shrink-0 h-[57px]">
        <CardTitle className="text-lg flex items-center gap-2 min-w-0">
          {leadingAction}
          <Icon className="w-5 h-5 text-primary" />
          {onRenameTray && isRenamingTray ? <InlineNameEditor label={t.renameTray} initialValue={trayNameValue ?? ''} placeholder={t.untitledTray} confirmLabel={t.renameTray}
            onConfirm={value => { onRenameTray(value); setIsRenamingTray(false); }} onCancel={() => setIsRenamingTray(false)} /> : onRenameTray ? (
            <button className="flex min-w-0 items-center gap-1 rounded focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring" aria-label={t.renameTray} onClick={() => setIsRenamingTray(true)}>
              <span className="truncate">{title}</span><Pencil className="h-3 w-3 shrink-0 text-muted-foreground" />
            </button>
          ) : <span className="truncate">{title}</span>}
        </CardTitle>
        <div className="flex items-center gap-1">
          {/* Selection Mode Actions */}
          {isSelectionMode ? (
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground mr-1">{selectedIds.size}{t.selected}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" disabled={selectedIds.size === 0} title={a11y.moveSelected} aria-label={a11y.moveSelected}>
                    <FolderInput className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>{t.moveTo}</DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        {groups.filter(g => g.type !== 'separator' && !g.isDeleted).map(g => (
                          <DropdownMenuItem key={g.id} onSelect={() => onBulkMove(g.id)}>{g.name}</DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" disabled={selectedIds.size === 0} onClick={onBulkDelete} title={a11y.deleteSelected} aria-label={a11y.deleteSelected}>
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={onToggleSelectionMode} title={a11y.cancelSelection} aria-label={a11y.cancelSelection}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <>
              {/* Normal Actions */}
              <Button
                variant={isSelectionMode ? "secondary" : "ghost"}
                size="icon"
                className={cn("h-8 w-8 text-muted-foreground hover:text-primary", isSelectionMode && "text-primary")}
                onClick={onToggleSelectionMode}
                title={a11y.selectItems}
                aria-label={a11y.selectItems}
              >
                <CheckSquare className="w-4 h-4" />
              </Button>
              {!isTrash && onAddSeparator && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={onAddSeparator} title={t.addSeparator} aria-label={t.addSeparator}>
                  <Minus className="w-4 h-4" />
                </Button>
              )}
            </>
          )}
        </div>
      </CardHeader>

      {scrollDirection !== 'bottom' && addField}

      <CardContent className="flex-1 p-0 overflow-hidden relative min-h-0 w-full flex flex-col">
        {/* The browser's own scrollbar keeps long lists easy to drag (AGENTS.md, Memo Scroll). */}
        <div className="memo-list-scroll flex-1 w-full min-h-0 overflow-y-auto overflow-x-hidden" ref={scrollAreaRef}
          onTouchStart={touched} onTouchMove={touched} onScroll={touched}>
          <div className="w-full max-w-full overflow-hidden">

            {/* Combined List for Trash View (Groups + Notes) or Just Notes */}
            {viewMode === 'list' ? (
              // List view with dnd-kit - DndContext wraps the entire list container
              <DndContext
                id="notes-dnd"
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis, restrictToSortableArea]}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={() => setActiveDragId(null)}
              >
                <div className="flex flex-col gap-0 pb-10 p-2">
                  {/* Render Deleted Groups as Items if isTrash */}
                  {isTrash && deletedGroups.map(group => (
                    <Card key={group.id} className={cn(
                      "group relative overflow-hidden border border-border/60 transition-colors hover:bg-accent/40 mb-2",
                      "bg-accent/30"
                    )}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-8 h-8 rounded-md bg-background/50 flex items-center justify-center shrink-0">
                            <Inbox className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <span className="truncate font-semibold text-sm">{group.name}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">{t.tray}</span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-primary bg-background/50 hover:bg-background" onClick={() => onRestoreGroup?.(group.id)} title={a11y.restoreTray} aria-label={a11y.restoreTray}>
                            <RotateCcw className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive bg-background/50 hover:bg-background" onClick={() => onPermanentDeleteGroup?.(group.id)} title={a11y.deleteTrayForever} aria-label={a11y.deleteTrayForever}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {items.length === 0 && deletedGroups.length === 0 && (
                    <div className="flex flex-col items-center justify-center text-muted-foreground py-10 opacity-50">
                      <p>{t.noItems}</p>
                    </div>
                  )}

                  <div ref={sortableAreaRef}>
                    {drawnSections.map((section, index) => {
                      const cards = (
                      <div className={section.pinned ? 'pinned-items' : 'regular-items'} hidden={section.pinned && pinsCollapsed}>
                        {scrollDirection === 'bottom' && section.rest > 0 && <div className="memo-list-rest memo-list-rest-above" aria-hidden style={{ height: section.rest }} />}
                        <SortableContext items={sectionIds[index]} strategy={verticalListSortingStrategy}>
                          {section.cards.map(item => <SortableNoteItem key={item.id} item={item} isActive={activeId === item.id}
                            isSelectionMode={isSelectionMode} isSelected={selectedIds.has(item.id)} isTrash={isTrash}
                            canDrag={canDragNotes && !(section.pinned && pinsCollapsed)} onToggleSelect={cardActions.onToggleSelect}
                            onItemSelect={cardActions.onItemSelect} onToggleComplete={onToggleComplete && cardActions.onToggleComplete}
                            onDeleteItem={cardActions.onDeleteItem} onRestoreItem={onRestoreItem && cardActions.onRestoreItem}
                            onPermanentDeleteItem={onPermanentDeleteItem && cardActions.onPermanentDeleteItem} onIconChange={onIconChange && cardActions.onIconChange}
                            onTogglePin={cardActions.onTogglePin} trayName={trayNames?.get(item.group)} />)}
                        </SortableContext>
                        {scrollDirection !== 'bottom' && section.rest > 0 && <div className="memo-list-rest" aria-hidden style={{ height: section.rest }} />}
                      </div>
                      );
                      // Pinned memos and their heading share one tinted box (AGENTS.md, Pins).
                      return section.pinned && section.list.length > 0 ? (
                        <div key="pinned" className="pinned-section">
                          <Button variant="ghost" className={cn("pinned-summary w-full justify-start h-9 px-2", !pinsCollapsed && "mb-1")} aria-expanded={!pinsCollapsed} onClick={onTogglePins}><Pin className="text-[#C49547]" /><span>{t.pinnedMemos} ({section.list.length})</span><ChevronDown className={cn("ml-auto", pinsCollapsed && "-rotate-90")} /></Button>
                          {cards}
                        </div>
                      ) : <React.Fragment key={String(section.pinned)}>{cards}</React.Fragment>;
                    })}
                  </div>
                </div>
                {/* Note: min-h-[44px]はSortableNoteItemの元カードと高さを揃えるため必要
                    左カラム(SortableGroupItem)は単純な1行構造のため高さ指定不要 */}
                <DragOverlay modifiers={[restrictToVerticalAxis]}>
                  {activeDragItem && (
                    <div className="opacity-90 shadow-2xl rounded-lg border-2 border-primary bg-card p-2">
                      <div className="flex items-center gap-2 min-h-[44px]">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-base pointer-events-none shrink-0">
                          {activeDragItem.icon || '📝'}
                        </Button>
                        <p className="font-medium truncate">{stripColorMarkdown(activeDragItem.title) || t.untitledMemo}</p>
                      </div>
                    </div>
                  )}
                </DragOverlay>
              </DndContext>
            ) : (
              // Grid view
              <div className={cn("grid gap-2 pb-10 p-2", "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3")}>
                {/* Render Deleted Groups as Items if isTrash */}
                {isTrash && deletedGroups.map(group => (
                  <Card key={group.id} className={cn(
                    "group relative overflow-hidden border border-border/60 transition-colors hover:bg-accent/40",
                    "bg-accent/30"
                  )}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 rounded-md bg-background/50 flex items-center justify-center shrink-0">
                          <Inbox className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <span className="truncate font-semibold text-sm">{group.name}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">{t.tray}</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-primary bg-background/50 hover:bg-background" onClick={() => onRestoreGroup?.(group.id)} title={a11y.restoreTray} aria-label={a11y.restoreTray}>
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive bg-background/50 hover:bg-background" onClick={() => onPermanentDeleteGroup?.(group.id)} title={a11y.deleteTrayForever} aria-label={a11y.deleteTrayForever}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {items.length === 0 && deletedGroups.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center text-muted-foreground py-10 opacity-50">
                    <p>{t.noItems}</p>
                  </div>
                )}

                {/* Grid view notes - no drag support */}
                {items.map((item) => (
                  item.type === 'separator' ? null : (
                    <Card key={item.id} className={cn(
                      "group cursor-pointer hover:bg-secondary transition-colors relative overflow-hidden border",
                      activeId === item.id ? "ring-2 ring-primary border-transparent" : "border-border/60"
                    )}>
                      {/* Grid View Content */}
                      <div className="absolute top-2 right-2 z-10 flex gap-1">
                        {isTrash && (
                          <Button variant="secondary" size="icon" aria-label={withName(a11y.restoreMemo, stripColorMarkdown(item.title) || t.untitledMemo)} className="h-7 w-7 bg-background/80" onClick={(e) => { e.stopPropagation(); onRestoreItem?.(item.id); }}>
                            <RotateCcw className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>

                      <CardContent className="p-0" onClick={() => onItemSelect(item.id, itemType)}>
                        <div className="aspect-video relative w-full">
                          {item.thumbnailUrl ? (
                            <Image src={item.thumbnailUrl} alt={item.title || 'thumbnail'} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <Icon className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="p-2 border-t bg-card">
                        <p className="text-sm truncate font-medium">{stripColorMarkdown(item.title) || t.untitledMemo}</p>
                      </CardFooter>
                    </Card>
                  )
                ))}
              </div>
            )}
          </div>
        </div>

      </CardContent >
      {scrollDirection === 'bottom' && addField}
    </Card >
  )
};


/** The app screen: signed in through CloudSession at /app/, or unsaved at /playground/ (AGENTS.md, Playground). */
export function WorkspaceView({ initialState, accountMenu, onWorkspaceChange, remoteUpdate, memoHistory, saveWorkspace, viewKey, notice, bodyProgress, onNeedBody, saveProblem }: WorkspaceViewProps) {
  const { t: appT, lang, languagePreference } = useLang();
  const { theme } = useTheme();
  // What was open last time on this device, where it still exists (AGENTS.md, View Restore).
  const [restoredView] = React.useState(() => initialState && viewKey ? restoreView(readViewState(viewKey), initialState) : null);

  // Preserve the former newest-first sample display as the initial manual order.
  const [sourceNotes, setNotes] = React.useState<Note[]>(() => initialState?.notes ?? initialSampleOrder(initialNotes));
  const modKey = useShortcutMod();
  const notes = React.useMemo(() => sourceNotes.map(note => localizeSampleNote(note, lang, modKey)), [sourceNotes, lang, modKey]);
  const [sourceGroups, setGroups] = React.useState<Group[]>(() => initialState?.groups ?? initialGroups);
  const groups = React.useMemo(() => sourceGroups.map(group => localizeUntitledGroup(group, appT.untitledTray)), [sourceGroups, appT.untitledTray]);


  // Initialize with 'Welcome to Drafta' note (note-1)
  const [openTabs, setOpenTabs] = React.useState<OpenTab[]>(
    initialState ? (restoredView?.tabIds ?? []).map(id => ({ id, type: 'note' as const })) : initialNotes.length > 0 ? [{ id: initialNotes[0].id, type: 'note' as const }] : []
  );

  const [activeView, setActiveView] = React.useState<'home' | 'editor'>('home');

  const [activeTabId, setActiveTabId] = React.useState<string | null>(
    initialState ? restoredView?.noteId ?? null : initialNotes.length > 0 ? initialNotes[0].id : null
  );

  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [isExportOpen, setIsExportOpen] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);

  const [noteViewMode] = React.useState<ViewMode>('list');
  const [collapsedPins, setCollapsedPins] = React.useState<Record<string, boolean>>({});
  const [trayPinsCollapsed, setTrayPinsCollapsed] = React.useState(false);
  const [activeGroupId, setActiveGroupId] = React.useState<string>(() => restoredView?.groupId ?? (initialState ? initialState.groups.find(group => !group.isDeleted && group.type !== 'separator')?.id ?? 'restore' : 'inbox'));
  const [scrollDirection, setScrollDirection] = React.useState<'top' | 'bottom'>(() => initialState?.settings.listStyle ?? DEFAULT_LIST_STYLE);
  const appliedRemote = React.useRef<WorkspaceUpdate | undefined>(undefined);
  const [selectedNoteIds, setSelectedNoteIds] = React.useState<Set<string>>(new Set());
  const [editorSyncRevision, setEditorSyncRevision] = React.useState(0);
  const [editorContinuity, setEditorContinuity] = React.useState<{ noteId: string; key: string } | null>(null);
  /* eslint-disable react-hooks/set-state-in-effect -- Apply a validated external snapshot before paint without remounting the editor. */
  React.useLayoutEffect(() => {
    if (remoteUpdate && appliedRemote.current !== remoteUpdate) {
      appliedRemote.current = remoteUpdate;
      const next = remoteUpdate.state;
      const copy = remoteUpdate.copies.find(item => item.originalId === activeTabId);
      const nextId = copy?.copyId ?? activeTabId;
      const before = sourceNotes.find(note => note.id === activeTabId);
      const after = next.notes.find(note => note.id === nextId && !note.isDeleted && next.groups.some(group => group.id === note.group && !group.isDeleted));
      if (copy && activeTabId) {
        setEditorContinuity(previous => ({ noteId: copy.copyId, key: previous?.noteId === activeTabId ? previous.key : activeTabId }));
        setActiveTabId(copy.copyId);
      } else if (activeTabId && !after) setActiveTabId(null);
      const remap = (id: string) => remoteUpdate.copies.find(item => item.originalId === id)?.copyId ?? id;
      const visibleIds = new Set(next.notes.filter(note => !note.isDeleted).map(note => note.id));
      setOpenTabs(previous => previous.map(tab => ({ ...tab, id: remap(tab.id) })).filter(tab => visibleIds.has(tab.id)));
      setSelectedNoteIds(previous => new Set([...previous].map(remap).filter(id => visibleIds.has(id))));
      if (copy || before?.title !== after?.title || !sameNoteBody(before, after, document)) setEditorSyncRevision(value => value + 1);
      setNotes(next.notes); setGroups(next.groups); setScrollDirection(next.settings.listStyle);
      setActiveGroupId(previous => previous === ALL_MEMOS || previous === 'restore' ? previous : after && before?.group === previous ? after.group : next.groups.some(group => group.id === previous && !group.isDeleted) ? previous : next.groups.find(group => !group.isDeleted && group.type !== 'separator')?.id ?? 'restore');
      return;
    }
    onWorkspaceChange?.({ notes: sourceNotes, groups: sourceGroups, settings: { language: languagePreference, theme: theme === 'light' || theme === 'dark' ? theme : 'system', listStyle: scrollDirection, noteSort: 'manual' } });
  }, [sourceNotes, sourceGroups, languagePreference, theme, scrollDirection, onWorkspaceChange, remoteUpdate, activeTabId]);
  /* eslint-enable react-hooks/set-state-in-effect */
  // Import batches wait until React committed them and the cloud queue received them.
  const commitWaiters = React.useRef<(() => void)[]>([]);
  React.useEffect(() => { commitWaiters.current.splice(0).forEach(resolve => resolve()); }, [sourceNotes, sourceGroups]);
  const handleImportBatch = async (newGroups: Group[], newNotes: Note[]) => {
    const committed = new Promise<void>(resolve => { commitWaiters.current.push(resolve); });
    // Imported trays go to the end; their memos keep the plan's order (list style, then file name).
    if (newGroups.length) setGroups(previous => [...previous, ...newGroups]);
    setNotes(previous => [...previous, ...newNotes]);
    await committed;
    return saveWorkspace ? saveWorkspace() : true;
  };
  const workspaceSettings = { language: languagePreference, theme: theme === 'light' || theme === 'dark' ? theme : 'system', listStyle: scrollDirection, noteSort: 'manual' } as const;

  const handleListStyleChange = (direction: 'top' | 'bottom') => {
    // Only a local switch mirrors the memos; a synced setting arrives with its synced order.
    setNotes(previous => notesForListStyle(previous, scrollDirection, direction));
    setScrollDirection(direction);
  };

  // Column Layout - Desktop keeps the 3-pane ratio. Narrow screens use adaptive navigation.
  const MIN_LEFT_WIDTH = 140;
  const MIN_CENTER_WIDTH = 280;
  const MIN_EDITOR_WIDTH = 720;

  const [listsWidth, setListsWidth] = React.useState(180);
  const [notesWidth, setNotesWidth] = React.useState(400);
  const [editorWidth, setEditorWidth] = React.useState(400);
  const [layoutMode, setLayoutMode] = React.useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [mobilePane, setMobilePane] = React.useState<MobilePane>(restoredView?.pane ?? 'notes');
  // Phones have no Writing Mode: its vertical tabs do not fit, and the bottom navigation's tabs
  // take their place, so a phone always shows the panes (AGENTS.md, Mobile Layout).
  const isPhone = layoutMode === 'mobile';
  const view = isPhone ? 'home' : activeView;
  React.useEffect(() => {
    if (viewKey) writeViewState(viewKey, { groupId: activeGroupId, noteId: activeTabId, tabIds: openTabs.map(tab => tab.id), pane: mobilePane });
  }, [viewKey, activeGroupId, activeTabId, openTabs, mobilePane]);
  const [isTrayDrawerOpen, setIsTrayDrawerOpen] = React.useState(false);
  // The tray list opens at the side where lists open, like the memo list: the bottom in the chat
  // style. Only when it appears or the style changes; adding or pinning a tray keeps the position.
  const trayScrollRef = React.useRef<HTMLDivElement>(null);
  const traysShown = view === 'home' && (layoutMode === 'desktop' || (layoutMode === 'tablet' ? isTrayDrawerOpen : mobilePane === 'trays'));
  React.useEffect(() => {
    if (!traysShown) return;
    const timer = setTimeout(() => {
      const viewport = trayScrollRef.current?.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]');
      if (viewport) viewport.scrollTop = scrollDirection === 'bottom' ? viewport.scrollHeight : 0;
    }, 50);
    return () => clearTimeout(timer);
  }, [traysShown, scrollDirection]);

  React.useLayoutEffect(() => {
    const updateLayout = () => {
      const viewportWidth = window.innerWidth;
      const nextMode = viewportWidth < 768 ? 'mobile' : viewportWidth < 1280 ? 'tablet' : 'desktop';
      setLayoutMode(nextMode);

      if (nextMode === 'desktop') {
        // 1.7:3.4:6.9 = 12 parts total (right column remains widest for the editor toolbar).
        setListsWidth(Math.max(MIN_LEFT_WIDTH, Math.floor(viewportWidth * (1.7 / 12))));
        setNotesWidth(Math.max(MIN_CENTER_WIDTH, Math.floor(viewportWidth * (3.4 / 12))));
        setEditorWidth(Math.max(MIN_EDITOR_WIDTH, Math.floor(viewportWidth * (6.9 / 12))));
        setIsTrayDrawerOpen(false);
      }
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  // Manual resize state (only left-center boundary is resizable)
  const [isResizingLists, setIsResizingLists] = React.useState(false);

  // Manual resize handler for left-center boundary
  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLists) {
        const newWidth = e.clientX;
        // Left column: min width to (left+center total - center min)
        const maxLeftWidth = listsWidth + notesWidth - MIN_CENTER_WIDTH;
        if (newWidth >= MIN_LEFT_WIDTH && newWidth <= maxLeftWidth) {
          const delta = newWidth - listsWidth;
          setListsWidth(newWidth);
          setNotesWidth(notesWidth - delta); // Adjust center column accordingly
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizingLists(false);
      document.body.classList.remove('resizing-columns');
    };

    if (isResizingLists) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.classList.add('resizing-columns');
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('resizing-columns');
    };
  }, [isResizingLists, listsWidth, notesWidth]);

  // Selection Mode State
  const [isSelectionMode, setIsSelectionMode] = React.useState(false);

  // Permanent Delete Confirmation State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [itemToDelete, setItemToDelete] = React.useState<{ id: string, type: 'note' | 'group' } | null>(null);

  const confirmPermanentDelete = (id: string, type: 'note' | 'group') => {
    setItemToDelete({ id, type });
    setDeleteConfirmOpen(true);
  };

  const handleExecutePermanentDelete = () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'note') {
      handlePermanentDeleteNote(itemToDelete.id);
    } else {
      handlePermanentDeleteGroup(itemToDelete.id);
    }
    setItemToDelete(null);
  };

  const handleToggleSelectionMode = () => {
    setIsSelectionMode(prev => !prev);
    setSelectedNoteIds(new Set()); // Clear on toggle
  };

  const handleToggleSelect = (id: string) => {
    setSelectedNoteIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkDelete = () => {
    // Determine which groups these notes are in to handle removal
    // Actually onDeleteItem handles finding by ID
    selectedNoteIds.forEach(id => handleDeleteNote(id));
    setSelectedNoteIds(new Set());
    setIsSelectionMode(false); // Optional: Exit mode after action
  };

  const handleBulkMove = (targetGroupId: string) => {
    setNotes(prev => prev.map(note =>
      selectedNoteIds.has(note.id) ? { ...note, group: targetGroupId } : note
    ));
    setSelectedNoteIds(new Set());
    setIsSelectionMode(false);
  };





  const [tabSearchTerm, setTabSearchTerm] = React.useState(''); // Added for VerticalTabs

  const [history, setHistory] = React.useState<HistoryItem[]>([]);

  // Group DnD State (dnd-kit)
  const [activeDragGroupId, setActiveDragGroupId] = React.useState<string | null>(null);
  const clientReady = useClientReady();
  const groupOverlayContainer = clientReady ? document.body : null;
  const groupSortableAreaRef = React.useRef<HTMLDivElement>(null);

  // SortableContext範囲内に制限するカスタムモディファイア（グループ用）
  const restrictToGroupSortableArea = React.useMemo(
    // The factory only reads this ref later, inside dnd-kit's drag callback.
    // eslint-disable-next-line react-hooks/refs
    () => createRestrictToSortableArea(groupSortableAreaRef),
    []
  );

  const groupSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleGroupDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string;
    setActiveDragGroupId(id);
  };

  const handleGroupDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragGroupId(null);

    if (!over || active.id === over.id) return;

    setGroups(prev => reorderPinSection(prev, String(active.id), String(over.id)));
  };

  const activeDragGroup = activeDragGroupId ? groups.find(g => g.id === activeDragGroupId) : null;



  const activeNote = activeTabId ? notes.find((note) => note.id === activeTabId) ?? null : null;
  // Only the open memo gets editor HTML; the others keep their stored body (specs/17).
  // A memo from a summary opens once its body has arrived; the body is asked for first (specs/17).
  const bodyReady = activeNote ? hasBody(activeNote) : false;
  const editorNote = React.useMemo(() => activeNote && bodyReady ? noteWithContent(activeNote, globalThis.document) : null, [activeNote, bodyReady]);
  const activeNoteId = activeNote?.id;
  React.useEffect(() => { if (activeNoteId && !bodyReady) onNeedBody?.(activeNoteId); }, [activeNoteId, bodyReady, onNeedBody]);
  const handleHistoryRestore = (version: MemoHistoryVersion) => {
    const labels = memoHistoryCopy[lang];
    const restored = restoreHistoryCopy(version, sourceGroups, sourceNotes, { dom: document,
      preferredGroupId: activeNote?.group ?? activeGroupId, newId: () => crypto.randomUUID(), now: new Date().toISOString(),
      suffix: labels.suffix, unnamed: appT.untitledMemo, recoveredTrayName: labels.tray,
    });
    if (restored.newGroup) setGroups(previous => [...previous, restored.newGroup!]);
    setNotes(previous => scrollDirection === 'top' ? [restored.note, ...previous] : [...previous, restored.note]);
    setActiveGroupId(restored.note.group);
    toast({ description: labels.restored });
  };
  React.useEffect(() => {
    document.title = activeNote && !activeNote.isDeleted
      ? `${stripColorMarkdown(activeNote.title) || appT.untitledMemo} - Drafta`
      : 'Drafta';
  }, [activeNote, appT.untitledMemo]);

  const openTabDetails = React.useMemo(() => {
    return openTabs
      .map(tab => {
        if (tab.type === 'note') {
          const note = notes.find(n => n.id === tab.id);
          // Filter by tabSearchTerm if present
          if (note && tabSearchTerm) {
            if (!note.title.toLowerCase().includes(tabSearchTerm.toLowerCase())) {
              return null;
            }
          }
          return note ? { ...note, type: 'note' as const } : null;
        }
        return null;
      })
      .filter((item): item is Note & { type: 'note' } => item !== null);
  }, [openTabs, notes, tabSearchTerm]);



  const addToHistory = React.useCallback((item: Note) => {
    setHistory(prev => {
      const newHistory: HistoryItem = {
        id: item.id,
        type: 'note',
        title: item.title,
        icon: item.icon,
        accessedAt: new Date().toISOString(),
      };
      const filtered = prev.filter(h => h.id !== item.id);
      return [newHistory, ...filtered].slice(0, 15);
    });
  }, []);

  // The editor names its memo, since a delayed write can arrive after switching memos.
  const handleNoteUpdate = React.useCallback((updatedNote: Partial<Note> & { content?: string }, noteId: string | null = activeTabId) => {
    if (!noteId) return;
    setNotes(notes => notes.map(note => {
      // Guide samples are read-only even if an edit slips through the editor.
      if (note.id === noteId && !isEditLockedSample(note)) {
        const newNote = { ...applySampleEdit(note, updatedNote, lang, modKey), updatedAt: new Date().toISOString() };
        if (updatedNote.content !== undefined) {
          newNote.plainTextContent = htmlToSimpleText(updatedNote.content);
        }
        return newNote;
      }
      return note;
    }));
  }, [activeTabId, lang, modKey]);

  const openTab = React.useCallback((id: string, type: 'note') => {
    setOpenTabs(prev => prev.some(tab => tab.id === id) ? prev : [...prev, { id, type }]);
    setActiveTabId(id);
  }, []);

  const closeTab = (id: string) => {
    const newTabs = openTabs.filter(t => t.id !== id);
    setOpenTabs(newTabs);

    if (activeTabId === id) {
      // If closing active, select previous or nothing
      if (newTabs.length > 0) {
        setActiveTabId(newTabs[newTabs.length - 1].id);
      } else {
        setActiveTabId(null);
      }
    }
  };

  const handleReorderTabs = (draggedId: string, targetId: string) => {
    setOpenTabs(prev => {
      const dIndex = prev.findIndex(t => t.id === draggedId);
      const tIndex = prev.findIndex(t => t.id === targetId);
      if (dIndex === -1 || tIndex === -1) return prev;

      const newTabs = [...prev];
      const [dragged] = newTabs.splice(dIndex, 1);
      // Recalculate tIndex since splice might shift
      const newTIndex = newTabs.findIndex(t => t.id === targetId);
      newTabs.splice(newTIndex, 0, dragged);
      return newTabs;
    });
  };

  const handleAddSeparator = () => {
    if (!groups.some(group => group.id === activeGroupId && !group.isDeleted && group.type !== 'separator')) return;
    const newSeparator: Note = {
      id: `sep-${Date.now()}`,
      type: 'separator',
      title: '',
      icon: '',
      content: '',
      plainTextContent: '',
      group: activeGroupId,
      stars: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNotes(prev => {
      // If there's an active note, insert after it
      if (activeTabId) {
        const index = prev.findIndex(n => n.id === activeTabId);
        if (index !== -1) {
          const newNotes = [...prev];
          newNotes.splice(index + 1, 0, newSeparator);
          return newNotes;
        }
      }
      return [...prev, newSeparator];
    });
  };

  // The tray the app opens by default; the all memos view adds its memos there (AGENTS.md, All Memos).
  const defaultTray = trayForNewMemos(groups);
  const addTarget = activeGroupId === ALL_MEMOS ? defaultTray : groups.find(group => group.id === activeGroupId && !group.isDeleted && group.type !== 'separator');
  const addTargetId = addTarget?.id;
  const addLabel = activeGroupId === ALL_MEMOS && addTarget ? withName(mobileCopy[lang].addMemoTo, addTarget.name) : appT.addMemo;
  const handleQuickCreateNote = (title: string) => {
    if (!addTargetId) return;
    const newNote: Note = {
      id: `note-${crypto.randomUUID()}`,
      title,
      icon: '📝',
      content: '',
      plainTextContent: '',
      group: addTargetId,
      stars: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
    };
    // Add to top or bottom based on scrollDirection
    setNotes(prev => {
      if (scrollDirection === 'top') {
        // Find first note in the target tray and insert before it
        const firstGroupIndex = prev.findIndex(n => n.group === addTargetId);
        if (firstGroupIndex === -1) return [...prev, newNote];
        const result = [...prev];
        result.splice(firstGroupIndex, 0, newNote);
        return result;
      }
      return [...prev, newNote];
    });
  };

  // Opening a memo changes nothing stored: recording the time it was opened re-rendered every memo,
  // saved the workspace and rewrote the device copy on each open, and nothing reads it (0.8.5).
  const handleNoteSelect = React.useCallback((id: string) => {
    const note = notes.find(n => n.id === id);
    if (note) {
      openTab(id, 'note'); // Ensure tab opens
      addToHistory(note);
      if (layoutMode === 'mobile') setMobilePane('editor');
    }
  }, [notes, layoutMode, openTab, addToHistory]);

  const handleGroupSelect = React.useCallback((id: string) => {
    setActiveGroupId(id);
    if (layoutMode === 'mobile') setMobilePane('notes');
    if (layoutMode === 'tablet') setIsTrayDrawerOpen(false);
  }, [layoutMode]);

  // The phone's New opens the memo list's add field; from the restore view it moves to the tray
  // memos are added to first. The pane is shown before the field opens, so the keyboard comes up.
  const quickAddRef = React.useRef<InlineCreateHandle>(null);
  const mobileCreateTarget = activeGroupId === 'restore' ? defaultTray : addTarget;
  const handleMobileCreate = () => {
    if (!mobileCreateTarget) return;
    flushSync(() => {
      if (activeGroupId === 'restore') setActiveGroupId(mobileCreateTarget.id);
      setMobilePane('notes');
    });
    quickAddRef.current?.open();
  };
  // The bottom navigation's tabs list every open memo, whatever the desktop tab filter says.
  const mobileTabs = React.useMemo(() => isPhone ? openTabs.map(tab => notes.find(note => note.id === tab.id)).filter((note): note is Note => Boolean(note)) : [], [isPhone, openTabs, notes]);
  const handleMobileCloseTab = (id: string) => {
    if (openTabs.length === 1 && openTabs[0].id === id && mobilePane === 'editor') setMobilePane('notes');
    closeTab(id);
  };

  const handleToggleComplete = (id: string, isCompleted: boolean) => {
    setNotes(prev => prev.map(note => note.id === id ? { ...note, isCompleted } : note));
  };


  // Note Reorder Handler - receives the new order from dnd-kit
  const handleReorderNotes = React.useCallback((newOrder: Note[]) => {
    // newOrder contains only the items from current group (filtered by sortedNotes)
    // We need to update the main notes array while preserving notes from other groups
    setNotes(prev => {
      // Get IDs in the new order
      const reorderedIds = new Set(newOrder.map(n => n.id));

      // Separate notes: ones that were reordered vs ones from other groups
      const otherNotes = prev.filter(n => !reorderedIds.has(n.id));

      // Combine: other notes + reordered notes (preserving the new order)
      // Since notes in the same group should stay together, we need to insert at the right position
      // Find the index of the first note from this group in original array
      const firstGroupNoteIndex = prev.findIndex(n => reorderedIds.has(n.id));

      const result = [...otherNotes];
      result.splice(
        Math.min(firstGroupNoteIndex, result.length),
        0,
        ...newOrder
      );
      return result;
    });
  }, []);

  // Delete helpers
  const handleDeleteNote = (id: string) => {
    const note = notes.find(n => n.id === id);
    if (note?.isProtected) return; // Protect special notes
    setNotes(prev => prev.map(note => note.id === id ? { ...note, isDeleted: true } : note));
    setOpenTabs(prev => prev.filter(tab => tab.id !== id));
    if (activeTabId === id) setActiveTabId(null);
  };
  const handleRestoreNote = (id: string) => {
    setNotes(prev => prev.map(note => note.id === id ? { ...note, isDeleted: false } : note));
  };
  const handlePermanentDeleteNote = (id: string) => {
    const note = notes.find(n => n.id === id);
    if (note?.isProtected) return; // Protect special notes
    setNotes(prev => prev.filter(note => note.id !== id).map(note => note.parentId === id ? { ...note, parentId: undefined } : note));
    if (activeTabId === id) setActiveTabId(null);
    closeTab(id);
  };

  const handleAddGroupSeparator = () => {
    const newSeparator: Group = { id: `sep-${Date.now()}`, name: '', type: 'separator' };
    setGroups(prev => {
      // If there's an active group, insert after it
      // Note: activeGroupId could be 'inbox', 'trash' etc. We only insert relative to actual groups in the array
      // But typically we want to insert after the *selected* one if it exists in the list.
      if (activeGroupId && activeGroupId !== 'restore') {
        const index = prev.findIndex(g => g.id === activeGroupId);
        if (index !== -1) {
          const newGroups = [...prev];
          newGroups.splice(index + 1, 0, newSeparator);
          return newGroups;
        }
      }
      return [...prev, newSeparator];
    });
  };
  const handleCreateGroup = (name: string) => {
    const newGroup: Group = { id: `group-${crypto.randomUUID()}`, name, type: 'group' };
    setGroups(prev => [...prev, newGroup]);
    if (!groups.some(group => !group.isDeleted && group.type !== 'separator')) setActiveGroupId(newGroup.id);
  };

  // Every memo in one list, whatever tray it is in (AGENTS.md, All Memos).
  const allMemosEntry = (
    <Button variant="ghost" className={cn("all-memos w-full justify-start gap-2 h-9", activeGroupId === ALL_MEMOS && "bg-primary/15 hover:bg-primary/20 font-medium")} onClick={() => handleGroupSelect(ALL_MEMOS)}>
      <Layers className="w-4 h-4" />
      <span className="truncate">{appT.allMemos}</span>
    </Button>
  );
  const restoreEntry = (
    <Button variant="ghost" className={cn("restore-entry w-full justify-start gap-2 h-9", activeGroupId === 'restore' && "bg-primary/10 text-primary hover:bg-primary/20")} onClick={() => handleGroupSelect('restore')}>
      <RotateCcw className="w-4 h-4" />
      <span>{appT.restore}</span>
    </Button>
  );

  const filteredGroups = React.useMemo(() => {
    return groups.filter(g => !g.isDeleted);
  }, [groups]);

  const handleDeleteGroup = (id: string) => {
    setGroups(prev => prev.map(g => g.id === id ? { ...g, isDeleted: true } : g));
    if (activeGroupId === id) setActiveGroupId(groups.find(group => group.id !== id && !group.isDeleted && group.type !== 'separator')?.id ?? 'restore');
  };
  const handleRestoreGroup = (id: string) => setGroups(prev => prev.map(g => g.id === id ? { ...g, isDeleted: false } : g));
  const handlePermanentDeleteGroup = (id: string) => {
    setNotes(prev => prev.filter(note => note.group !== id));
    setGroups(prev => prev.filter(g => g.id !== id));
  };

  // The memo list's pins and the editor's pin are the same switch (AGENTS.md, Pins).
  const handleTogglePin = React.useCallback((id: string) => {
    setNotes(prev => prev.map(note => note.id === id ? { ...note, isPinned: !note.isPinned } : note));
  }, []);

  const handleIconChange = React.useCallback((id: string, icon: string) => {
    setNotes(prevNotes => prevNotes.map(note => note.id === id && !isEditLockedSample(note) ? { ...note, icon } : note));
  }, []);

  const handleDuplicateSample = (id: string) => {
    const source = sourceNotes.find(note => note.id === id);
    if (!source || !isEditLockedSample(source)) return;
    const now = new Date().toISOString();
    const copy = duplicateSampleForEdit(source, lang, modKey, { id: `note-${crypto.randomUUID()}`, now });
    // Same placement rule as a new memo in this tray.
    setNotes(previous => {
      const index = scrollDirection === 'top' ? previous.findIndex(note => note.group === copy.group) : -1;
      return index === -1 ? [...previous, copy] : [...previous.slice(0, index), copy, ...previous.slice(index)];
    });
    if (activeGroupId !== ALL_MEMOS) setActiveGroupId(copy.group);
    openTab(copy.id, 'note');
    toast({ description: sampleLockCopy[lang].duplicated });
  };

  const handleToggleView = React.useCallback(() => {
    setActiveView(prev => prev === 'home' ? 'editor' : 'home');
  }, []);

  const sortedNotes = React.useMemo(() => {
    if (activeGroupId === ALL_MEMOS) return allMemos(notes, groups, scrollDirection);
    let items = notes;
    if (activeGroupId === 'restore') {
      items = items.filter(note => note.isDeleted);
    } else {
      items = items.filter(note => note.group === activeGroupId && !note.isDeleted);
    }
    return items;
  }, [notes, groups, activeGroupId, scrollDirection]);
  const allTrayNames = React.useMemo(() => activeGroupId === ALL_MEMOS ? new Map(groups.map(group => [group.id, group.name])) : undefined, [activeGroupId, groups]);

  // Create a tray while retaining the current selection and pane; the field sits where new trays
  // appear, below the list in the chat style (AGENTS.md, Creation).
  const trayAddField = (
    <div className={cn("px-2 py-1.5 shrink-0", scrollDirection === 'bottom' ? "border-t" : "border-b")} style={{ backgroundColor: 'hsl(var(--accent) / 0.15)' }}>
      <InlineCreate label={appT.addTray} placeholder={appT.untitledTray} onCreate={handleCreateGroup} />
    </div>
  );

  return (
    <>
      <div className={cn("app-shell flex flex-col bg-background text-foreground overflow-hidden", isPhone && "has-mobile-nav")}>
        {notice}
        {/* Phones use the bottom navigation and the tray list header instead (AGENTS.md, Mobile Layout). */}
        {!isPhone && <Header
          accountMenu={accountMenu}
          onToggleView={handleToggleView}
          activeView={activeView}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenSearch={() => setIsSearchOpen(true)}
          history={history.map(item => {
            const currentNote = notes.find(note => note.id === item.id);
            return currentNote ? { ...item, title: currentNote.title } : item;
          })}
          onHistorySelect={handleNoteSelect}
        />}

        <div role="main" className="flex flex-1 overflow-hidden relative min-h-0">

          {layoutMode === 'tablet' && isTrayDrawerOpen && view === 'home' && (
            <button
              type="button"
              aria-label={a11yCopy[lang].closeTrays}
              className="absolute inset-0 z-30 bg-black/20"
              onClick={() => setIsTrayDrawerOpen(false)}
            />
          )}

          {/* PANE 0: VERTICAL TABS (Only in Writing Mode) */}
          {view === 'editor' && openTabDetails.length > 0 && (
            <VerticalTabs
              items={openTabDetails}
              activeId={activeTabId}
              onTabSelect={(id) => openTab(id, 'note')}
              onTabClose={closeTab}
              onReorderTabs={handleReorderTabs}
              searchTerm={tabSearchTerm}
              onSearchChange={setTabSearchTerm}
              scrollDirection={scrollDirection}
            />
          )}

          {/* PANE 1: LISTS SIDEBAR */}
          <div
            className={cn(
              "flex-col border-r bg-secondary min-h-0",
              view !== 'home' && "hidden",
              view === 'home' && layoutMode === 'desktop' && "flex relative shrink-0",
              view === 'home' && layoutMode === 'tablet' && cn(
                "flex absolute inset-y-0 left-0 z-40 w-[min(20rem,85vw)] shadow-xl transition-transform duration-200",
                isTrayDrawerOpen ? "translate-x-0" : "-translate-x-full"
              ),
              view === 'home' && isPhone && (mobilePane === 'trays' ? "flex relative w-full" : "hidden")
            )}
            style={layoutMode === 'desktop' ? { width: listsWidth } : undefined}
          >
              {/* Header for Lists */}
              <div className="flex items-center justify-between px-3 sm:px-4 border-b bg-background/95 backdrop-blur sticky top-0 z-20 shrink-0 h-[57px]">
                <div className="flex items-center gap-1 min-w-0">
                  {layoutMode === 'tablet' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 shrink-0"
                      title={a11yCopy[lang].backToMemos}
                      aria-label={a11yCopy[lang].backToMemos}
                      onClick={() => setIsTrayDrawerOpen(false)}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                  )}
                  <h2 className="text-lg font-semibold truncate">{appT.trays}</h2>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {/* The tray list is a phone's starting screen, so the app-wide controls live here. */}
                  {isPhone && <>
                    {accountMenu}
                    <LanguageMenu />
                    <Button variant="ghost" size="icon" aria-label={appT.settings} title={appT.settings} onClick={() => setIsSettingsOpen(true)}>
                      <Settings className="h-5 w-5" />
                    </Button>
                  </>}
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={handleAddGroupSeparator} title={appT.addSeparator} aria-label={appT.addSeparator}>
                    <Minus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {scrollDirection !== 'bottom' && trayAddField}

              <ScrollArea ref={trayScrollRef} className="tray-scroll flex-1 px-4">
                <div className="w-full max-w-full overflow-hidden">
                  <DndContext
                    id="groups-dnd"
                    sensors={groupSensors}
                    collisionDetection={closestCenter}
                    modifiers={[restrictToVerticalAxis, restrictToGroupSortableArea]}
                    onDragStart={handleGroupDragStart}
                    onDragEnd={handleGroupDragEnd}
                    onDragCancel={() => setActiveDragGroupId(null)}
                  >
                    <div className="flex flex-col gap-0 pb-2">
                      {/* All memos at the side where the list opens, restore at the other (AGENTS.md, All Memos). */}
                      <div className="pt-2 pb-2 mb-2 border-b">{scrollDirection === 'bottom' ? restoreEntry : allMemosEntry}</div>
                      <div ref={groupSortableAreaRef}>
                        {/* Pinned trays follow the memo list: bottom in the chat style (AGENTS.md, Tray Pins). */}
                        {(scrollDirection === 'bottom' ? [false, true] : [true, false]).map(pinned => {
                          const section = filteredGroups.filter(group => Boolean(group.isPinned) === pinned);
                          if (!section.length) return null;
                          return <React.Fragment key={String(pinned)}>
                          {pinned && <Button variant="ghost" className={cn("pinned-summary w-full justify-start h-9", scrollDirection === 'bottom' && "mt-1")} aria-expanded={!trayPinsCollapsed} aria-controls="pinned-trays" onClick={() => setTrayPinsCollapsed(value => !value)}><Pin className="text-[#C49547]" /><span>{appT.pinnedTrays} ({section.length})</span><ChevronDown className={cn('ml-auto', trayPinsCollapsed && '-rotate-90')} /></Button>}
                          {!(pinned && trayPinsCollapsed) && <div id={pinned ? 'pinned-trays' : undefined}>
                        <SortableContext
                          items={section.map(g => g.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {section.map(group => {
                            const hasNotes = notes.some(n => n.group === group.id && !n.isDeleted);
                            return (
                              <SortableGroupItem
                                key={group.id}
                                group={group}
                                activeGroupId={activeGroupId}
                                hasNotes={hasNotes}
                                onSelect={handleGroupSelect}
                                onDelete={handleDeleteGroup}
                                onTogglePin={id => setGroups(prev => prev.map(item => item.id === id ? { ...item, isPinned: !item.isPinned } : item))}
                                rawName={sourceGroups.find(item => item.id === group.id)?.name ?? ''}
                                onRename={(id, name) => setGroups(prev => prev.map(item => item.id === id ? { ...item, name } : item))}
                              />
                            );
                          })}
                        </SortableContext>
                          </div>}
                          </React.Fragment>;
                        })}
                      </div>

                      <div className="pt-2 mt-2 border-t">{scrollDirection === 'bottom' ? allMemosEntry : restoreEntry}</div>
                    </div>
                    {groupOverlayContainer && createPortal(<DragOverlay>
                      {activeDragGroup && (
                        <div
                          className="opacity-90 shadow-2xl border-2 border-primary bg-card rounded-md flex items-center justify-start gap-2 h-full w-full px-4"
                        >
                          <Inbox className="w-4 h-4" />
                          <span className="font-medium truncate">{activeDragGroup.name}</span>
                        </div>
                      )}
                    </DragOverlay>, groupOverlayContainer)}
                  </DndContext>
                </div>
              </ScrollArea>
              {scrollDirection === 'bottom' && trayAddField}
              {/* Resizer Handle for Lists */}
              <div
                className="resize-handle absolute right-0 top-0 bottom-0 w-[6px] translate-x-1/2 bg-transparent hover:bg-foreground/40 z-[9999] transition-colors"
                onMouseDown={(e) => { e.preventDefault(); setIsResizingLists(true); }}
              />
          </div>

          {/* PANE 2: NOTES LIST */}
          <div
            className={cn(
              "flex-col border-r relative min-h-0",
              view !== 'home' && "hidden",
              view === 'home' && layoutMode === 'desktop' && "flex shrink-0",
              view === 'home' && layoutMode === 'tablet' && "flex shrink-0 w-[clamp(18rem,38vw,24rem)]",
              view === 'home' && isPhone && (mobilePane === 'notes' ? "flex w-full" : "hidden")
            )}
            style={layoutMode === 'desktop' ? { width: view === 'home' ? notesWidth : '100%' } : undefined}
          >

            <HomeSection
              key={activeGroupId}
              pinsCollapsed={Boolean(collapsedPins[activeGroupId])}
              onTogglePins={() => setCollapsedPins(prev => ({ ...prev, [activeGroupId]: !prev[activeGroupId] }))}
              onTogglePin={handleTogglePin}
              title={activeGroupId === 'restore' ? appT.restore : activeGroupId === ALL_MEMOS ? appT.allMemos : groups.find(g => g.id === activeGroupId)?.name || appT.inbox}
              icon={activeGroupId === 'restore' ? RotateCcw : activeGroupId === ALL_MEMOS ? Layers : Inbox}
              trayNames={allTrayNames}
              items={sortedNotes}
              onItemSelect={handleNoteSelect}
              activeId={activeTabId}
              onReorderNotes={handleReorderNotes}
              itemType="note"
              viewMode={noteViewMode}
              onDeleteItem={handleDeleteNote}
              onToggleComplete={handleToggleComplete}
              onRestoreItem={handleRestoreNote}
              onPermanentDeleteItem={(id) => confirmPermanentDelete(id, 'note')}
              isTrash={activeGroupId === 'restore'}
              scrollDirection={scrollDirection}
              isVisible={view === 'home'}
              paneShown={!isPhone || mobilePane === 'notes'}

              isSelectionMode={isSelectionMode}
              onToggleSelectionMode={handleToggleSelectionMode}
              selectedIds={selectedNoteIds}
              onToggleSelect={handleToggleSelect}
              onBulkDelete={handleBulkDelete}
              onBulkMove={handleBulkMove}
              onRestoreGroup={handleRestoreGroup}
              onPermanentDeleteGroup={(id) => confirmPermanentDelete(id, 'group')}

              groups={groups}
              onAddSeparator={activeGroupId === ALL_MEMOS ? undefined : handleAddSeparator}
              onQuickAdd={addTargetId ? handleQuickCreateNote : undefined}
              quickAddLabel={addLabel}
              quickAddRef={quickAddRef}
              trayNameValue={sourceGroups.find(group => group.id === activeGroupId)?.name}
              onRenameTray={activeGroupId !== 'restore' && activeGroupId !== ALL_MEMOS ? (name) => {
                setGroups(prev => prev.map(group => group.id === activeGroupId ? { ...group, name } : group));
              } : undefined}
              onIconChange={handleIconChange}
              leadingAction={layoutMode === 'tablet' ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  title={a11yCopy[lang].openTrays}
                  aria-label={a11yCopy[lang].openTrays}
                  onClick={() => setIsTrayDrawerOpen(true)}
                >
                  <Menu className="w-5 h-5" />
                </Button>
              ) : undefined}
            />
          </div>

          {/* PANE 3: EDITOR */}
          <div
            className={cn(
              "bg-background relative overflow-hidden min-w-0 min-h-0",
              view === 'editor' && "flex flex-1",
              view === 'home' && layoutMode === 'desktop' && "flex shrink-0",
              view === 'home' && layoutMode === 'tablet' && "flex flex-1",
              view === 'home' && isPhone && (mobilePane === 'editor' ? "flex w-full" : "hidden")
            )}
            style={layoutMode === 'desktop'
              ? (view === 'editor' ? { minWidth: editorWidth } : { width: editorWidth })
              : undefined
            }
          >
            {activeNote && !editorNote ? (
              <div role="status" className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">{storageCopy[lang].bodyLoading}</div>
            ) : activeNote && editorNote ? (
              <Editor
                externalRevision={editorSyncRevision}
                continuityKey={editorContinuity?.noteId === activeNote.id ? editorContinuity.key : undefined}
                note={editorNote}
                memoActions={activeNote.type !== 'separator' && <MemoActions
                  isPinned={Boolean(activeNote.isPinned)}
                  onTogglePin={!activeNote.isDeleted ? () => handleTogglePin(activeNote.id) : undefined}
                  historyAction={memoHistory ? <MemoHistoryAction noteId={activeNote.id} history={memoHistory} onRestore={handleHistoryRestore} /> : undefined}
                  onDelete={!activeNote.isProtected && !activeNote.isDeleted ? () => {
                    handleDeleteNote(activeNote.id);
                    setActiveView('home');
                    setMobilePane('notes');
                  } : undefined}
                />}
                onNoteUpdate={handleNoteUpdate}
                onDuplicate={() => handleDuplicateSample(activeNote.id)}
                onIconChange={(id, icon) => handleIconChange(id, icon)}
                scrollDirection={scrollDirection}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center relative">
                <div className="absolute top-0 left-0 right-0 h-[57px] border-b bg-background/50" />
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Inbox className="w-8 h-8 opacity-20" />
                </div>
                <h3 className="text-xl font-medium text-foreground mb-2">{appT.noActiveMemo}</h3>
                <p className="max-w-xs">{appT.noActiveMemoDesc}</p>
                {/* New memos need a tray: the one shown, or the first tray in the all memos view; the restore view has none. */}
                {addTargetId && <div className="mt-6 w-full max-w-sm"><InlineCreate label={addLabel} placeholder={appT.untitledMemo} onCreate={title => {
                  handleQuickCreateNote(title);
                  setActiveView('home');
                  setMobilePane('notes');
                }} /></div>}
              </div>
            )}
          </div>
        </div >

        {isPhone && <MobileNav
          pane={mobilePane}
          onPane={setMobilePane}
          onSearch={() => setIsSearchOpen(true)}
          onCreate={mobileCreateTarget ? handleMobileCreate : undefined}
          tabs={mobileTabs}
          activeTabId={activeTabId}
          onOpenTab={id => { openTab(id, 'note'); setMobilePane('editor'); }}
          onCloseTab={handleMobileCloseTab}
          progress={bodyProgress ? { ...bodyProgress, label: storageCopy[lang].hydrating(bodyProgress.loaded, bodyProgress.total) } : null}
          saveProblem={saveProblem}
        />}

        <SettingsDialog
          open={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          scrollDirection={scrollDirection}
          onScrollDirectionChange={handleListStyleChange}
          // Imports save as they go, so they wait for the bodies of a new device (specs/17).
          onImport={bodyProgress ? undefined : () => { setIsSettingsOpen(false); setIsImportOpen(true); }}
          onExport={bodyProgress ? undefined : () => { setIsSettingsOpen(false); setIsExportOpen(true); }}
        />

        <ExportDialog open={isExportOpen} onOpenChange={setIsExportOpen} notes={notes} groups={sourceGroups} />

        <ImportDialog
          open={isImportOpen}
          onOpenChange={setIsImportOpen}
          existing={{ notes: sourceNotes, groups: sourceGroups, settings: workspaceSettings }}
          onBatch={handleImportBatch}
          onRetry={() => saveWorkspace ? saveWorkspace() : Promise.resolve(true)}
          onShowTray={groupId => { setActiveGroupId(groupId); setActiveView('home'); setMobilePane('notes'); }}
        />

        <SearchDialog
          open={isSearchOpen}
          onOpenChange={setIsSearchOpen}
          notes={notes}
          groups={groups}
          onNoteSelect={(noteId) => {
            // メモを選択したとき、そのメモが属するトレイも開く
            const note = notes.find(n => n.id === noteId);
            if (note && note.group) {
              setActiveGroupId(note.group);
            }
            handleNoteSelect(noteId);
          }}
          onGroupSelect={handleGroupSelect}
          progress={bodyProgress}
        />

        <DeleteConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          onConfirm={handleExecutePermanentDelete}
          title={itemToDelete?.type === 'group' ? appT.deleteTrayTitle : appT.deleteMemoTitle}
          description={itemToDelete?.type === 'group' ? appT.deleteTrayDesc : appT.deleteMemoDesc}
        />
      </div >
    </>
  );
}
