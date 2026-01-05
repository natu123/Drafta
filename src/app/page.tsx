
"use client";

import * as React from 'react';
import Image from 'next/image';
import { List, LayoutGrid, Notebook, ArrowDownUp, GripVertical } from 'lucide-react';
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
}

const HomeSection: React.FC<HomeSectionProps> = ({ title, icon: Icon, items, onItemSelect, onReorder, itemType, sortOption, onSortChange, viewMode, onViewModeChange }) => {
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
    <Card>
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
                  </div>
                ) : (
                  <Card key={item.id} onClick={() => onItemSelect(item.id, itemType)} className="cursor-pointer hover:bg-secondary transition-colors">
                    <CardContent className="p-0">
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

  const [noteSort, setNoteSort] = React.useState<SortOption>('manual');
  const [noteViewMode, setNoteViewMode] = React.useState<ViewMode>('list');

  const [history, setHistory] = React.useState<HistoryItem[]>([]);
  
  const activeNote = activeView === 'editor' && activeTabId ? notes.find((note) => note.id === activeTabId) ?? null : null;

  const openTabDetails = React.useMemo(() => {
    const itemMap = new Map([
        ...notes.map(item => [item.id, {...item, type: 'note' as const}]),
    ]);

    return openTabs
        .map(tab => {
            const item = itemMap.get(tab.id);
            if (item && item.type === tab.type) {
                return item;
            }
            return null;
        })
        .filter((item): item is (Note & {type: 'note'}) => !!item);
  }, [openTabs, notes]);

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
      group: 'general',
      stars: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
    };
    setNotes(prev => [...prev, newNote]);
    openTab(newNote.id, 'note');
    addToHistory(newNote, 'note');
  };

  const handleNoteSelect = (id: string) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    setNotes(prev => prev.map(n => n.id === id ? { ...n, lastAccessedAt: new Date().toISOString() } : n));
    openTab(id, 'note');
    addToHistory(note, 'note');
  };
  
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

  const handleIconChange = (id: string, icon: string) => {
    setNotes(notes.map(note => note.id === id ? { ...note, icon } : note));
  };
  
  const handleToggleView = () => {
    setActiveView(prev => prev === 'home' ? 'editor' : 'home');
    if (activeView === 'home' && activeTabId) {
      const note = notes.find(n => n.id === activeTabId);
      if(note) setLastActiveTab({ id: note.id, type: 'note' });
    } else if (activeView === 'editor' && activeTabId) {
      const note = notes.find(n => n.id === activeTabId);
       if(note) setLastActiveTab({ id: note.id, type: 'note' });
    }
  };

  const sortedNotes = React.useMemo(() => getSortedItems(notes, noteSort, openTabs.filter(t => t.type === 'note')), [notes, noteSort, openTabs]);

  const renderContent = () => {
    if (activeView === 'home') {
        return (
        <div className="p-4 md:p-8 h-full">
          <div className="grid md:grid-cols-1 h-full gap-4">
            <HomeSection 
              title="Notes" 
              icon={Notebook} 
              items={sortedNotes} 
              onItemSelect={(id) => handleNoteSelect(id)}
              onReorder={handleReorderNotes}
              itemType="note"
              sortOption={noteSort}
              onSortChange={setNoteSort}
              viewMode={noteViewMode}
              onViewModeChange={setNoteViewMode}
            />
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
          {activeView === 'editor' && openTabDetails.length > 0 && (
            <VerticalTabs
                items={openTabDetails}
                activeId={activeTabId}
                onTabSelect={handleTabSelect}
                onTabClose={handleTabClose}
                onReorderTabs={handleReorderTabs}
            />
          )}
          <div className="flex-1 overflow-y-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
    <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </>
  );
}
