
"use client";

import * as React from 'react';
import Image from 'next/image';
import { Globe, Menu, List, LayoutGrid, Notebook, MessageSquare, ArrowDownUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import Header from '@/components/header';
import NotesSidebar from '@/components/notes-sidebar';
import VerticalTabs from '@/components/vertical-note-tabs';
import Editor from '@/components/editor';
import TalkView from '@/components/talk-view';
import type { Note, Group, ChatMessage, Web, HistoryItem } from '@/lib/types';
import { notes as initialNotes, groups as initialGroups, chatMessages as initialChatMessages } from '@/lib/data';
import { cn } from '@/lib/utils';
import SettingsDialog from '@/components/settings-dialog';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import WebView from '@/components/webview';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type ActiveContent = {
  id: string;
  type: 'note' | 'web' | 'notes' | 'talk';
} | null;


type SortOption = 'manual' | 'newest' | 'oldest' | 'last-accessed';
type ViewMode = 'list' | 'grid';

interface HomeSectionProps {
  title: string;
  icon: React.ElementType;
  items: (Note | Web)[];
  onItemSelect: (id: string, type: 'note' | 'web') => void;
  itemType: 'note' | 'web';
  sortOption: SortOption;
  onSortChange: (sortOption: SortOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (viewMode: ViewMode) => void;
}

const HomeSection: React.FC<HomeSectionProps> = ({ title, icon: Icon, items, onItemSelect, itemType, sortOption, onSortChange, viewMode, onViewModeChange }) => {
  return (
    <Card className="flex-1 flex flex-col">
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
            <div className={cn("p-2", viewMode === 'grid' && 'grid grid-cols-2 gap-2')}>
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
  const [webs, setWebs] = React.useState<Web[]>([]);
  const [groups, setGroups] = React.useState<Group[]>(initialGroups);
  
  const [openNoteIds, setOpenNoteIds] = React.useState<string[]>([notes[0]?.id ?? 'note-1'].filter(Boolean));
  const [openWebIds, setOpenWebIds] = React.useState<string[]>([]);
  const [openSpecialTabs, setOpenSpecialTabs] = React.useState<('notes' | 'talk')[]>([]);
  
  const [activeContent, setActiveContent] = React.useState<ActiveContent>(notes[0] ? { type: 'note', id: notes[0].id } : null);
  
  const [chatMessages, setChatMessages] = React.useState<ChatMessage[]>(initialChatMessages);
  const [chatInput, setChatInput] = React.useState('');
  
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  const [noteSort, setNoteSort] = React.useState<SortOption>('manual');
  const [webSort, setWebSort] = React.useState<SortOption>('manual');
  const [noteViewMode, setNoteViewMode] = React.useState<ViewMode>('list');
  const [webViewMode, setWebViewMode] = React.useState<ViewMode>('list');
  const [history, setHistory] = React.useState<HistoryItem[]>([]);
  
  const activeNote = activeContent?.type === 'note' ? notes.find((note) => note.id === activeContent.id) ?? null : null;
  const activeWeb = activeContent?.type === 'web' ? webs.find((web) => web.id === activeContent.id) ?? null : null;

  const openTabs = [
    ...openSpecialTabs.map(type => ({ id: type, type, title: type === 'notes' ? 'Notes' : 'Talk', icon: type === 'notes' ? '🗒️' : '💬' })),
    ...openNoteIds.map(id => notes.find(note => note.id === id)).filter((note): note is Note => !!note).map(note => ({ ...note, type: 'note' as const })),
    ...openWebIds.map(id => webs.find(web => web.id === id)).filter((web): web is Web => !!web).map(web => ({ ...web, type: 'web' as const }))
  ];

  const addToHistory = (item: Note | Web, type: 'note' | 'web') => {
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

  const handleNoteUpdate = (updatedNote: Partial<Note>) => {
    if (activeContent?.type !== 'note') return;
    setNotes(notes.map(note => note.id === activeContent.id ? { ...note, ...updatedNote, updatedAt: new Date().toISOString() } : note));
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
    setNotes([newNote, ...notes]);
    if (!openNoteIds.includes(newNote.id)) {
      setOpenNoteIds([newNote.id, ...openNoteIds]);
    }
    setActiveContent({ type: 'note', id: newNote.id });
    addToHistory(newNote, 'note');
  };
  
  const handleNewWeb = () => {
    const newWeb: Web = {
      id: `web-${Date.now()}`,
      title: 'New Tab',
      url: 'https://www.google.com',
      icon: '🌐',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
    };
    setWebs([newWeb, ...webs]);
    if (!openWebIds.includes(newWeb.id)) {
      setOpenWebIds([newWeb.id, ...openWebIds]);
    }
    setActiveContent({ type: 'web', id: newWeb.id });
    addToHistory(newWeb, 'web');
  };

  const handleNoteSelect = (id: string) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;

    setNotes(prev => prev.map(n => n.id === id ? { ...n, lastAccessedAt: new Date().toISOString() } : n));
    setActiveContent({ type: 'note', id });
    if (!openNoteIds.includes(id)) {
      setOpenNoteIds([id, ...openNoteIds]);
    }
    addToHistory(note, 'note');
  };

  const handleWebSelect = (id: string) => {
    const web = webs.find(w => w.id === id);
    if (!web) return;

    setWebs(prev => prev.map(w => w.id === id ? { ...w, lastAccessedAt: new Date().toISOString() } : w));
    setActiveContent({ type: 'web', id });
    if (!openWebIds.includes(id)) {
      setOpenWebIds([id, ...openWebIds]);
    }
    addToHistory(web, 'web');
  };
  
  const handleHistorySelect = (id: string, type: 'note' | 'web') => {
    if (type === 'note') {
      handleNoteSelect(id);
    } else {
      handleWebSelect(id);
    }
  };

  const handleTabSelect = (id: string, type: 'note' | 'web' | 'notes' | 'talk') => {
    if (type === 'note') {
      const note = notes.find(n => n.id === id);
      if (note) {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, lastAccessedAt: new Date().toISOString() } : n));
        addToHistory(note, 'note');
      }
    } else if (type === 'web') {
       const web = webs.find(w => w.id === id);
       if (web) {
        setWebs(prev => prev.map(w => w.id === id ? { ...w, lastAccessedAt: new Date().toISOString() } : w));
        addToHistory(web, 'web');
      }
    }
    setActiveContent({ type, id });
  };

  const handleTabClose = (id: string, type: 'note' | 'web' | 'notes' | 'talk') => {
    let newOpenTabs = [...openTabs];
    let closingTabIndex = newOpenTabs.findIndex(tab => tab.id === id && tab.type === type);
    
    if (type === 'note') {
      setOpenNoteIds(prev => prev.filter(noteId => noteId !== id));
    } else if (type === 'web') {
      setOpenWebIds(prev => prev.filter(webId => webId !== id));
    } else if (type === 'notes' || type === 'talk') {
        setOpenSpecialTabs(prev => prev.filter(tabType => tabType !== id));
    }
    
    if (activeContent?.id === id && activeContent.type === type) {
      newOpenTabs.splice(closingTabIndex, 1);
      if (newOpenTabs.length > 0) {
        const nextTab = newOpenTabs[closingTabIndex] || newOpenTabs[closingTabIndex - 1] || newOpenTabs[0];
        setActiveContent({ id: nextTab.id, type: nextTab.type });
      } else {
        setActiveContent(null);
      }
    }
  };

  const handleStarNote = (id: string, stars: number) => {
    setNotes(notes.map(note => note.id === id ? { ...note, stars: (note.stars === stars ? 0 : stars) as Note['stars'] } : note));
  };

  const handlePinNote = (id: string) => {
    setNotes(notes.map(note => note.id === id ? { ...note, isPinned: !note.isPinned } : note));
  };

  const handleIconChange = (id: string, icon: string) => {
    if (activeContent?.type !== 'note') return;
    setNotes(notes.map(note => note.id === id ? { ...note, icon } : note));
  };

  const handleAddChatMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `msg-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    setChatMessages(prev => [...prev, newMessage]);
  };
  
  const handleQuoteNote = (noteContent: string) => {
    const quoteText = `> **Note: ${activeNote?.title || 'Untitled'}**:\n> ${noteContent.replace(/\n/g, '\n> ')}\n\n`;
    setChatInput(prev => quoteText + prev);
    if (!openSpecialTabs.includes('talk')) {
        setOpenSpecialTabs(prev => [...prev, 'talk']);
    }
    setActiveContent({ type: 'talk', id: 'talk' });
  };
  
  const handleOpenNotes = () => {
    if (!openSpecialTabs.includes('notes')) {
      setOpenSpecialTabs(prev => ['notes', ...prev]);
    }
    setActiveContent({ type: 'notes', id: 'notes' });
  };

  const handleOpenTalk = () => {
    if (!openSpecialTabs.includes('talk')) {
      setOpenSpecialTabs(prev => ['talk', ...prev]);
    }
    setActiveContent({ type: 'talk', id: 'talk' });
  };


  const [isClient, setIsClient] = React.useState(false);
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const sortedNotes = React.useMemo(() => {
    const sorted = [...notes];
    switch (noteSort) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case 'last-accessed':
        return sorted.sort((a, b) => new Date(b.lastAccessedAt || 0).getTime() - new Date(a.lastAccessedAt || 0).getTime());
      case 'manual':
      default:
        // Pinned items first, then by updated date
        return sorted.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
    }
  }, [notes, noteSort]);

  const sortedWebs = React.useMemo(() => {
    const sorted = [...webs];
    switch (webSort) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case 'last-accessed':
        return sorted.sort((a, b) => new Date(b.lastAccessedAt || 0).getTime() - new Date(a.lastAccessedAt || 0).getTime());
      case 'manual':
      default:
        return webs;
    }
  }, [webs, webSort]);

  const renderContent = () => {
    if (!activeContent) {
      return (
        <div className="p-4 md:p-8 h-full">
          <div className="flex h-full gap-4">
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
            <HomeSection 
              title="Web" 
              icon={Globe} 
              items={sortedWebs} 
              onItemSelect={(id) => handleWebSelect(id)} 
              itemType="web"
              sortOption={webSort}
              onSortChange={setWebSort}
              viewMode={webViewMode}
              onViewModeChange={setWebViewMode}
            />
            <Card className="flex-1 flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <span>Talks</span>
                </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                      <List className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                      <LayoutGrid className="w-4 h-4" />
                    </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Talks feature coming soon.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    switch (activeContent.type) {
      case 'note':
        return activeNote ? (
          <Editor 
            key={activeNote.id} 
            note={activeNote} 
            onNoteUpdate={handleNoteUpdate}
            onIconChange={handleIconChange}
            onQuoteNote={handleQuoteNote}
          />
        ) : null;
      case 'web':
        return activeWeb ? <WebView key={activeWeb.id} web={activeWeb} /> : null;
      case 'notes':
        return (
          <NotesSidebar
            notes={notes}
            activeNoteId={null} // No note is active inside the list view
            onNoteSelect={handleNoteSelect}
            onStarNote={handleStarNote}
            onPinNote={handlePinNote}
          />
        );
      case 'talk':
        return (
          <TalkView
            chatMessages={chatMessages}
            onAddChatMessage={handleAddChatMessage}
            chatInput={chatInput}
            setChatInput={setChatInput}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Header
        onOpenNotes={handleOpenNotes}
        onOpenTalk={handleOpenTalk}
        onNewNote={handleNewNote}
        onNewWeb={handleNewWeb}
        onOpenSettings={() => setIsSettingsOpen(true)}
        history={history}
        onHistorySelect={handleHistorySelect}
      />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 flex overflow-hidden relative">
           <VerticalTabs
              items={openTabs}
              activeId={activeContent?.id}
              onTabSelect={handleTabSelect}
              onTabClose={handleTabClose}
           />
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
