"use client";

import * as React from 'react';
import Image from 'next/image';
import { Minus, List, LayoutGrid, ArrowDownUp, Inbox, Search, Trash2, RotateCcw, Plus, MoreHorizontal, FolderInput, CheckSquare, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import Header from '@/components/header';
import VerticalTabs from '@/components/vertical-note-tabs';
import Editor from '@/components/editor';
import type { Note, Group, HistoryItem, OpenTab } from '@/lib/types';
import { notes as initialNotes, groups as initialGroups } from '@/lib/data';
import { cn, htmlToSimpleText } from '@/lib/utils';
import SettingsDialog from '@/components/settings-dialog';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal } from '@/components/ui/dropdown-menu';
import { CreateListDialog } from '@/components/create-list-dialog';


type SortOption = 'manual' | 'newest' | 'oldest' | 'last-accessed';
type ViewMode = 'list' | 'grid';

const getSortedItems = (
  items: Note[],
  sortOption: SortOption,
  openTabsForType: OpenTab[]
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
  onReorder: (draggedId: string, targetId: string, position: 'before' | 'after') => void;
  itemType: 'note';
  sortOption: SortOption;
  onSortChange: (sortOption: SortOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (viewMode: ViewMode) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onDeleteItem: (id: string) => void;
  onRestoreItem?: (id: string) => void;
  onPermanentDeleteItem?: (id: string) => void;
  onToggleComplete?: (id: string, isCompleted: boolean) => void;
  isTrash?: boolean;
  scrollDirection: 'top' | 'bottom';

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
  onMoveNote: (noteId: string, targetGroupId: string) => void;
  onAddSeparator?: () => void;
  onQuickAdd?: (title: string) => void;
}

const HomeSection: React.FC<HomeSectionProps> = ({
  title, icon: Icon, items, onItemSelect, activeId, onReorder, itemType,
  sortOption, onSortChange, viewMode, onViewModeChange,
  searchTerm, onSearchChange, onDeleteItem, onRestoreItem, onPermanentDeleteItem, onToggleComplete, isTrash,
  scrollDirection,
  isSelectionMode, onToggleSelectionMode, selectedIds, onToggleSelect, onBulkDelete, onBulkMove,
  groups, onMoveNote, onAddSeparator, onQuickAdd, onRestoreGroup, onPermanentDeleteGroup
}) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const topScrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setTimeout(() => {
      if (scrollDirection === 'bottom' && scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: 'instant', block: 'end' });
      } else if (scrollDirection === 'top' && topScrollRef.current) {
        topScrollRef.current.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }, 50);
  }, [scrollDirection, items.length]);

  const deletedGroups = React.useMemo(() => {
    if (!isTrash) return [];
    return groups.filter(g => g.isDeleted);
  }, [isTrash, groups]);

  return (
    <Card className="h-full w-full border-none shadow-none bg-transparent flex flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between px-2 pt-2 pb-2 border-b bg-background/95 backdrop-blur z-20 sticky top-0 shrink-0">
        <CardTitle className="text-lg flex items-center gap-2">
          <Icon className="w-5 h-5 text-primary" />
          <span className="truncate">{title}</span>
        </CardTitle>
        <div className="flex items-center gap-1">
          {/* Selection Mode Actions */}
          {isSelectionMode ? (
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground mr-1">{selectedIds.size} Selected</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" disabled={selectedIds.size === 0} title="Move selected">
                    <FolderInput className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Move to...</DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem onSelect={() => onBulkMove('inbox')}>Inbox</DropdownMenuItem>
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
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Sort notes">
                    <ArrowDownUp className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onSelect={() => onSortChange('manual')}>Manual</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onSortChange('newest')}>Newest First</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onSortChange('oldest')}>Oldest First</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onSortChange('last-accessed')}>Last Accessed</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </CardHeader>

      <div className="flex flex-col border-b z-10 sticky top-[53px]">
        {/* Quick Add Note Input */}
        {onQuickAdd && !isTrash && (
          <div className="p-2 shrink-0 border-b" style={{ backgroundColor: 'hsl(var(--accent) / 0.15)' }}>
            <div className="relative">
              <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Add note"
                className="pl-9 h-9 bg-background focus-visible:bg-background transition-colors border-none shadow-none"
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

        {/* Search Input */}
        <div className="p-2 bg-muted/40 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search in "${title}"`}
              className="pl-9 h-9 bg-background border-none shadow-none"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>
      </div>

      <CardContent className="flex-1 p-0 overflow-hidden relative min-h-0 w-full flex flex-col">
        <ScrollArea className="flex-1 w-full">
          <div className="w-full max-w-full overflow-hidden">
            <div ref={topScrollRef} />

            {/* Combined List for Trash View (Groups + Notes) or Just Notes */}
            <div className={cn("grid gap-2 pb-10 p-2", viewMode === 'grid' ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1")}>
              {/* Render Deleted Groups as Items if isTrash */}
              {isTrash && deletedGroups.map(group => (
                <Card key={group.id} className={cn(
                  "group relative overflow-hidden border border-border/60 transition-colors hover:bg-accent/40",
                  "bg-accent/30" // Distinct background as requested
                )}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 rounded-md bg-background/50 flex items-center justify-center shrink-0">
                        <Inbox className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="truncate font-semibold text-sm">{group.name}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">Tray</span>
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
                  <p>No items found</p>
                </div>
              )}

              {/* Render Notes */}
              {items.map((item) => (
                item.type === 'separator' ? (
                  <div
                    key={item.id}
                    className={cn(
                      "group relative w-full flex items-center px-0 py-2 transition-all mx-[-8px] width-[calc(100%+16px)]",
                      isSelectionMode && selectedIds.has(item.id) ? "bg-primary/10" : ""
                    )}
                    onClick={() => isSelectionMode && onToggleSelect(item.id)}
                  >
                    <div className="w-8 flex justify-center shrink-0">
                      {isSelectionMode && (
                        <Checkbox
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
                          className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  viewMode === 'list' ? (
                    <div key={item.id} className="relative mb-2 w-full">
                      <div
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer group hover:shadow-md min-w-0 overflow-hidden",
                          activeId === item.id && !isSelectionMode
                            ? "bg-accent/10 border-accent/50 shadow-sm"
                            : "bg-card border-border/60 hover:border-primary/30",
                          isSelectionMode && selectedIds.has(item.id) ? "ring-2 ring-primary bg-primary/5" : ""
                        )}
                        onClick={() => {
                          if (isSelectionMode) {
                            onToggleSelect(item.id);
                          } else {
                            onItemSelect(item.id, itemType);
                          }
                        }}
                      >
                        {/* Selection Checkbox (Only if needed or relying on whole row) - User said: Button to toggle selection mode, then clicking item selects it. */}
                        {/* Let's keep the isCompleted checkbox VISIBLE even in selection mode, or maybe specific per requirements? */}
                        {/* User: "Button toggles mode", "Select item -> color changes" */}

                        {!isTrash && onToggleComplete && (
                          <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={item.isCompleted || false}
                              onCheckedChange={(checked) => onToggleComplete(item.id, checked as boolean)}
                              className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground border-muted-foreground/50"
                              disabled={isSelectionMode} // Maybe disable completion toggle while selecting to avoid confusion? Or allow both? Let's allow both but careful.
                            />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <p className={cn("font-medium truncate transition-colors", activeId === item.id && !isSelectionMode ? "text-primary" : "text-foreground", item.isCompleted && "line-through opacity-70")}>
                            {item.title || 'Untitled'}
                          </p>
                          <div className="flex justify-between items-center mt-1 min-w-0 overflow-hidden">
                            <p className="text-xs text-muted-foreground truncate flex-1 pr-2 overflow-hidden">{item.plainTextContent || 'No content'}</p>
                            <span className="text-[10px] text-muted-foreground/70 shrink-0">
                              {new Date(item.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Always visible on desktop now, to fix "can't see" issue. Optional: restore opacity logic if requested. */}
                        <div className="flex items-center gap-1 shrink-0">
                          {!isSelectionMode && (
                            isTrash && (
                              <>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={(e) => { e.stopPropagation(); onRestoreItem?.(item.id); }}>
                                  <RotateCcw className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); onPermanentDeleteItem?.(item.id); }}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
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
                        <p className="text-sm truncate font-medium">{item.title || 'Untitled'}</p>
                      </CardFooter>
                    </Card>
                  )
                )
              ))}
              <div ref={scrollRef} />
            </div>
          </div>
        </ScrollArea >

      </CardContent >
    </Card >
  )
};


export default function Home() {
  const [notes, setNotes] = React.useState<Note[]>(initialNotes);
  const [groups, setGroups] = React.useState<Group[]>(initialGroups);

  // Initialize with 'Welcome to Drafta' note (note-1)
  const [openTabs, setOpenTabs] = React.useState<OpenTab[]>(
    initialNotes.length > 0 ? [{ id: initialNotes[0].id, type: 'note' as const }] : []
  );

  const [activeView, setActiveView] = React.useState<'home' | 'editor'>('home');

  const [activeTabId, setActiveTabId] = React.useState<string | null>(
    initialNotes.length > 0 ? initialNotes[0].id : null
  );

  const [lastActiveTab, setLastActiveTab] = React.useState<OpenTab | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isCreateListOpen, setIsCreateListOpen] = React.useState(false);

  const [noteSort, setNoteSort] = React.useState<SortOption>('manual');
  const [noteViewMode, setNoteViewMode] = React.useState<ViewMode>('list');
  const [activeGroupId, setActiveGroupId] = React.useState<string>('inbox');
  const [scrollDirection, setScrollDirection] = React.useState<'top' | 'bottom'>('bottom');

  // Resizable Columns State
  const [listsWidth, setListsWidth] = React.useState(256);
  const [notesWidth, setNotesWidth] = React.useState(320);
  const [isResizingLists, setIsResizingLists] = React.useState(false);
  const [isResizingNotes, setIsResizingNotes] = React.useState(false);

  // Selection Mode State
  const [isSelectionMode, setIsSelectionMode] = React.useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = React.useState<Set<string>>(new Set());

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


  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLists) {
        setListsWidth(current => {
          const newWidth = e.clientX;
          if (newWidth < 150) return 150;
          if (newWidth > 400) return 400;
          return newWidth;
        });
      }
      if (isResizingNotes) {
        setNotesWidth(current => {
          // For the second column, we need to calculate width based on delta or absolute position minus first column
          // Assuming sidebar is visible
          // Actually, let's use movementX for simpler logic or clientX relative to sidebar end

          // Easiest is: newWidth = e.clientX - listsWidth
          // But we need to account for vertical tabs width if visible? No, vertical tabs are separate pane 0.
          // Let's assume standard layout: [VerticalTabs?] [Lists] [Notes] [Editor]

          // If vertical tabs are hidden (default home mode), left edge of Notes is listsWidth.
          // So newWidth = e.clientX - listsWidth.

          // If Vertical Tabs are visible (editor mode on desktop?), actually this layout is only for 'home' mode mostly.
          // In 'editor' mode, Lists and Notes are hidden (hidden md:flex logic is tricky).
          // Wait, logic says: 
          // PANE 1 (Lists): activeView === 'home' ? "flex" : "hidden"
          // PANE 2 (Notes): activeView === 'home' ? "flex" : "hidden"
          // PANE 3 (Editor): activeView === 'editor' ? "flex" : "hidden md:flex"

          // So in Home View Desktop: [Lists] [Notes] [Editor]
          // Vertical Tabs is NOT visible (Line 683: activeView === 'editor').

          const newWidth = e.clientX - listsWidth;
          if (newWidth < 200) return 200;
          if (newWidth > 600) return 600;
          return newWidth;
        });
      }
    };

    const handleMouseUp = () => {
      setIsResizingLists(false);
      setIsResizingNotes(false);
      document.body.style.cursor = 'default';
    };

    if (isResizingLists || isResizingNotes) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    };
  }, [isResizingLists, isResizingNotes, listsWidth]);

  const [homeSearchTerm, setHomeSearchTerm] = React.useState('');
  const [listsSearchTerm, setListsSearchTerm] = React.useState('');
  const [tabSearchTerm, setTabSearchTerm] = React.useState(''); // Added for VerticalTabs

  const [history, setHistory] = React.useState<HistoryItem[]>([]);

  // List DnD State
  const [draggedGroupId, setDraggedGroupId] = React.useState<string | null>(null);
  const [dropTargetGroupId, setDropTargetGroupId] = React.useState<string | null>(null);
  const [dropGroupPosition, setDropGroupPosition] = React.useState<'before' | 'after' | null>(null);

  // Note DnD removed for Selection Mode, but we need to keep `onMoveNote` for single moves if needed, 
  // or `handleMoveNoteToGroup` is used for single move in menu.
  // We removed `draggedNote` state usage in HomeSection.


  const listScrollRef = React.useRef<HTMLDivElement>(null);
  const listTopScrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setTimeout(() => {
      if (scrollDirection === 'bottom' && listScrollRef.current) {
        listScrollRef.current.scrollIntoView({ behavior: 'instant', block: 'end' });
      } else if (scrollDirection === 'top' && listTopScrollRef.current) {
        listTopScrollRef.current.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }, 50);
  }, [scrollDirection]);

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



  const addToHistory = (item: Note, type: 'note') => {
    setHistory(prev => {
      const newHistory: HistoryItem = {
        id: item.id,
        type: type,
        title: item.title,
        icon: item.icon,
        accessedAt: new Date().toISOString(),
      };
      const filtered = prev.filter(h => h.id !== item.id);
      return [newHistory, ...filtered].slice(0, 15);
    });
  };

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

  const openTab = (id: string, type: 'note') => {
    if (!openTabs.some(t => t.id === id)) {
      setOpenTabs(prev => [...prev, { id, type }]);
    }
    setActiveTabId(id);
    if (window.innerWidth < 768) {
      setActiveView('editor');
    }
  };

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
      title: 'Untitled Note',
      icon: '📝',
      content: '',
      plainTextContent: '',
      group: activeGroupId,
      stars: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
    };
    setNotes(prev => [...prev, newNote]);
    openTab(newNote.id, 'note'); // Ensure it opens a tab
    addToHistory(newNote, 'note');

    // On desktop, we stay on 'home' (3-pane) UNLESS we were already in 'editor' (Writing Mode). 
    if (window.innerWidth < 768) {
      setActiveView('editor');
    }
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
    setNotes(prev => [...prev, newNote]);
    handleNoteSelect(newNote.id); // Auto-open/select the new note
    setScrollDirection('bottom');
  };

  const handleNoteSelect = React.useCallback((id: string) => {
    setNotes(prevNotes => {
      return prevNotes.map(n => n.id === id ? { ...n, lastAccessedAt: new Date().toISOString() } : n);
    });
    const note = notes.find(n => n.id === id);
    if (note) {
      openTab(id, 'note'); // Ensure tab opens
      addToHistory(note, 'note');
    }
    if (window.innerWidth < 768) {
      setActiveView('editor');
    }
  }, [notes]);

  const handleHistorySelect = (id: string, type: 'note') => {
    handleNoteSelect(id);
  };

  const handleToggleComplete = (id: string, isCompleted: boolean) => {
    setNotes(prev => prev.map(note => note.id === id ? { ...note, isCompleted } : note));
  };


  // Note DnD Removed
  // const handleNoteDragStart = (e: React.DragEvent<HTMLDivElement>, item: Note) => { ... }
  // const handleReorderNotes = ...

  const handleMoveNoteToGroup = (noteId: string, targetGroupId: string) => {
    setNotes(prev => prev.map(note => note.id === noteId ? { ...note, group: targetGroupId } : note));
    // If we moved the active note out of view (and we are viewing that group), maybe we should switch group? 
    // Or just let it disappear. Let's let it disappear from current view.
  };

  // Group Drag Handlers (Sidebar)
  const handleGroupDragStart = (e: React.DragEvent, groupId: string) => {
    if (groupId === 'inbox') {
      e.preventDefault();
      return;
    }
    setDraggedGroupId(groupId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleGroupDragOver = (e: React.DragEvent, targetGroupId: string) => {
    e.preventDefault();

    // Case 1: Dragging a Note onto a Group - REMOVED for Selection Mode
    // if (draggedNote) { ... }

    // Case 2: Reordering Groups
    if (!draggedGroupId || draggedGroupId === targetGroupId || targetGroupId === 'inbox') return;
    const rect = e.currentTarget.getBoundingClientRect();
    if ((e.clientY - rect.top) < rect.height / 2) {
      setDropGroupPosition('before');
    } else {
      setDropGroupPosition('after');
    }
    setDropTargetGroupId(targetGroupId);
  };

  const handleGroupDragLeave = (e: React.DragEvent) => {
    // if (draggedNote) { setNoteDropTargetGroupId(null); }
    // Don't clear dropTargetGroupId immediately to avoid flickering with child elements
  };

  const handleGroupDrop = (e: React.DragEvent, targetGroupId: string) => {
    e.preventDefault();

    // Case 1: Dropping a Note - REMOVED
    // if (draggedNote) { ... }

    // Case 2: Dropping a Group (Reorder)
    if (draggedGroupId && dropTargetGroupId && dropGroupPosition) {
      handleReorderGroups(draggedGroupId, targetGroupId, dropGroupPosition);
    }
    setDraggedGroupId(null);
    setDropTargetGroupId(null);
    setDropGroupPosition(null);
  };

  const handleReorderGroups = (draggedId: string, targetId: string, position: 'before' | 'after') => {
    setGroups(prev => {
      const dIndex = prev.findIndex(g => g.id === draggedId);
      const items = [...prev];
      const [item] = items.splice(dIndex, 1);
      let newTIndex = items.findIndex(g => g.id === targetId);
      if (position === 'after') newTIndex++;
      items.splice(newTIndex, 0, item);
      return items;
    });
  };

  // Delete helpers
  const handleDeleteNote = (id: string) => {
    setNotes(prev => prev.map(note => note.id === id ? { ...note, isDeleted: true } : note));
    if (activeTabId === id) setActiveTabId(null);
  };
  const handleRestoreNote = (id: string) => {
    setNotes(prev => prev.map(note => note.id === id ? { ...note, isDeleted: false } : note));
  };
  const handlePermanentDeleteNote = (id: string) => {
    setNotes(prev => prev.filter(note => note.id !== id));
    if (activeTabId === id) setActiveTabId(null);
    closeTab(id);
  };

  const handleAddGroup = () => setIsCreateListOpen(true);
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
    setGroups(prev => [...prev, newGroup]);
    setActiveGroupId(newGroup.id); // Auto-switch to new group
  };

  const handleSortGroup = (option: 'manual' | 'name' | 'newest') => {
    // If manual, we don't change state, just use order.
    // If name or newest, we might want to store that preference.
    setGroupSort(option);
  };

  const [groupSort, setGroupSort] = React.useState<'manual' | 'name' | 'newest'>('manual');

  const filteredGroups = React.useMemo(() => {
    let items = groups.filter(g => {
      if (g.isDeleted) return false;
      if (listsSearchTerm && !g.name.toLowerCase().includes(listsSearchTerm.toLowerCase())) return false;
      return true;
    });

    // Sort items
    if (groupSort === 'name') {
      items.sort((a, b) => a.name.localeCompare(b.name));
    } else if (groupSort === 'newest') {
      // Assuming ID has timestamp
      items.sort((a, b) => {
        const timeA = parseInt(a.id.split('-')[1] || '0') || 0;
        const timeB = parseInt(b.id.split('-')[1] || '0') || 0;
        return timeB - timeA;
      });
    }

    return items;
  }, [groups, listsSearchTerm, groupSort]);

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
    let items = getSortedItems(notes, noteSort, []);
    if (activeGroupId === 'restore') {
      items = items.filter(note => note.isDeleted);
    } else {
      items = items.filter(note => note.group === activeGroupId && !note.isDeleted);
    }
    if (homeSearchTerm) {
      const lowerSearch = homeSearchTerm.toLowerCase();
      items = items.filter(note =>
        note.title.toLowerCase().includes(lowerSearch) ||
        (note.plainTextContent && note.plainTextContent.toLowerCase().includes(lowerSearch))
      );
    }
    return items;
  }, [notes, noteSort, homeSearchTerm, activeGroupId]);


  return (
    <>
      <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
        <Header
          onToggleView={handleToggleView}
          activeView={activeView}
          onNewNote={handleNewNote}
          onOpenSettings={() => setIsSettingsOpen(true)}
          history={history}
          onHistorySelect={handleHistorySelect}
        />

        <div className="flex flex-1 overflow-hidden relative">

          {/* PANE 0: VERTICAL TABS (Only in Writing Mode) */}
          {activeView === 'editor' && openTabDetails.length > 0 && (
            <VerticalTabs
              items={openTabDetails}
              activeId={activeTabId}
              onTabSelect={(id) => openTab(id, 'note')}
              onTabClose={closeTab}
              onReorderTabs={handleReorderTabs}
              searchTerm={tabSearchTerm}
              onSearchChange={setTabSearchTerm}
            />
          )}

          {/* PANE 1: LISTS SIDEBAR */}
          <div
            className={cn(
              "flex-col gap-4 border-r bg-secondary/30 relative shrink-0",
              activeView === 'home' ? "flex" : "hidden"
            )}
            style={{ width: activeView === 'home' ? listsWidth : '100%' }}
          >
            {/* Header for Lists */}
            <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur sticky top-0 z-20 shrink-0 h-[53px]">
              <h2 className="text-lg font-semibold">Box</h2>
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
                    <DropdownMenuItem onSelect={() => setGroupSort('manual')}>Manual</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setGroupSort('name')}>Name (A-Z)</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setGroupSort('newest')}>Newest First</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Quick Add List Input */}
            <div className="p-2 border-b shrink-0" style={{ backgroundColor: 'hsl(var(--accent) / 0.15)' }}>
              <div className="relative">
                <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Add tray"
                  className="pl-9 h-9 bg-background focus-visible:bg-background transition-colors border-none shadow-none"
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

            <div className="px-4 pb-2 border-b bg-muted/40 pt-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search trays"
                  className="pl-9 h-8 text-sm bg-background border-none shadow-none"
                  value={listsSearchTerm}
                  onChange={(e) => setListsSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <ScrollArea className="flex-1 px-4">
              <div ref={listTopScrollRef} />
              <ul className="space-y-1 py-2">
                {filteredGroups.map(group => (
                  <li
                    key={group.id}
                    className="relative group/list"
                    onDragOver={(e) => handleGroupDragOver(e, group.id)}
                    onDrop={(e) => handleGroupDrop(e, group.id)}
                    onDragLeave={handleGroupDragLeave}
                  >
                    {dropTargetGroupId === group.id && dropGroupPosition === 'before' && (
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary z-20 pointer-events-none" />
                    )}

                    {group.type === 'separator' ? (
                      <div
                        draggable
                        onDragStart={(e) => handleGroupDragStart(e, group.id)}
                        className={cn(
                          "relative w-full flex items-center px-0 py-2 transition-all group/separator mx-[-16px] width-[calc(100%+32px)]",
                          draggedGroupId === group.id ? "opacity-30" : "opacity-100",
                          dropTargetGroupId === group.id && "bg-secondary/50"
                        )}
                      >
                        <div className="w-8 flex justify-center shrink-0">
                        </div>
                        <div className="flex-1 h-px border-b-2 border-dotted border-gray-400/50" />
                        <div className="w-8 flex justify-center shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive opacity-0 group-hover/separator:opacity-100 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        draggable={group.id !== 'inbox'}
                        onDragStart={(e) => handleGroupDragStart(e, group.id)}
                      >
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-start gap-2 h-9 pr-8",
                            group.id === 'inbox' ?
                              cn(
                                activeGroupId === group.id ? "bg-accent/20 text-foreground font-medium hover:bg-accent/25" : "bg-accent/10 text-foreground hover:bg-accent/15"
                              ) :
                              activeGroupId === group.id && "bg-primary/10 text-primary hover:bg-primary/20",

                            // Dragged styling
                            draggedGroupId === group.id && "opacity-50",

                            // Drop Target Styling:
                            // If dropping a GROUP (Reorder), default logic handled by lines, but maybe highlight?
                            dropTargetGroupId === group.id && "bg-secondary"
                          )}
                          onClick={() => setActiveGroupId(group.id)}
                        >
                          <Inbox className="w-4 h-4" />
                          <span className="truncate">{group.name}</span>
                        </Button>
                      </div>
                    )}

                    {dropTargetGroupId === group.id && dropGroupPosition === 'after' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary z-20 pointer-events-none" />
                    )}

                    {group.id !== 'inbox' && group.type !== 'separator' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover/list:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </li>
                ))}
                <div ref={listScrollRef} />

                <li className="pt-2 mt-2 border-t">
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-2 h-9",
                      activeGroupId === 'restore' && "bg-primary/10 text-primary hover:bg-primary/20"
                    )}
                    onClick={() => setActiveGroupId('restore')}
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Restore</span>
                  </Button>
                </li>
              </ul>
            </ScrollArea>
            {/* Resizer Handle for Lists */}
            {activeView === 'home' && (
              <div
                className="absolute right-0 top-0 bottom-0 w-1 hover:bg-primary/50 cursor-col-resize z-50 transition-colors opacity-0 hover:opacity-100"
                onMouseDown={(e) => { e.preventDefault(); setIsResizingLists(true); }}
              />
            )}
          </div>


          {/* PANE 2: NOTES LIST */}
          <div
            className={cn(
              "flex-col border-r relative shrink-0 overflow-hidden",
              activeView === 'home' ? "flex" : "hidden"
            )}
            style={{ width: activeView === 'home' ? notesWidth : '100%' }}
          >

            <HomeSection
              title={activeGroupId === 'restore' ? 'Restore' : groups.find(g => g.id === activeGroupId)?.name || 'Inbox'}
              icon={activeGroupId === 'restore' ? RotateCcw : Inbox}
              items={sortedNotes}
              onItemSelect={handleNoteSelect}
              activeId={activeTabId}
              onReorder={() => { }} // DnD removed, so onReorder is a no-op here
              itemType="note"
              sortOption={noteSort}
              onSortChange={setNoteSort}
              viewMode={noteViewMode}
              onViewModeChange={setNoteViewMode}
              searchTerm={homeSearchTerm}
              onSearchChange={setHomeSearchTerm}
              onDeleteItem={handleDeleteNote}
              onToggleComplete={handleToggleComplete}
              onRestoreItem={handleRestoreNote}
              onPermanentDeleteItem={handlePermanentDeleteNote}
              isTrash={activeGroupId === 'restore'}
              scrollDirection={scrollDirection}

              isSelectionMode={isSelectionMode}
              onToggleSelectionMode={handleToggleSelectionMode}
              selectedIds={selectedNoteIds}
              onToggleSelect={handleToggleSelect}
              onBulkDelete={handleBulkDelete}
              onBulkMove={handleBulkMove}
              onRestoreGroup={handleRestoreGroup}
              onPermanentDeleteGroup={handlePermanentDeleteGroup}

              groups={groups}
              onMoveNote={handleMoveNoteToGroup}
              onAddSeparator={handleAddSeparator}
              onQuickAdd={handleQuickCreateNote}
            />      {/* Resizer Handle for Notes */}
            {activeView === 'home' && (
              <div
                className="absolute right-0 top-0 bottom-0 w-1 hover:bg-primary/50 cursor-col-resize z-50 transition-colors opacity-0 hover:opacity-100"
                onMouseDown={(e) => { e.preventDefault(); setIsResizingNotes(true); }}
              />
            )}
          </div>

          {/* PANE 3: EDITOR */}
          <div className={cn(
            "flex-1 bg-background relative overflow-hidden",
            activeView === 'editor' ? "flex" : "hidden md:flex"
          )}>
            {activeNote ? (
              <Editor
                note={activeNote}
                onNoteUpdate={handleNoteUpdate}
                onIconChange={(icon) => handleIconChange(activeNote.id, icon)}
                scrollDirection={scrollDirection}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Inbox className="w-8 h-8 opacity-20" />
                </div>
                <h3 className="text-xl font-medium text-foreground mb-2">No active note</h3>
                <p className="max-w-xs">Select a note from the list or create a new one to start writing.</p>
                <Button variant="outline" className="mt-6" onClick={handleNewNote}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Note
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

        <CreateListDialog
          open={isCreateListOpen}
          onOpenChange={setIsCreateListOpen}
          onCreate={handleCreateGroup}
        />
      </div >
    </>
  );
}
