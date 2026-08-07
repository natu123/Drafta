"use client";

import * as React from 'react';
import Image from 'next/image';
import { useLang } from '@/contexts/lang-context';
import { Minus, ArrowDownUp, Inbox, Trash2, RotateCcw, Plus, FolderInput, CheckSquare, X, ChevronLeft, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import Header from '@/components/header';
import VerticalTabs from '@/components/vertical-note-tabs';
import Editor from '@/components/editor';
import { emojis } from '@/components/tiptap-editor';
import type { Note, Group, HistoryItem, OpenTab } from '@/lib/types';
import { notes as initialNotes, groups as initialGroups } from '@/lib/data';
import { cn, htmlToSimpleText, stripColorMarkdown } from '@/lib/utils';
import SettingsDialog from '@/components/settings-dialog';
import SearchDialog from '@/components/search-dialog';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal } from '@/components/ui/dropdown-menu';
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import type { Modifier } from '@dnd-kit/core';


type SortOption = 'manual' | 'newest' | 'oldest' | 'last-accessed';

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

const getSortedItems = (
  items: Note[],
  sortOption: SortOption
): Note[] => {
  switch (sortOption) {
    case 'newest':
      return [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    case 'oldest':
      return [...items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    case 'last-accessed':
      return [...items].sort((a, b) => new Date(b.lastAccessedAt || 0).getTime() - new Date(a.lastAccessedAt || 0).getTime());
    case 'manual':
    default:
      return items;
  }
};


interface HomeSectionProps {
  title: string;
  icon: React.ElementType;
  items: Note[];
  onItemSelect: (id: string, type: 'note') => void;
  activeId?: string | null;
  onReorderNotes: (newOrder: Note[]) => void;
  itemType: 'note';
  sortOption: SortOption;
  onSortChange: (sortOption: SortOption) => void;
  viewMode: ViewMode;
  onDeleteItem: (id: string) => void;
  onRestoreItem?: (id: string) => void;
  onPermanentDeleteItem?: (id: string) => void;
  onToggleComplete?: (id: string, isCompleted: boolean) => void;
  isTrash?: boolean;
  scrollDirection: 'top' | 'bottom';
  isVisible?: boolean;

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
  onIconChange?: (id: string, icon: string) => void;
  leadingAction?: React.ReactNode;
}

// Sortable Note Item Component
interface SortableNoteItemProps {
  item: Note;
  activeId: string | null | undefined;
  isSelectionMode: boolean;
  selectedIds: Set<string>;
  isTrash?: boolean;
  canDrag: boolean;
  onToggleSelect: (id: string) => void;
  onItemSelect: (id: string) => void;
  onToggleComplete?: (id: string, isCompleted: boolean) => void;
  onDeleteItem: (id: string) => void;
  onRestoreItem?: (id: string) => void;
  onPermanentDeleteItem?: (id: string) => void;
  onIconChange?: (id: string, icon: string) => void;
}

const SortableNoteItem: React.FC<SortableNoteItemProps> = ({
  item, activeId, isSelectionMode, selectedIds, isTrash, canDrag,
  onToggleSelect, onItemSelect, onToggleComplete, onDeleteItem, onRestoreItem, onPermanentDeleteItem, onIconChange
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    disabled: !canDrag || item.isProtected,
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
  if (item.type === 'separator') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...(canDrag ? { ...attributes, ...listeners } : {})}
        className={cn(
          "group relative w-full flex items-center px-0 py-2 mx-[-8px] width-[calc(100%+16px)]",
          isSelectionMode && selectedIds.has(item.id) ? "bg-primary/10" : ""
        )}
        onClick={() => isSelectionMode && onToggleSelect(item.id)}
      >
        <div className="w-8 flex justify-center shrink-0">
          {isSelectionMode && (
            <Checkbox
              aria-label="Select separator"
              checked={selectedIds.has(item.id)}
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
              aria-label="Delete separator"
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
      className="relative mb-2 w-full"
    >
      <div
        {...(canDrag && !item.isProtected ? { ...attributes, ...listeners } : {})}
        className={cn(
          "flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer group hover:shadow-md min-w-0 overflow-hidden",
          activeId === item.id && !isSelectionMode
            ? "bg-[#E7A1B0]/10 border-[#E7A1B0]/50 shadow-sm"
            : item.isProtected
              ? "bg-[#64A364]/10 border-[#64A364]/30 hover:border-[#64A364]/50"
              : "bg-card border-border/60 hover:border-primary/30",
          isSelectionMode && selectedIds.has(item.id) ? "ring-2 ring-primary bg-primary/5" : ""
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
              aria-label={stripColorMarkdown(item.title) || 'Untitled'}
              checked={item.isCompleted || false}
              onCheckedChange={(checked) => onToggleComplete(item.id, checked as boolean)}
              className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground border-muted-foreground/50"
              disabled={isSelectionMode}
            />
          </div>
        )}

        <div className={cn("flex-1 min-w-0 min-h-[44px]", !item.plainTextContent && "flex items-center")}>
          <div className="flex items-center justify-between gap-1.5">
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
              <p className={cn("font-medium truncate transition-colors", activeId === item.id && !isSelectionMode ? "text-primary" : "text-foreground", item.isCompleted && "line-through opacity-70")}>
                {stripColorMarkdown(item.title) || 'Untitled'}
              </p>
            </div>
          </div>
          {item.plainTextContent && (
            <div className="flex justify-between items-center mt-1 min-w-0 overflow-hidden">
              <p className="text-xs text-muted-foreground truncate flex-1 pr-2 overflow-hidden">{item.plainTextContent}</p>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {new Date(item.updatedAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        {/* Restore view actions only - normal delete uses selection mode */}
        {!isSelectionMode && isTrash && (
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" aria-label={`Restore ${stripColorMarkdown(item.title) || 'Untitled'}`} className="h-8 w-8 text-primary" onClick={(e) => { e.stopPropagation(); onRestoreItem?.(item.id); }}>
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label={`Delete ${stripColorMarkdown(item.title) || 'Untitled'}`} className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); onPermanentDeleteItem?.(item.id); }}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// emojis is imported from tiptap-editor.tsx

// Sortable Group Item Component for Left Sidebar
interface SortableGroupItemProps {
  group: Group;
  activeGroupId: string;
  hasNotes: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

const SortableGroupItem: React.FC<SortableGroupItemProps> = ({
  group, activeGroupId, hasNotes, onSelect, onDelete
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: group.id,
    disabled: group.id === 'inbox', // Inbox cannot be dragged
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
      className="relative group/list w-full"
    >
      <div {...(group.id !== 'inbox' ? { ...attributes, ...listeners } : {})}>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-2 h-9 pr-8",
            group.id === 'inbox' ?
              cn(
                activeGroupId === group.id ? "bg-[#E7A1B0]/15 text-foreground font-medium hover:bg-[#E7A1B0]/20" : "bg-[#64A364]/10 text-foreground hover:bg-[#64A364]/15"
              ) :
              activeGroupId === group.id
                ? cn(
                  "bg-[#E7A1B0]/15 hover:bg-[#E7A1B0]/20",
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

      {/* Delete button on hover (except inbox) */}
      {group.id !== 'inbox' && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover/list:opacity-100 transition-opacity"
          onClick={(e) => { e.stopPropagation(); onDelete(group.id); }}
        >
          <Trash2 className="w-3 h-3 text-destructive" />
        </Button>
      )}
    </div>
  );
};

const HomeSection: React.FC<HomeSectionProps> = ({
  title, icon: Icon, items, onItemSelect, activeId, onReorderNotes, itemType,
  sortOption, onSortChange, viewMode,
  onDeleteItem, onRestoreItem, onPermanentDeleteItem, onToggleComplete, isTrash,
  scrollDirection, isVisible = true,
  isSelectionMode, onToggleSelectionMode, selectedIds, onToggleSelect, onBulkDelete, onBulkMove,
  groups, onAddSeparator, onQuickAdd, onRestoreGroup, onPermanentDeleteGroup,
  onIconChange, leadingAction
}) => {
  const { t } = useLang();
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const sortableAreaRef = React.useRef<HTMLDivElement>(null);

  // dnd-kit setup
  const [activeDragId, setActiveDragId] = React.useState<string | null>(null);
  const canDragNotes = !isSelectionMode && !isTrash && sortOption === 'manual';

  // SortableContext範囲内に制限するカスタムモディファイア
  const restrictToSortableArea = React.useMemo(
    () => createRestrictToSortableArea(sortableAreaRef),
    []
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Start drag after 8px of movement
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
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

    const newOrder = arrayMove(items, oldIndex, newIndex);
    onReorderNotes(newOrder);
  };

  const activeDragItem = activeDragId ? items.find(item => item.id === activeDragId) : null;

  // Center column scroll based on scrollDirection
  React.useEffect(() => {
    if (!isVisible) return; // Only scroll when visible
    setTimeout(() => {
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          if (scrollDirection === 'bottom') {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
          } else {
            scrollContainer.scrollTop = 0;
          }
        }
      }
    }, 50);
  }, [scrollDirection, items.length, isVisible]);

  const deletedGroups = React.useMemo(() => {
    if (!isTrash) return [];
    return groups.filter(g => g.isDeleted);
  }, [isTrash, groups]);

  return (
    <Card className="h-full w-full border-none shadow-none bg-transparent flex flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between px-4 border-b bg-background/95 backdrop-blur z-20 sticky top-0 shrink-0 h-[57px]">
        <CardTitle className="text-lg flex items-center gap-2 min-w-0">
          {leadingAction}
          <Icon className="w-5 h-5 text-primary" />
          <span className="truncate">{title}</span>
        </CardTitle>
        <div className="flex items-center gap-1">
          {/* Selection Mode Actions */}
          {isSelectionMode ? (
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground mr-1">{selectedIds.size}{t.selected}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" disabled={selectedIds.size === 0} title="Move selected">
                    <FolderInput className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>{t.moveTo}</DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem onSelect={() => onBulkMove('inbox')}>{t.inbox}</DropdownMenuItem>
                        {groups.filter(g => g.id !== 'inbox' && !g.isDeleted).map(g => (
                          <DropdownMenuItem key={g.id} onSelect={() => onBulkMove(g.id)}>{g.name}</DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" disabled={selectedIds.size === 0} onClick={onBulkDelete} title="Delete selected">
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={onToggleSelectionMode} title="Cancel selection">
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
                title="Select items (Edit)"
              >
                <CheckSquare className="w-4 h-4" />
              </Button>
              {!isTrash && onAddSeparator && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={onAddSeparator} title="Add separator">
                  <Minus className="w-4 h-4" />
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Sort memos">
                    <ArrowDownUp className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onSelect={() => onSortChange('manual')}>{t.sortManual}</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onSortChange('newest')}>{t.sortNewest}</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onSortChange('oldest')}>{t.sortOldest}</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onSortChange('last-accessed')}>{t.sortLastAccessed}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </CardHeader>

      <div className="flex flex-col border-b z-10 sticky top-[57px]">
        {/* Quick Add Note Input */}
        {onQuickAdd && !isTrash && (
          <div className="px-2 py-1.5 shrink-0 border-b" style={{ backgroundColor: 'hsl(var(--accent) / 0.15)' }}>
            <div className="relative">
              <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.addMemo}
                className="pl-9 h-8 bg-background focus-visible:bg-background transition-colors border-none shadow-none text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const target = e.currentTarget;
                    if (target.value.trim()) {
                      onQuickAdd(target.value.trim());
                      target.value = '';
                    }
                  }
                }}
              />
            </div>
          </div>
        )}

      </div>

      <CardContent className="flex-1 p-0 overflow-hidden relative min-h-0 w-full flex flex-col">
        <ScrollArea className="flex-1 w-full" ref={scrollAreaRef}>
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
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-primary bg-background/50 hover:bg-background" onClick={() => onRestoreGroup?.(group.id)} title="Restore Tray">
                            <RotateCcw className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive bg-background/50 hover:bg-background" onClick={() => onPermanentDeleteGroup?.(group.id)} title="Delete Forever">
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

                  {/* Protected notes - always at top, not sortable */}
                  {items.filter(item => item.isProtected).map((item) => (
                    <div key={item.id} className="relative mb-2 w-full">
                      <div
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer group hover:shadow-md min-w-0 overflow-hidden",
                          activeId === item.id && !isSelectionMode
                            ? "bg-[#E7A1B0]/10 border-[#E7A1B0]/50 shadow-sm"
                            : "bg-[#64A364]/10 border-[#64A364]/30 hover:border-[#64A364]/50"
                        )}
                        onClick={() => onItemSelect(item.id, itemType)}
                      >
                        {!isTrash && onToggleComplete && (
                          <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              aria-label={stripColorMarkdown(item.title) || 'Untitled'}
                              checked={item.isCompleted || false}
                              onCheckedChange={(checked) => onToggleComplete(item.id, checked as boolean)}
                              className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground border-muted-foreground/50"
                            />
                          </div>
                        )}
                        <div className={cn("flex-1 min-w-0 min-h-[44px]", !item.plainTextContent && "flex items-center")}>
                          <div className="flex items-center gap-1.5 min-w-0 flex-1 translate-x-[-4px]">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-base pointer-events-none shrink-0">
                              {item.icon || '📝'}
                            </Button>
                            <p className={cn("font-medium truncate transition-colors", activeId === item.id && !isSelectionMode ? "text-primary" : "text-foreground")}>
                              {stripColorMarkdown(item.title) || 'Untitled'}
                            </p>
                          </div>
                          {item.plainTextContent && (
                            <div className="flex justify-between items-center mt-1 min-w-0 overflow-hidden">
                              <p className="text-xs text-muted-foreground truncate flex-1 pr-2 overflow-hidden">{item.plainTextContent}</p>
                              <span className="text-[10px] text-muted-foreground shrink-0">{new Date(item.updatedAt).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Non-protected notes - sortable */}
                  <div ref={sortableAreaRef}>
                    <SortableContext
                      items={items.filter(item => !item.isProtected).map(item => item.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {items.filter(item => !item.isProtected).map((item) => (
                        <SortableNoteItem
                          key={item.id}
                          item={item}
                          activeId={activeId}
                          isSelectionMode={isSelectionMode}
                          selectedIds={selectedIds}
                          isTrash={isTrash}
                          canDrag={canDragNotes}
                          onToggleSelect={onToggleSelect}
                          onItemSelect={(id) => onItemSelect(id, itemType)}
                          onToggleComplete={onToggleComplete}
                          onDeleteItem={onDeleteItem}
                          onRestoreItem={onRestoreItem}
                          onPermanentDeleteItem={onPermanentDeleteItem}
                          onIconChange={onIconChange}
                        />
                      ))}
                    </SortableContext>
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
                        <p className="font-medium truncate">{stripColorMarkdown(activeDragItem.title) || 'Untitled'}</p>
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
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-primary bg-background/50 hover:bg-background" onClick={() => onRestoreGroup?.(group.id)} title="Restore Tray">
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive bg-background/50 hover:bg-background" onClick={() => onPermanentDeleteGroup?.(group.id)} title="Delete Forever">
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
                          <Button variant="secondary" size="icon" className="h-7 w-7 bg-background/80" onClick={(e) => { e.stopPropagation(); onRestoreItem?.(item.id); }}>
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
                        <p className="text-sm truncate font-medium">{stripColorMarkdown(item.title) || 'Untitled'}</p>
                      </CardFooter>
                    </Card>
                  )
                ))}
              </div>
            )}
          </div>
        </ScrollArea >

      </CardContent >
    </Card >
  )
};


export default function Home() {
  const { t: appT } = useLang();

  const [notes, setNotes] = React.useState<Note[]>(initialNotes);
  const [groups, setGroups] = React.useState<Group[]>(initialGroups);

  // Dynamic key replacement for Quick Reference (Cmd/Ctrl)
  React.useEffect(() => {
    const isMac = typeof navigator !== 'undefined' ? /Mac|iPod|iPhone|iPad/.test(navigator.platform) : false;
    const modKey = isMac ? 'Cmd' : 'Ctrl';

    setNotes(prev => prev.map(note => {
      const hasPlaceholder = note.content.includes('{{Mod}}') || (note.plainTextContent && note.plainTextContent.includes('{{Mod}}'));

      if (hasPlaceholder) {
        return {
          ...note,
          content: note.content.replace(/{{Mod}}/g, modKey),
          plainTextContent: note.plainTextContent ? note.plainTextContent.replace(/{{Mod}}/g, modKey) : undefined
        };
      }
      return note;
    }));
  }, []);

  // Keep protected seed notes in sync with latest template.
  // This avoids stale malformed HTML remaining during HMR/dev sessions.
  React.useEffect(() => {
    const protectedSeedMap = new Map(
      initialNotes
        .filter((n) => n.id === 'note-1' || n.id === 'note-2')
        .map((n) => [n.id, n])
    );

    setNotes((prev) =>
      prev.map((note) => {
        const seed = protectedSeedMap.get(note.id);
        if (!seed || !note.isProtected) return note;
        return {
          ...note,
          title: seed.title,
          icon: seed.icon,
          content: seed.content,
          plainTextContent: seed.plainTextContent,
        };
      })
    );
  }, []);

  // Initialize with 'Welcome to Drafta' note (note-1)
  const [openTabs, setOpenTabs] = React.useState<OpenTab[]>(
    initialNotes.length > 0 ? [{ id: initialNotes[0].id, type: 'note' as const }] : []
  );

  const [activeView, setActiveView] = React.useState<'home' | 'editor'>('home');

  const [activeTabId, setActiveTabId] = React.useState<string | null>(
    initialNotes.length > 0 ? initialNotes[0].id : null
  );

  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);

  const [noteSort, setNoteSort] = React.useState<SortOption>('manual');
  const [noteViewMode] = React.useState<ViewMode>('list');
  const [activeGroupId, setActiveGroupId] = React.useState<string>('inbox');
  const [scrollDirection, setScrollDirection] = React.useState<'top' | 'bottom'>('bottom');

  // Column Layout - Desktop keeps the 3-pane ratio. Narrow screens use adaptive navigation.
  const MIN_LEFT_WIDTH = 140;
  const MIN_CENTER_WIDTH = 280;

  const [listsWidth, setListsWidth] = React.useState(180);
  const [notesWidth, setNotesWidth] = React.useState(400);
  const [editorWidth, setEditorWidth] = React.useState(400);
  const [layoutMode, setLayoutMode] = React.useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [mobilePane, setMobilePane] = React.useState<'trays' | 'notes' | 'editor'>('notes');
  const [isTrayDrawerOpen, setIsTrayDrawerOpen] = React.useState(false);

  React.useLayoutEffect(() => {
    const updateLayout = () => {
      const viewportWidth = window.innerWidth;
      const nextMode = viewportWidth < 768 ? 'mobile' : viewportWidth < 1280 ? 'tablet' : 'desktop';
      setLayoutMode(nextMode);

      if (nextMode === 'desktop') {
        // 1.7:3.4:6.9 = 12 parts total (right column remains widest for the editor toolbar).
        setListsWidth(Math.max(MIN_LEFT_WIDTH, Math.floor(viewportWidth * (1.7 / 12))));
        setNotesWidth(Math.max(MIN_CENTER_WIDTH, Math.floor(viewportWidth * (3.4 / 12))));
        setEditorWidth(Math.floor(viewportWidth * (6.9 / 12)));
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
  const [selectedNoteIds, setSelectedNoteIds] = React.useState<Set<string>>(new Set());

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
  const groupSortableAreaRef = React.useRef<HTMLDivElement>(null);

  // SortableContext範囲内に制限するカスタムモディファイア（グループ用）
  const restrictToGroupSortableArea = React.useMemo(
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
    if (id === 'inbox') return; // Inbox cannot be dragged
    setActiveDragGroupId(id);
  };

  const handleGroupDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragGroupId(null);

    if (!over || active.id === over.id) return;
    if (active.id === 'inbox') return; // Inbox cannot be moved

    setGroups(prev => {
      const oldIndex = prev.findIndex(g => g.id === active.id);
      const newIndex = prev.findIndex(g => g.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return prev;

      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const activeDragGroup = activeDragGroupId ? groups.find(g => g.id === activeDragGroupId) : null;


  const listScrollAreaRef = React.useRef<HTMLDivElement>(null);

  // Left column (Lists Sidebar) scroll based on scrollDirection
  React.useEffect(() => {
    if (activeView !== 'home') return; // Only scroll when home view is active
    setTimeout(() => {
      if (listScrollAreaRef.current) {
        const scrollContainer = listScrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          if (scrollDirection === 'bottom') {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
          } else {
            scrollContainer.scrollTop = 0;
          }
        }
      }
    }, 50);
  }, [scrollDirection, groups.length, activeView]);

  const activeNote = activeTabId ? notes.find((note) => note.id === activeTabId) ?? null : null;

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

  const handleNoteUpdate = React.useCallback((updatedNote: Partial<Note> & { content?: string }) => {
    if (!activeTabId) return;
    setNotes(notes => notes.map(note => {
      if (note.id === activeTabId) {
        const newNote = { ...note, ...updatedNote, updatedAt: new Date().toISOString() };
        if (updatedNote.content !== undefined) {
          newNote.plainTextContent = htmlToSimpleText(updatedNote.content);
        }
        return newNote;
      }
      return note;
    }));
  }, [activeTabId]);

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

  const handleNewNote = () => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: '',
      icon: '📝',
      content: '',
      plainTextContent: '',
      group: activeGroupId,
      stars: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
    };
    // Add to top or bottom based on scrollDirection
    setNotes(prev => {
      if (scrollDirection === 'top') {
        // Find first note in current group and insert before it
        const firstGroupIndex = prev.findIndex(n => n.group === activeGroupId);
        if (firstGroupIndex === -1) return [...prev, newNote];
        const result = [...prev];
        result.splice(firstGroupIndex, 0, newNote);
        return result;
      }
      return [...prev, newNote];
    });
    openTab(newNote.id, 'note'); // Ensure it opens a tab
    addToHistory(newNote);
    if (layoutMode === 'mobile') setMobilePane('editor');
  };

  const handleAddSeparator = () => {
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
    setScrollDirection('bottom'); // Might need to adjust scrolling if inserted in middle
  };

  const handleQuickCreateNote = (title: string) => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: title,
      icon: '📝',
      content: '',
      plainTextContent: '',
      group: activeGroupId,
      stars: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
    };
    // Add to top or bottom based on scrollDirection
    setNotes(prev => {
      if (scrollDirection === 'top') {
        // Find first note in current group and insert before it
        const firstGroupIndex = prev.findIndex(n => n.group === activeGroupId);
        if (firstGroupIndex === -1) return [...prev, newNote];
        const result = [...prev];
        result.splice(firstGroupIndex, 0, newNote);
        return result;
      }
      return [...prev, newNote];
    });
    handleNoteSelect(newNote.id); // Auto-open/select the new note
  };

  const handleNoteSelect = React.useCallback((id: string) => {
    setNotes(prevNotes => {
      return prevNotes.map(n => n.id === id ? { ...n, lastAccessedAt: new Date().toISOString() } : n);
    });
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
    if (activeTabId === id) setActiveTabId(null);
  };
  const handleRestoreNote = (id: string) => {
    setNotes(prev => prev.map(note => note.id === id ? { ...note, isDeleted: false } : note));
  };
  const handlePermanentDeleteNote = (id: string) => {
    const note = notes.find(n => n.id === id);
    if (note?.isProtected) return; // Protect special notes
    setNotes(prev => prev.filter(note => note.id !== id));
    if (activeTabId === id) setActiveTabId(null);
    closeTab(id);
  };

  const handleAddGroupSeparator = () => {
    const newSeparator: Group = { id: `sep-${Date.now()}`, name: '', type: 'separator' };
    setGroups(prev => {
      // If there's an active group, insert after it
      // Note: activeGroupId could be 'inbox', 'trash' etc. We only insert relative to actual groups in the array
      // But typically we want to insert after the *selected* one if it exists in the list.
      if (activeGroupId && activeGroupId !== 'inbox' && activeGroupId !== 'starred' && activeGroupId !== 'trash') {
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
    const newGroup: Group = { id: `group-${Date.now()}`, name: name, type: 'group' };
    // Add to top or bottom based on scrollDirection
    setGroups(prev => {
      if (scrollDirection === 'top') {
        // Insert after inbox (index 0)
        const result = [...prev];
        result.splice(1, 0, newGroup);
        return result;
      }
      return [...prev, newGroup];
    });
    setActiveGroupId(newGroup.id); // Auto-switch to new group
  };

  const [groupSort, setGroupSort] = React.useState<'manual' | 'name' | 'newest'>('manual');

  const filteredGroups = React.useMemo(() => {
    const items = groups.filter(g => !g.isDeleted);

    // Separate Inbox from other groups
    const inbox = items.find(g => g.id === 'inbox');
    const others = items.filter(g => g.id !== 'inbox');

    // Sort only non-inbox items
    if (groupSort === 'name') {
      others.sort((a, b) => a.name.localeCompare(b.name));
    } else if (groupSort === 'newest') {
      // Assuming ID has timestamp
      others.sort((a, b) => {
        const timeA = parseInt(a.id.split('-')[1] || '0') || 0;
        const timeB = parseInt(b.id.split('-')[1] || '0') || 0;
        return timeB - timeA;
      });
    }

    // Always keep Inbox at top
    return inbox ? [inbox, ...others] : others;
  }, [groups, groupSort]);

  const handleDeleteGroup = (id: string) => {
    if (id === 'inbox') return;
    setGroups(prev => prev.map(g => g.id === id ? { ...g, isDeleted: true } : g));
    if (activeGroupId === id) setActiveGroupId('inbox');
  };
  const handleRestoreGroup = (id: string) => setGroups(prev => prev.map(g => g.id === id ? { ...g, isDeleted: false } : g));
  const handlePermanentDeleteGroup = (id: string) => {
    setNotes(prev => prev.filter(note => note.group !== id));
    setGroups(prev => prev.filter(g => g.id !== id));
  };

  const handleIconChange = React.useCallback((id: string, icon: string) => {
    setNotes(prevNotes => prevNotes.map(note => note.id === id ? { ...note, icon } : note));
  }, []);

  const handleToggleView = React.useCallback(() => {
    setActiveView(prev => prev === 'home' ? 'editor' : 'home');
  }, []);

  const sortedNotes = React.useMemo(() => {
    let items = getSortedItems(notes, noteSort);
    if (activeGroupId === 'restore') {
      items = items.filter(note => note.isDeleted);
    } else {
      items = items.filter(note => note.group === activeGroupId && !note.isDeleted);
    }
    return items;
  }, [notes, noteSort, activeGroupId]);


  return (
    <>
      <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
        <Header
          onToggleView={handleToggleView}
          activeView={activeView}
          onNewNote={handleNewNote}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenSearch={() => setIsSearchOpen(true)}
          history={history}
          onHistorySelect={handleNoteSelect}
        />

        <div role="main" className="flex flex-1 overflow-hidden relative min-h-0">

          {layoutMode === 'tablet' && isTrayDrawerOpen && activeView === 'home' && (
            <button
              type="button"
              aria-label="Close trays"
              className="absolute inset-0 z-30 bg-black/20"
              onClick={() => setIsTrayDrawerOpen(false)}
            />
          )}

          {/* PANE 0: VERTICAL TABS (Only in Writing Mode) */}
          {activeView === 'editor' && layoutMode !== 'mobile' && openTabDetails.length > 0 && (
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
              "flex-col border-r bg-secondary/30 min-h-0",
              activeView !== 'home' && "hidden",
              activeView === 'home' && layoutMode === 'desktop' && "flex relative shrink-0",
              activeView === 'home' && layoutMode === 'tablet' && cn(
                "flex absolute inset-y-0 left-0 z-40 w-[min(20rem,85vw)] shadow-xl transition-transform duration-200",
                isTrayDrawerOpen ? "translate-x-0" : "-translate-x-full"
              ),
              activeView === 'home' && layoutMode === 'mobile' && (mobilePane === 'trays' ? "flex relative w-full" : "hidden")
            )}
            style={layoutMode === 'desktop' ? { width: listsWidth } : undefined}
          >
              {/* Header for Lists */}
              <div className="flex items-center justify-between px-3 sm:px-4 border-b bg-background/95 backdrop-blur sticky top-0 z-20 shrink-0 h-[57px]">
                <div className="flex items-center gap-1 min-w-0">
                  {layoutMode !== 'desktop' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 shrink-0"
                      title="Back to memos"
                      aria-label="Back to memos"
                      onClick={() => layoutMode === 'mobile' ? setMobilePane('notes') : setIsTrayDrawerOpen(false)}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                  )}
                  <h2 className="text-lg font-semibold truncate">{appT.trays}</h2>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={handleAddGroupSeparator} title="Add separator">
                    <Minus className="w-4 h-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Sort trays">
                        <ArrowDownUp className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onSelect={() => setGroupSort('manual')}>{appT.sortManual}</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setGroupSort('name')}>{appT.sortNameAZ}</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setGroupSort('newest')}>{appT.sortNewest}</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Quick Add List Input */}
              <div className="px-2 py-1.5 border-b shrink-0" style={{ backgroundColor: 'hsl(var(--accent) / 0.15)' }}>
                <div className="relative">
                  <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={appT.addTray}
                    className="pl-9 h-8 bg-background focus-visible:bg-background transition-colors border-none shadow-none text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const target = e.currentTarget;
                        if (target.value.trim()) {
                          handleCreateGroup(target.value.trim());
                          target.value = '';
                        }
                      }
                    }}
                  />
                </div>
              </div>

              {/* Inbox - fixed at top, outside ScrollArea */}
              <div className="px-4 pt-2 shrink-0">
                {filteredGroups.filter(g => g.id === 'inbox').map(group => (
                  <div key={group.id} className="relative group/list w-full">
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-2 h-9 pr-8",
                        activeGroupId === group.id ? "bg-[#E7A1B0]/15 text-foreground font-medium hover:bg-[#E7A1B0]/20" : "bg-[#64A364]/10 text-foreground hover:bg-[#64A364]/15"
                      )}
                      onClick={() => handleGroupSelect(group.id)}
                    >
                      <Inbox className="w-4 h-4" />
                      <span className="truncate">{group.name}</span>
                    </Button>
                  </div>
                ))}
              </div>

              <ScrollArea className="flex-1 px-4" ref={listScrollAreaRef}>
                <div className="w-full max-w-full overflow-hidden">
                  <DndContext
                    id="groups-dnd"
                    sensors={groupSensors}
                    collisionDetection={closestCenter}
                    modifiers={[restrictToVerticalAxis, restrictToGroupSortableArea]}
                    onDragStart={handleGroupDragStart}
                    onDragEnd={handleGroupDragEnd}
                  >
                    <div className="flex flex-col gap-0 pb-2">
                      {/* Other groups - sortable */}
                      <div ref={groupSortableAreaRef}>
                        <SortableContext
                          items={filteredGroups.filter(g => g.id !== 'inbox').map(g => g.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {filteredGroups.filter(g => g.id !== 'inbox').map(group => {
                            const hasNotes = notes.some(n => n.group === group.id && !n.isDeleted);
                            return (
                              <SortableGroupItem
                                key={group.id}
                                group={group}
                                activeGroupId={activeGroupId}
                                hasNotes={hasNotes}
                                onSelect={handleGroupSelect}
                                onDelete={handleDeleteGroup}
                              />
                            );
                          })}
                        </SortableContext>
                      </div>

                      <div className="pt-2 mt-2 border-t">
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-start gap-2 h-9",
                            activeGroupId === 'restore' && "bg-primary/10 text-primary hover:bg-primary/20"
                          )}
                          onClick={() => handleGroupSelect('restore')}
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>{appT.restore}</span>
                        </Button>
                      </div>
                    </div>
                    <DragOverlay>
                      {activeDragGroup && (
                        <div
                          className="opacity-90 shadow-2xl border-2 border-primary bg-card rounded-md flex items-center justify-start gap-2 h-9 px-4"
                          style={{ width: listsWidth - 32 }}
                        >
                          <Inbox className="w-4 h-4" />
                          <span className="font-medium truncate">{activeDragGroup.name}</span>
                        </div>
                      )}
                    </DragOverlay>
                  </DndContext>
                </div>
              </ScrollArea>
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
              activeView !== 'home' && "hidden",
              activeView === 'home' && layoutMode === 'desktop' && "flex shrink-0",
              activeView === 'home' && layoutMode === 'tablet' && "flex shrink-0 w-[clamp(18rem,38vw,24rem)]",
              activeView === 'home' && layoutMode === 'mobile' && (mobilePane === 'notes' ? "flex w-full" : "hidden")
            )}
            style={layoutMode === 'desktop' ? { width: activeView === 'home' ? notesWidth : '100%' } : undefined}
          >

            <HomeSection
              title={activeGroupId === 'restore' ? appT.restore : groups.find(g => g.id === activeGroupId)?.name || appT.inbox}
              icon={activeGroupId === 'restore' ? RotateCcw : Inbox}
              items={sortedNotes}
              onItemSelect={handleNoteSelect}
              activeId={activeTabId}
              onReorderNotes={handleReorderNotes}
              itemType="note"
              sortOption={noteSort}
              onSortChange={setNoteSort}
              viewMode={noteViewMode}
              onDeleteItem={handleDeleteNote}
              onToggleComplete={handleToggleComplete}
              onRestoreItem={handleRestoreNote}
              onPermanentDeleteItem={(id) => confirmPermanentDelete(id, 'note')}
              isTrash={activeGroupId === 'restore'}
              scrollDirection={scrollDirection}
              isVisible={activeView === 'home'}

              isSelectionMode={isSelectionMode}
              onToggleSelectionMode={handleToggleSelectionMode}
              selectedIds={selectedNoteIds}
              onToggleSelect={handleToggleSelect}
              onBulkDelete={handleBulkDelete}
              onBulkMove={handleBulkMove}
              onRestoreGroup={handleRestoreGroup}
              onPermanentDeleteGroup={(id) => confirmPermanentDelete(id, 'group')}

              groups={groups}
              onAddSeparator={handleAddSeparator}
              onQuickAdd={handleQuickCreateNote}
              onIconChange={handleIconChange}
              leadingAction={layoutMode !== 'desktop' ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  title="Open trays"
                  aria-label="Open trays"
                  onClick={() => layoutMode === 'mobile' ? setMobilePane('trays') : setIsTrayDrawerOpen(true)}
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
              activeView === 'editor' && "flex flex-1",
              activeView === 'home' && layoutMode === 'desktop' && "flex shrink-0",
              activeView === 'home' && layoutMode === 'tablet' && "flex flex-1",
              activeView === 'home' && layoutMode === 'mobile' && (mobilePane === 'editor' ? "flex w-full" : "hidden")
            )}
            style={layoutMode === 'desktop'
              ? (activeView === 'editor' ? { minWidth: editorWidth } : { width: editorWidth })
              : undefined
            }
          >
            {activeNote ? (
              <Editor
                note={activeNote}
                onNoteUpdate={handleNoteUpdate}
                 onIconChange={(id, icon) => handleIconChange(id, icon)}
                 scrollDirection={scrollDirection}
                 navigationAction={layoutMode === 'mobile' && activeView === 'home' ? (
                   <Button
                     variant="ghost"
                     size="icon"
                     className="h-10 w-10 shrink-0"
                     title="Back to memos"
                     aria-label="Back to memos"
                     onClick={() => setMobilePane('notes')}
                   >
                     <ChevronLeft className="w-5 h-5" />
                   </Button>
                 ) : undefined}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center relative">
                <div className="absolute top-0 left-0 right-0 h-[57px] border-b bg-background/50" />
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Inbox className="w-8 h-8 opacity-20" />
                </div>
                <h3 className="text-xl font-medium text-foreground mb-2">{appT.noActiveMemo}</h3>
                <p className="max-w-xs">{appT.noActiveMemoDesc}</p>
                <Button variant="outline" className="mt-6" onClick={handleNewNote}>
                  <Plus className="w-4 h-4 mr-2" />
                  {appT.createNewMemo}
                </Button>
              </div>
            )}
          </div>
        </div >

        <SettingsDialog
          open={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          scrollDirection={scrollDirection}
          onScrollDirectionChange={setScrollDirection}
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
