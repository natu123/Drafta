
"use client";

import * as React from 'react';
import Image from 'next/image';
import { List, LayoutGrid, Notebook, ArrowDownUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/header';
import VerticalTabs from '@/components/vertical-note-tabs';
import Editor from '@/components/editor';
import type { Note, Group, HistoryItem, OpenTab } from '@/lib/types';
import { notes as initialNotes, groups as initialGroups } from '@/lib/data';
import { cn } from '@/lib/utils';
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
      const itemMap = new Map(items.map(item => [item.id, item]));
      
      const orderedItems = openTabsForType
        .map(tab => itemMap.get(tab.id))
        .filter((item): item is Note => !!item);
      
      const openTabIds = new Set(openTabsForType.map(t => t.id));
      const remainingItems = items.filter(item => !openTabIds.has(item.id));
      
      return [...orderedItems, ...remainingItems];
  }
};


interface HomeSectionProps {
  title: string;
  icon: React.ElementType;
  items: Note[];
  onItemSelect: (id: string, type: 'note') => void;
  itemType: 'note';
  sortOption: SortOption;
  onSortChange: (sortOption: SortOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (viewMode: ViewMode) => void;
}

const HomeSection: React.FC<HomeSectionProps> = ({ title, icon: Icon, items, onItemSelect, itemType, sortOption, onSortChange, viewMode, onViewModeChange }) => {
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
                  <button 
                    key={item.id} 
                    onClick={() => onItemSelect(item.id, itemType)}
                    className="w-full text-left p-2 rounded-md hover:bg-secondary transition-colors text-sm"
                  >
                    <span className="truncate">{item.title || 'Untitled'}</span>
                  </button>
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
    initialNotes.map(n => ({ id: n.id, type: 'note' as const }))
  );
  
  const [activeContent, setActiveContent] = React.useState<OpenTab | null>({ type: 'note', id: 'note-1' });
  const [lastActiveContent, setLastActiveContent] = React.useState<OpenTab | null>(activeContent);
    
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  const [noteSort, setNoteSort] = React.useState<SortOption>('manual');
  const [noteViewMode, setNoteViewMode] = React.useState<ViewMode>('list');

  const [history, setHistory] = React.useState<HistoryItem[]>([]);
  
  const activeNote = activeContent?.type === 'note' ? notes.find((note) => note.id === activeContent.id) ?? null : null;

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

  const handleNoteUpdate = React.useCallback((updatedNote: Partial<Note>) => {
    if (activeContent?.type !== 'note') return;
    setNotes(notes => notes.map(note => note.id === activeContent.id ? { ...note, ...updatedNote, updatedAt: new Date().toISOString() } : note));
  }, [activeContent]);
  
  const openTab = (id: string, type: 'note') => {
    const isAlreadyOpen = openTabs.some(tab => tab.id === id && tab.type === type);
    if (!isAlreadyOpen) {
        setOpenTabs(prev => [...prev, { id, type }]);
    }
    setActiveContent({ type, id });
  };
  
  const handleNewNote = () => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: 'Untitled Note',
      icon: '📝',
      content: '',
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
    setActiveContent({ type: itemType, id });
  };

  const handleTabClose = (id: string, type: OpenTab['type']) => {
    let closingTabIndex = openTabs.findIndex(tab => tab.id === id && tab.type === type);
    
    setOpenTabs(prev => prev.filter(tab => !(tab.id === id && tab.type === type)));
    
    if (activeContent?.id === id && activeContent.type === type) {
      const newOpenTabs = openTabs.filter(tab => !(tab.id === id && tab.type === type));
      if (newOpenTabs.length > 0) {
        // Try to select the next tab, or the previous one if closing the last tab
        const nextTab = newOpenTabs[closingTabIndex] || newOpenTabs[closingTabIndex - 1] || newOpenTabs[0];
        if (nextTab) {
          setActiveContent({ id: nextTab.id, type: nextTab.type });
        } else {
          setActiveContent(null);
        }
      } else {
        setActiveContent(null);
      }
    }
  };
  
  const handleReorderTabs = (reorderedTabs: OpenTab[]) => {
    setOpenTabs(reorderedTabs);
    const reorderedNoteIds = reorderedTabs.filter(t => t.type === 'note').map(t => t.id);
    if(reorderedNoteIds.length > 0) {
      setNoteSort('manual');
    }
  };

  const handleIconChange = (id: string, icon: string) => {
    setNotes(notes.map(note => note.id === id ? { ...note, icon } : note));
  };
  
  const handleToggleScreenTab = () => {
    if (activeContent?.type === 'notes') {
      setActiveContent(lastActiveContent);
    } else {
      setLastActiveContent(activeContent);
      setActiveContent({ type: 'notes', id: 'notes' });
    }
  };

  const sortedNotes = React.useMemo(() => getSortedItems(notes, noteSort, openTabs.filter(t => t.type === 'note')), [notes, noteSort, openTabs]);

  const isScreenTabActive = activeContent?.type === 'notes';

  const renderContent = () => {
    if (isScreenTabActive) {
        return (
        <div className="p-4 md:p-8 h-full">
          <div className="grid md:grid-cols-1 h-full gap-4">
            <HomeSection 
              title="Notes" 
              icon={Notebook} 
              items={sortedNotes} 
              onItemSelect={(id) => handleNoteSelect(id)} 
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


    switch (activeContent?.type) {
      case 'note':
        return activeNote ? (
          <Editor 
            key={activeNote.id} 
            note={activeNote} 
            onNoteUpdate={handleNoteUpdate}
            onIconChange={(id, icon) => handleIconChange(id, icon)}
          />
        ) : null;
      default:
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
        onToggleScreenTab={handleToggleScreenTab}
        isScreenTabActive={isScreenTabActive}
        onNewNote={handleNewNote}
        onOpenSettings={() => setIsSettingsOpen(true)}
        history={history}
        onHistorySelect={handleHistorySelect}
      />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 flex overflow-hidden relative">
          {!isScreenTabActive && (
            <VerticalTabs
                items={openTabDetails}
                activeId={activeContent?.id}
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
