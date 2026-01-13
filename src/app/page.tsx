
"use client";

import * as React from 'react';
import Image from 'next/image';
import { List, LayoutGrid, Notebook, ArrowDownUp, GripVertical, Inbox, Search, Trash2, RotateCcw, MoreVertical, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Header from '@/components/header';
import VerticalTabs from '@/components/vertical-note-tabs';
import Editor from '@/components/editor';
import type { Note, Group, HistoryItem, OpenTab } from '@/lib/types';
import { notes as initialNotes, groups as initialGroups } from '@/lib/data';
import { cn, htmlToPlainText } from '@/lib/utils';
import SettingsDialog from '@/components/settings-dialog';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
      // For manual sort, we just return the items in their current order.
      // The actual reordering is handled by drag-and-drop state updates.
      return items;
  }
};


interface HomeSectionProps {
  title: string;
  icon: React.ElementType;
  items: Note[];
  onItemSelect: (id: string, type: 'note') => void;
  onReorder: (reorderedItems: Note[]) => void;
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
}

const HomeSection: React.FC<HomeSectionProps> = ({ title, icon: Icon, items, onItemSelect, onReorder, itemType, sortOption, onSortChange, viewMode, onViewModeChange, searchTerm, onSearchChange, onDeleteItem, onRestoreItem, onPermanentDeleteItem, isTrash }) => {
  const [draggedItem, setDraggedItem] = React.useState<Note | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, item: Note) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetItem: Note) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === targetItem.id) {
      setDraggedItem(null);
      return;
    }

    const draggedIndex = items.findIndex(i => i.id === draggedItem.id);
    const targetIndex = items.findIndex(i => i.id === targetItem.id);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newItems = [...items];
    const [removed] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, removed);

    onSortChange('manual');
    onReorder(newItems);
    setDraggedItem(null);
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Icon className="w-5 h-5 text-primary" />
          <span>{title}</span>
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
      <div className="px-6 pb-2">
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
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full">
          <div className={cn("p-2", viewMode === 'grid' && 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2')}>
            {items.map(item => (
              viewMode === 'list' ? (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, item)}
                  onDragEnd={() => setDraggedItem(null)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md hover:bg-secondary transition-all cursor-pointer border border-transparent",
                    draggedItem?.id === item.id ? "opacity-50" : "opacity-100"
                  )}
                >
                  <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
                  <div onClick={() => onItemSelect(item.id, itemType)} className="flex-1">
                    <p className="font-medium truncate">{item.title || 'Untitled'}</p>
                    <p className="text-sm text-muted-foreground truncate">{item.plainTextContent}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <Card key={item.id} className="group cursor-pointer hover:bg-secondary transition-colors relative">
                  <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    {isTrash ? (
                      <>
                        <Button variant="secondary" size="icon" className="h-8 w-8 bg-background/80" onClick={(e) => { e.stopPropagation(); onRestoreItem?.(item.id); }}>
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                        <Button variant="secondary" size="icon" className="h-8 w-8 bg-background/80 text-destructive" onClick={(e) => { e.stopPropagation(); onPermanentDeleteItem?.(item.id); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <Button variant="secondary" size="icon" className="h-8 w-8 bg-background/80 hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <CardContent className="p-0" onClick={() => onItemSelect(item.id, itemType)}>
                    <div className="aspect-video relative w-full">
                      {item.thumbnailUrl ? (
                        <Image src={item.thumbnailUrl} alt={item.title || 'thumbnail'} fill className="object-cover rounded-t-lg" />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center rounded-t-lg">
                          <Icon className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="p-2">
                    <p className="text-sm truncate font-medium">{item.title || 'Untitled'}</p>
                  </CardFooter>
                </Card>
              )
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
};


export default function Home() {
  const [notes, setNotes] = React.useState<Note[]>(initialNotes);
  const [groups, setGroups] = React.useState<Group[]>(initialGroups);

  const [openTabs, setOpenTabs] = React.useState<OpenTab[]>(
    initialNotes.slice(0, 3).map(n => ({ id: n.id, type: 'note' as const }))
  );

  const [activeView, setActiveView] = React.useState<'home' | 'editor'>('editor');
  const [activeTabId, setActiveTabId] = React.useState<string | null>('note-1');
  const [lastActiveTab, setLastActiveTab] = React.useState<OpenTab | null>({ type: 'note', id: 'note-1' });

  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isCreateListOpen, setIsCreateListOpen] = React.useState(false);

  const [noteSort, setNoteSort] = React.useState<SortOption>('manual');
  const [noteViewMode, setNoteViewMode] = React.useState<ViewMode>('list');
  const [activeGroupId, setActiveGroupId] = React.useState<string>('inbox');

  const [homeSearchTerm, setHomeSearchTerm] = React.useState('');
  const [listsSearchTerm, setListsSearchTerm] = React.useState('');
  const [tabsSearchTerm, setTabsSearchTerm] = React.useState('');

  const [history, setHistory] = React.useState<HistoryItem[]>([]);

  const activeNote = activeView === 'editor' && activeTabId ? notes.find((note) => note.id === activeTabId) ?? null : null;

  const openTabDetails = React.useMemo(() => {
    const itemMap = new Map<string, Note & { type: 'note' }>(
      notes.map(item => [item.id, { ...item, type: 'note' as const }])
    );

    const tabs = openTabs
      .map(tab => {
        const item = itemMap.get(tab.id);
        if (item && item.type === tab.type) {
          return item;
        }
        return null;
      })
      .filter((item): item is (Note & { type: 'note' }) => !!item);

    if (!tabsSearchTerm) return tabs;

    const lowerSearch = tabsSearchTerm.toLowerCase();
    return tabs.filter(tab =>
      tab.title.toLowerCase().includes(lowerSearch) ||
      (tab.plainTextContent && tab.plainTextContent.toLowerCase().includes(lowerSearch))
    );
  }, [openTabs, notes, tabsSearchTerm]);

  const filteredGroups = React.useMemo(() => {
    let activeGroups = groups.filter(g => !g.isDeleted);
    if (!listsSearchTerm) return activeGroups;
    const lowerSearch = listsSearchTerm.toLowerCase();
    return activeGroups.filter(g => g.name.toLowerCase().includes(lowerSearch));
  }, [groups, listsSearchTerm]);

  const deletedGroups = React.useMemo(() => {
    return groups.filter(g => g.isDeleted);
  }, [groups]);

  const addToHistory = (item: Note, type: 'note') => {
    setHistory(prev => {
      const newHistory: HistoryItem = {
        id: item.id,
        type: type,
        title: item.title,
        icon: item.icon,
        accessedAt: new Date().toISOString(),
      };
      // Remove previous entries of the same item and add the new one to the top.
      const filtered = prev.filter(h => h.id !== item.id);
      return [newHistory, ...filtered].slice(0, 15); // Limit history size
    });
  };

  const handleNoteUpdate = React.useCallback((updatedNote: Partial<Note> & { content?: string }) => {
    if (activeView !== 'editor' || !activeTabId) return;
    setNotes(notes => notes.map(note => {
      if (note.id === activeTabId) {
        const newNote = { ...note, ...updatedNote, updatedAt: new Date().toISOString() };
        if (updatedNote.content !== undefined) {
          newNote.plainTextContent = htmlToPlainText(updatedNote.content);
        }
        return newNote;
      }
      return note;
    }));
  }, [activeView, activeTabId]);

  const openTab = (id: string, type: 'note') => {
    const isAlreadyOpen = openTabs.some(tab => tab.id === id && tab.type === type);
    if (!isAlreadyOpen) {
      setOpenTabs(prev => [...prev, { id, type }]);
    }
    setActiveTabId(id);
    setActiveView('editor');
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
    openTab(newNote.id, 'note');
    addToHistory(newNote, 'note');
  };

  const handleNoteSelect = React.useCallback((id: string) => {
    setNotes(prevNotes => {
      const note = prevNotes.find(n => n.id === id);
      if (!note) return prevNotes;
      const updatedNotes = prevNotes.map(n => n.id === id ? { ...n, lastAccessedAt: new Date().toISOString() } : n);
      // We don't call side effects like openTab or addToHistory inside setNotes.
      return updatedNotes;
    });
    const note = notes.find(n => n.id === id);
    if (note) {
      openTab(id, 'note');
      addToHistory(note, 'note');
    }
  }, [notes, openTab, addToHistory]);

  const handleHistorySelect = (id: string, type: 'note') => {
    if (type === 'note') {
      handleNoteSelect(id);
    }
  };

  const handleTabSelect = (id: string, type: OpenTab['type']) => {
    const itemType = type;
    if (itemType === 'note') {
      const note = notes.find(n => n.id === id);
      if (note) {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, lastAccessedAt: new Date().toISOString() } : n));
        addToHistory(note, 'note');
      }
    }
    setActiveTabId(id);
    setActiveView('editor');
  };

  const handleTabClose = (id: string, type: OpenTab['type']) => {
    const closingTabIndex = openTabs.findIndex(tab => tab.id === id && tab.type === type);

    setOpenTabs(prev => prev.filter(tab => !(tab.id === id && tab.type === type)));

    if (activeTabId === id) {
      const newOpenTabs = openTabs.filter(tab => !(tab.id === id && tab.type === type));
      if (newOpenTabs.length > 0) {
        const nextTab = newOpenTabs[closingTabIndex] || newOpenTabs[closingTabIndex - 1] || newOpenTabs[0];
        if (nextTab) {
          setActiveTabId(nextTab.id);
        } else {
          setActiveTabId(null);
          setActiveView('home');
        }
      } else {
        setActiveTabId(null);
        setActiveView('home');
      }
    }
  };

  const handleReorderTabs = (reorderedTabs: OpenTab[]) => {
    setOpenTabs(reorderedTabs);
  };

  const handleReorderNotes = (reorderedItems: Note[]) => {
    setNotes(reorderedItems);
    setNoteSort('manual');
  };

  const handleDeleteNote = (id: string) => {
    setNotes(prev => prev.map(note => note.id === id ? { ...note, isDeleted: true } : note));
    if (activeTabId === id) {
      handleTabClose(id, 'note');
    }
  };

  const handleRestoreNote = (id: string) => {
    setNotes(prev => prev.map(note => note.id === id ? { ...note, isDeleted: false } : note));
  };

  const handlePermanentDeleteNote = (id: string) => {
    setNotes(prev => prev.filter(note => note.id !== id));
  };

  const handleAddGroup = () => {
    setIsCreateListOpen(true);
  };

  const handleCreateGroup = (name: string) => {
    const newGroup: Group = {
      id: `group-${Date.now()}`,
      name: name,
    };
    setGroups(prev => [...prev, newGroup]);
    setActiveGroupId(newGroup.id);
  };

  const handleDeleteGroup = (id: string) => {
    if (id === 'inbox') return; // Cannot delete inbox
    setGroups(prev => prev.map(g => g.id === id ? { ...g, isDeleted: true } : g));
    if (activeGroupId === id) {
      setActiveGroupId('inbox');
    }
  };

  const handleRestoreGroup = (id: string) => {
    setGroups(prev => prev.map(g => g.id === id ? { ...g, isDeleted: false } : g));
  };

  const handlePermanentDeleteGroup = (id: string) => {
    // Also delete notes in this group? For now yes.
    setNotes(prev => prev.filter(note => note.group !== id));
    setGroups(prev => prev.filter(g => g.id !== id));
  };

  const handleIconChange = React.useCallback((id: string, icon: string) => {
    setNotes(prevNotes => prevNotes.map(note => note.id === id ? { ...note, icon } : note));
  }, []);

  const handleToggleView = React.useCallback(() => {
    if (activeView === 'editor' && activeTabId) {
      const note = notes.find(n => n.id === activeTabId);
      if (note) setLastActiveTab({ id: note.id, type: 'note' });
    }
    setActiveView(prev => prev === 'home' ? 'editor' : 'home');
  }, [activeView, activeTabId, notes]);

  const sortedNotes = React.useMemo(() => {
    let items = getSortedItems(notes, noteSort, openTabs.filter(t => t.type === 'note'));

    // Filter by group (list)
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
  }, [notes, noteSort, openTabs, homeSearchTerm, activeGroupId]);

  const renderContent = () => {
    if (activeView === 'home') {
      const isRestoreView = activeGroupId === 'restore';

      return (
        <div className="flex h-full">
          <div className="w-64 bg-secondary/30 border-r p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Lists</h2>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleAddGroup}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search lists..."
                className="pl-9 h-8 text-sm"
                value={listsSearchTerm}
                onChange={(e) => setListsSearchTerm(e.target.value)}
              />
            </div>
            <ScrollArea className="flex-1">
              <ul className="space-y-1">
                {filteredGroups.map(group => (
                  <li key={group.id} className="group/list relative">
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-2 h-9 pr-8",
                        activeGroupId === group.id && "bg-primary/10 text-primary hover:bg-primary/20"
                      )}
                      onClick={() => setActiveGroupId(group.id)}
                    >
                      <Inbox className="w-4 h-4" />
                      <span className="truncate">{group.name}</span>
                    </Button>
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

                {/* Restore Special Group */}
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

                {filteredGroups.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No lists found</p>
                )}
              </ul>
            </ScrollArea>
          </div>
          <div className="flex-1 p-4 md:p-8 h-full">
            <div className="grid md:grid-cols-1 h-full gap-4">
              <HomeSection
                title={isRestoreView ? 'Restore' : (groups.find(g => g.id === activeGroupId)?.name || 'Notes')}
                icon={isRestoreView ? RotateCcw : Inbox}
                items={sortedNotes}
                onItemSelect={(id) => handleNoteSelect(id)}
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
                isTrash={isRestoreView}
              />
            </div>
          </div>
        </div>
      );
    }

    if (activeView === 'editor') {
      if (activeNote) {
        return (
          <Editor
            key={activeNote.id}
            note={activeNote}
            onNoteUpdate={handleNoteUpdate}
            onIconChange={(id, icon) => handleIconChange(id, icon)}
          />
        )
      }
      return (
        <div className="p-4 md:p-8 h-full">
          <div className="flex h-full gap-4">
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-secondary/30 rounded-lg">
              <p>Select an item to view or create a new one.</p>
            </div>
          </div>
        </div>
      )
    }
  };

  return (
    <>
      <div className="flex h-screen flex-col bg-background text-foreground">
        <Header
          onToggleView={handleToggleView}
          activeView={activeView}
          onNewNote={handleNewNote}
          onOpenSettings={() => setIsSettingsOpen(true)}
          history={history}
          onHistorySelect={handleHistorySelect}
        />

        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 flex overflow-hidden relative">
            {activeView === 'editor' && openTabDetails.length >= 0 && (
              <VerticalTabs
                items={openTabDetails}
                activeId={activeTabId}
                onTabSelect={handleTabSelect}
                onTabClose={handleTabClose}
                onReorderTabs={handleReorderTabs}
                searchTerm={tabsSearchTerm}
                onSearchChange={setTabsSearchTerm}
              />
            )}
            <div className="flex-1 overflow-y-auto">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
      <CreateListDialog
        open={isCreateListOpen}
        onOpenChange={setIsCreateListOpen}
        onCreate={handleCreateGroup}
      />
    </>
  );
}
