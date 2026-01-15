"use client";

import * as React from 'react';
import Image from 'next/image';
import { List, LayoutGrid, ArrowDownUp, GripVertical, Inbox, Search, Trash2, RotateCcw, Plus, MoreHorizontal, FolderInput } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
  isTrash?: boolean;
  scrollDirection: 'top' | 'bottom';

  // DnD & Move Props
  draggedNote: Note | null;
  onNoteDragStart: (e: React.DragEvent<HTMLDivElement>, item: Note) => void;
  groups: Group[]; // For Move Menu
  onMoveNote: (noteId: string, targetGroupId: string) => void;
}

const HomeSection: React.FC<HomeSectionProps> = ({
  title, icon: Icon, items, onItemSelect, activeId, onReorder, itemType,
  sortOption, onSortChange, viewMode, onViewModeChange,
  searchTerm, onSearchChange, onDeleteItem, onRestoreItem, onPermanentDeleteItem, isTrash,
  scrollDirection,
  draggedNote, onNoteDragStart, groups, onMoveNote
}) => {
  // Local state for insertion indicators
  const [dropTargetId, setDropTargetId] = React.useState<string | null>(null);
  const [dropPosition, setDropPosition] = React.useState<'before' | 'after' | null>(null);

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

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault();
    if (!draggedNote || draggedNote.id === targetId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const height = rect.height;

    if (offsetY < height / 2) {
      setDropPosition('before');
    } else {
      setDropPosition('after');
    }
    setDropTargetId(targetId);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault();
    if (draggedNote && dropTargetId && dropPosition) {
      onSortChange('manual');
      onReorder(draggedNote.id, targetId, dropPosition);
    }
    setDropTargetId(null);
    setDropPosition(null);
  };

  return (
    <Card className="h-full w-full border-none shadow-none bg-transparent flex flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between px-2 pt-2 pb-2 border-b bg-background/95 backdrop-blur z-20 sticky top-0 shrink-0">
        <CardTitle className="text-lg flex items-center gap-2">
          <Icon className="w-5 h-5 text-primary" />
          <span className="truncate">{title}</span>
        </CardTitle>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
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
          <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => onViewModeChange('list')}>
            <List className="w-4 h-4" />
          </Button>
          <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => onViewModeChange('grid')}>
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <div className="p-2 border-b bg-background z-10 sticky top-[53px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${title.toLowerCase()}...`}
            className="pl-9 h-9"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <CardContent className="flex-1 p-0 overflow-hidden relative min-h-0 w-full">
        <ScrollArea className="h-full w-full overflow-hidden">
          <div className="w-full max-w-full overflow-hidden">
            <div ref={topScrollRef} />
            <div className={cn("p-2 pb-12 max-w-full", viewMode === 'grid' && 'grid grid-cols-2 lg:grid-cols-2 gap-2')}>
              {items.map(item => (
                viewMode === 'list' ? (
                  <div key={item.id} className="relative mb-2 w-full">
                    {/* Drop Indicators */}
                    {dropTargetId === item.id && dropPosition === 'before' && (
                      <div className="absolute top-[-4px] left-0 right-0 h-0.5 bg-primary z-20" />
                    )}

                    <div
                      draggable
                      onDragStart={(e) => onNoteDragStart(e, item)}
                      onDragOver={(e) => handleDragOver(e, item.id)}
                      onDrop={(e) => handleDrop(e, item.id)}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border transition-all cursor-pointer group hover:shadow-md min-w-0 overflow-hidden",
                        activeId === item.id
                          ? "bg-accent/10 border-accent/50 shadow-sm"
                          : "bg-card border-border/60 hover:border-primary/30",

                        draggedNote?.id === item.id ? "opacity-50" : "opacity-100",
                        dropTargetId === item.id ? "bg-secondary" : ""
                      )}
                    >
                      <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      <div onClick={() => onItemSelect(item.id, itemType)} className="flex-1 min-w-0">
                        <p className={cn("font-medium truncate transition-colors", activeId === item.id ? "text-primary" : "text-foreground")}>
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
                        {isTrash ? (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={(e) => { e.stopPropagation(); onRestoreItem?.(item.id); }}>
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); onPermanentDeleteItem?.(item.id); }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted" onClick={(e) => e.stopPropagation()}>
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48" side="bottom" collisionPadding={10}>
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                  <FolderInput className="w-4 h-4 mr-2" />
                                  Move to...
                                </DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                  <DropdownMenuSubContent className="w-48 max-h-[300px] overflow-y-auto" sideOffset={2} alignOffset={-5}>
                                    <DropdownMenuItem onSelect={() => onMoveNote(item.id, 'inbox')} disabled={item.group === 'inbox'}>
                                      <Inbox className="w-4 h-4 mr-2" />
                                      Inbox
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {groups.filter(g => g.id !== 'inbox' && !g.isDeleted).map(g => (
                                      <DropdownMenuItem key={g.id} onSelect={() => onMoveNote(item.id, g.id)} disabled={item.group === g.id}>
                                        <span className="truncate">{g.name}</span>
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuSubContent>
                                </DropdownMenuPortal>
                              </DropdownMenuSub>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={() => onDeleteItem(item.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>

                    {dropTargetId === item.id && dropPosition === 'after' && (
                      <div className="absolute bottom-[-4px] left-0 right-0 h-0.5 bg-primary z-20" />
                    )}
                  </div>
                ) : (
                  <Card key={item.id} className={cn(
                    "group cursor-pointer hover:bg-secondary transition-colors relative overflow-hidden border",
                    activeId === item.id ? "ring-2 ring-primary border-transparent" : "border-border/60"
                  )}>
                    {/* Grid View Content */}
                    <div className="absolute top-2 right-2 z-10 flex gap-1">
                      {isTrash ? (
                        <Button variant="secondary" size="icon" className="h-7 w-7 bg-background/80" onClick={(e) => { e.stopPropagation(); onRestoreItem?.(item.id); }}>
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                      ) : (
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="icon" className="h-7 w-7 bg-background/80" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>Move to...</DropdownMenuSubTrigger>
                              <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                  <DropdownMenuItem onSelect={() => onMoveNote(item.id, 'inbox')} disabled={item.group === 'inbox'}>Inbox</DropdownMenuItem>
                                  {groups.filter(g => g.id !== 'inbox' && !g.isDeleted).map(g => (
                                    <DropdownMenuItem key={g.id} onSelect={() => onMoveNote(item.id, g.id)} disabled={item.group === g.id}>{g.name}</DropdownMenuItem>
                                  ))}
                                </DropdownMenuSubContent>
                              </DropdownMenuPortal>
                            </DropdownMenuSub>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }} className="text-destructive">
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
              ))}
              <div ref={scrollRef} />
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
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

          // So resizable columns primarily make sense in 'home' view where all 3 are visible?
          // Actually in 'home' view, PANE 3 Editor is visible on Desktop: "hidden md:flex" -> Wait, 
          // Line 835: activeView === 'editor' ? "flex" : "hidden md:flex" 
          // If activeView is 'home', Editor is "hidden md:flex", so visible on desktop.
          // Lists is "flex" (visible). Notes is "flex" (visible).

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

  // Note DnD State (Lifted)
  const [draggedNote, setDraggedNote] = React.useState<Note | null>(null);
  const [noteDropTargetGroupId, setNoteDropTargetGroupId] = React.useState<string | null>(null); // For Note dropping on Group

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

  const filteredGroups = React.useMemo(() => {
    let activeGroups = groups.filter(g => !g.isDeleted);
    if (!listsSearchTerm) return activeGroups;
    const lowerSearch = listsSearchTerm.toLowerCase();
    return activeGroups.filter(g => g.name.toLowerCase().includes(lowerSearch));
  }, [groups, listsSearchTerm]);

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


  // Note DnD & Move Logic
  const handleNoteDragStart = (e: React.DragEvent<HTMLDivElement>, item: Note) => {
    setDraggedNote(item);
    e.dataTransfer.effectAllowed = 'move';
    // Remove "setDraggedItem" call from HomeSection if it was local logic, 
    // but HomeSection uses it for reorder. 
    // Actually, HomeSection logic for REORDER is passed via onNoteDragStart now.
    // e.stopPropagation(); // Don't stop propagation if we need it here
  };

  const handleReorderNotes = (draggedId: string, targetId: string, position: 'before' | 'after') => {
    setNotes(prev => {
      const dIndex = prev.findIndex(n => n.id === draggedId);
      if (dIndex === -1) return prev;
      const items = [...prev];
      const [item] = items.splice(dIndex, 1);
      let newTIndex = items.findIndex(n => n.id === targetId);
      if (position === 'after') newTIndex++;
      items.splice(newTIndex, 0, item);
      return items;
    });
    setDraggedNote(null);
  };

  const handleMoveNoteToGroup = (noteId: string, targetGroupId: string) => {
    setNotes(prev => prev.map(note => note.id === noteId ? { ...note, group: targetGroupId } : note));
    // If we moved the active note out of view (and we are viewing that group), maybe we should switch group? 
    // Or just let it disappear. Let's let it disappear from current view.
  };

  // Group Drag Handlers (Sidebar)
  const handleGroupDragStart = (e: React.DragEvent<HTMLButtonElement | HTMLDivElement>, groupId: string) => {
    if (groupId === 'inbox') {
      e.preventDefault();
      return;
    }
    setDraggedGroupId(groupId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleGroupDragOver = (e: React.DragEvent<HTMLButtonElement | HTMLDivElement>, targetGroupId: string) => {
    e.preventDefault();

    // Case 1: Dragging a Note onto a Group
    if (draggedNote) {
      // Only if target is different from current group
      if (draggedNote.group !== targetGroupId) {
        setNoteDropTargetGroupId(targetGroupId);
      }
      return;
    }

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

  const handleGroupDragLeave = (e: React.DragEvent<HTMLButtonElement | HTMLDivElement>) => {
    if (draggedNote) {
      setNoteDropTargetGroupId(null);
    }
  };

  const handleGroupDrop = (e: React.DragEvent<HTMLButtonElement | HTMLDivElement>, targetGroupId: string) => {
    e.preventDefault();

    // Case 1: Dropping a Note
    if (draggedNote) {
      if (draggedNote.group !== targetGroupId) {
        handleMoveNoteToGroup(draggedNote.id, targetGroupId);
      }
      setDraggedNote(null);
      setNoteDropTargetGroupId(null);
      return;
    }

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
  const handleCreateGroup = (name: string) => {
    const newGroup: Group = { id: `group-${Date.now()}`, name: name };
    setGroups(prev => [...prev, newGroup]);
    setActiveGroupId(newGroup.id);
  };
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
              <h2 className="text-lg font-semibold">Lists</h2>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleAddGroup}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="px-4 pb-2 border-b bg-secondary/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search lists..."
                  className="pl-9 h-8 text-sm"
                  value={listsSearchTerm}
                  onChange={(e) => setListsSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <ScrollArea className="flex-1 px-4">
              <div ref={listTopScrollRef} />
              <ul className="space-y-1 py-2">
                {filteredGroups.map(group => (
                  <li key={group.id} className="group/list relative">
                    {/* Drop Areas for GROUP REORDERING */}
                    {dropTargetGroupId === group.id && dropGroupPosition === 'before' && (
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary z-20 pointer-events-none" />
                    )}
                    <div
                      draggable={group.id !== 'inbox'}
                      onDragStart={(e) => handleGroupDragStart(e, group.id)}
                      onDragOver={(e) => handleGroupDragOver(e, group.id)}
                      onDragLeave={handleGroupDragLeave}
                      onDrop={(e) => handleGroupDrop(e, group.id)}
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
                          // If dropping a NOTE, highlight as Secondary
                          noteDropTargetGroupId === group.id && "bg-accent/20 border border-accent/50",

                          // If dropping a GROUP (Reorder), default logic handled by lines, but maybe highlight?
                          dropTargetGroupId === group.id && !noteDropTargetGroupId && "bg-secondary"
                        )}
                        onClick={() => setActiveGroupId(group.id)}
                      >
                        <Inbox className="w-4 h-4" />
                        <span className="truncate">{group.name}</span>
                      </Button>
                    </div>
                    {dropTargetGroupId === group.id && dropGroupPosition === 'after' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary z-20 pointer-events-none" />
                    )}

                    {group.id !== 'inbox' && (
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
              onReorder={handleReorderNotes}
              itemType="note"
              sortOption={noteSort}
              onSortChange={setNoteSort}
              viewMode={noteViewMode}
              onViewModeChange={setNoteViewMode}
              searchTerm={homeSearchTerm}
              onSearchChange={setHomeSearchTerm}
              onDeleteItem={handleDeleteNote}
              onRestoreItem={handleRestoreNote}
              onPermanentDeleteItem={handlePermanentDeleteNote}
              isTrash={activeGroupId === 'restore'}
              scrollDirection={scrollDirection}
              draggedNote={draggedNote}
              onNoteDragStart={handleNoteDragStart}
              groups={groups}
              onMoveNote={handleMoveNoteToGroup}
            />
            {/* Resizer Handle for Notes */}
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
        </div>

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
