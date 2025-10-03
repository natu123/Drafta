
"use client";

import * as React from 'react';
import Image from 'next/image';
import { Globe, Menu, List, LayoutGrid, Notebook, MessageSquare, ArrowDownUp, PanelLeftOpen, PanelLeftClose, PanelLeft, PanelRight, AppWindow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import Header from '@/components/header';
import NotesSidebar from '@/components/notes-sidebar';
import VerticalTabs from '@/components/vertical-note-tabs';
import Editor from '@/components/editor';
import TalkView from '@/components/talk-view';
import type { Note, Group, ChatMessage, Web, HistoryItem, Talk, OpenTab } from '@/lib/types';
import { notes as initialNotes, groups as initialGroups } from '@/lib/data';
import { cn } from '@/lib/utils';
import SettingsDialog from '@/components/settings-dialog';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import WebView from '@/components/webview';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


type SortOption = 'manual' | 'newest' | 'oldest' | 'last-accessed';
type ViewMode = 'list' | 'grid';

interface HomeSectionProps {
  title: string;
  icon: React.ElementType;
  items: (Note | Web | Talk)[];
  onItemSelect: (id: string, type: 'note' | 'web' | 'talk') => void;
  itemType: 'note' | 'web' | 'talk';
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
  const [talks, setTalks] = React.useState<Talk[]>([]);
  const [groups, setGroups] = React.useState<Group[]>(initialGroups);
  
  const [openTabs, setOpenTabs] = React.useState<OpenTab[]>(
    initialNotes.map(n => ({ id: n.id, type: 'note' as const }))
  );
  
  const [activeContent, setActiveContent] = React.useState<OpenTab | null>({ type: 'note', id: 'note-1' });
  const [lastActiveContent, setLastActiveContent] = React.useState<OpenTab | null>(activeContent);
  
  const [chatInput, setChatInput] = React.useState<string | ((prev: string) => string)>('');
  
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  const [noteSort, setNoteSort] = React.useState<SortOption>('manual');
  const [webSort, setWebSort] = React.useState<SortOption>('manual');
  const [talkSort, setTalkSort] = React.useState<SortOption>('manual');
  const [noteViewMode, setNoteViewMode] = React.useState<ViewMode>('list');
  const [webViewMode, setWebViewMode] = React.useState<ViewMode>('list');
  const [talkViewMode, setTalkViewMode] = React.useState<ViewMode>('list');

  const [history, setHistory] = React.useState<HistoryItem[]>([]);
  
  const activeNote = activeContent?.type === 'note' ? notes.find((note) => note.id === activeContent.id) ?? null : null;
  const activeWeb = activeContent?.type === 'web' ? webs.find((web) => web.id === activeContent.id) ?? null : null;
  const activeTalk = activeContent?.type === 'talk' ? talks.find((talk) => talk.id === activeContent.id) ?? null : null;

  const openTabDetails = React.useMemo(() => {
    return openTabs.map(tab => {
        if (tab.type === 'note') {
            const note = notes.find(n => n.id === tab.id);
            return note ? { ...note, type: 'note' as const } : null;
        }
        if (tab.type === 'web') {
            const web = webs.find(w => w.id === tab.id);
            return web ? { ...web, type: 'web' as const } : null;
        }
        if (tab.type === 'talk') {
            const talk = talks.find(t => t.id === tab.id);
            return talk ? { ...talk, type: 'talk' as const } : null;
        }
        return null;
    }).filter((item): item is (Note & {type: 'note'}) | (Web & {type: 'web'}) | (Talk & {type: 'talk'}) => !!item);
  }, [openTabs, notes, webs, talks]);

  const addToHistory = (item: Note | Web | Talk, type: 'note' | 'web' | 'talk') => {
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
  
  const openTab = (id: string, type: 'note' | 'web' | 'talk') => {
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
    setWebs(prev => [...prev, newWeb]);
    openTab(newWeb.id, 'web');
    addToHistory(newWeb, 'web');
  };

  const handleNewTalk = () => {
    const newTalk: Talk = {
      id: `talk-${Date.now()}`,
      title: 'New Conversation',
      icon: '💬',
      messages: [{
        id: 'chat-1',
        author: 'ai',
        authorName: 'Prōla',
        content: 'Hello! How can I assist you today?',
        timestamp: new Date().toISOString(),
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
    };
    setTalks(prev => [...prev, newTalk]);
    openTab(newTalk.id, 'talk');
    addToHistory(newTalk, 'talk');
  };

  const handleNoteSelect = (id: string) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    setNotes(prev => prev.map(n => n.id === id ? { ...n, lastAccessedAt: new Date().toISOString() } : n));
    openTab(id, 'note');
    addToHistory(note, 'note');
  };

  const handleWebSelect = (id: string) => {
    const web = webs.find(w => w.id === id);
    if (!web) return;
    setWebs(prev => prev.map(w => w.id === id ? { ...w, lastAccessedAt: new Date().toISOString() } : w));
    openTab(id, 'web');
    addToHistory(web, 'web');
  };

  const handleTalkSelect = (id: string) => {
    const talk = talks.find(t => t.id === id);
    if (!talk) return;
    setTalks(prev => prev.map(t => t.id === id ? { ...t, lastAccessedAt: new Date().toISOString() } : t));
    openTab(id, 'talk');
    addToHistory(talk, 'talk');
  };
  
  const handleHistorySelect = (id: string, type: 'note' | 'web' | 'talk') => {
    if (type === 'note') {
      handleNoteSelect(id);
    } else if (type === 'web') {
      handleWebSelect(id);
    } else if (type === 'talk') {
      handleTalkSelect(id);
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
    } else if (itemType === 'web') {
       const web = webs.find(w => w.id === id);
       if (web) {
        setWebs(prev => prev.map(w => w.id === id ? { ...w, lastAccessedAt: new Date().toISOString() } : w));
        addToHistory(web, 'web');
      }
    } else if (itemType === 'talk') {
        const talk = talks.find(t => t.id === id);
        if (talk) {
            setTalks(prev => prev.map(t => t.id === id ? { ...t, lastAccessedAt: new Date().toISOString() } : t));
            addToHistory(talk, 'talk');
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
    const reorderedNotes = reorderedTabs
        .filter(t => t.type === 'note')
        .map(t => notes.find(n => n.id === t.id))
        .filter((n): n is Note => !!n);
    const reorderedWebs = reorderedTabs
        .filter(t => t.type === 'web')
        .map(t => webs.find(w => w.id === t.id))
        .filter((w): w is Web => !!w);
    const reorderedTalks = reorderedTabs
        .filter(t => t.type === 'talk')
        .map(t => talks.find(t => t.id === t.id))
        .filter((t): t is Talk => !!t);

    setNotes(prev => [...reorderedNotes, ...prev.filter(n => !reorderedNotes.find(rn => rn.id === n.id))]);
    setWebs(prev => [...reorderedWebs, ...prev.filter(w => !reorderedWebs.find(rw => rw.id === w.id))]);
    setTalks(prev => [...reorderedTalks, ...prev.filter(t => !reorderedTalks.find(rt => rt.id === t.id))]);
  };

  const handleStarNote = (id: string, stars: number) => {
    setNotes(notes.map(note => note.id === id ? { ...note, stars: (note.stars === stars ? 0 : stars) as Note['stars'] } : note));
  };

  const handlePinNote = (id: string) => {
    setNotes(notes.map(note => note.id === id ? { ...note, isPinned: !note.isPinned } : note));
  };

  const handleIconChange = (id: string, icon: string, type: 'note' | 'talk') => {
    if (type === 'note') {
        setNotes(notes.map(note => note.id === id ? { ...note, icon } : note));
    } else if (type === 'talk') {
        setTalks(talks.map(talk => talk.id === id ? { ...talk, icon } : talk));
    }
  };

  const handleTitleChange = (id: string, title: string, type: 'note' | 'web' | 'talk') => {
    if (type === 'talk') {
      setTalks(talks.map(talk => talk.id === id ? { ...talk, title } : talk));
    } else if (type === 'note') {
      setNotes(notes.map(note => note.id === id ? {...note, title} : note));
    }
  };

  const handleAddChatMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    if (activeContent?.type !== 'talk') return;

    const newMessage: ChatMessage = {
      ...message,
      id: `msg-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    
    setTalks(prevTalks => prevTalks.map(talk => 
        talk.id === activeContent.id
        ? { ...talk, messages: [...talk.messages, newMessage], updatedAt: new Date().toISOString() }
        : talk
    ));
  };
  
  const handleQuoteNote = (noteContent: string) => {
    const quoteText = `> Note: ${activeNote?.title || 'Untitled'}:\n> ${noteContent.replace(/\n/g, '\n> ')}\n\n`;
    setChatInput(prev => {
      return (currentInput: string) => ({
        text: quoteText,
        currentInput,
      });
    });

    const openTalks = openTabs.filter(t => t.type === 'talk');
    if (openTalks.length === 0) {
      handleNewTalk();
    } else {
      const targetTalkId = activeTalk?.id || openTalks[0].id;
      setActiveContent({ type: 'talk', id: targetTalkId });
    }
  };
  
  const handleToggleScreenTab = () => {
    if (activeContent?.type === 'notes') {
      setActiveContent(lastActiveContent);
    } else {
      setLastActiveContent(activeContent);
      setActiveContent({ type: 'notes', id: 'notes' });
    }
  };

  const [isClient, setIsClient] = React.useState(false);
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const getSortedItems = <T extends { id: string; createdAt: string; updatedAt: string; lastAccessedAt?: string }>(
    items: T[], 
    sortOption: SortOption, 
  ): T[] => {
    
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

  const sortedNotes = React.useMemo(() => getSortedItems(notes, noteSort), [notes, noteSort]);
  const sortedWebs = React.useMemo(() => getSortedItems(webs, webSort), [webs, webSort]);
  const sortedTalks = React.useMemo(() => getSortedItems(talks, talkSort), [talks, talkSort]);


  const isScreenTabActive = activeContent?.type === 'notes';

  const renderContent = () => {
    if (isScreenTabActive) {
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
            <HomeSection 
              title="Talks" 
              icon={MessageSquare} 
              items={sortedTalks} 
              onItemSelect={(id) => handleTalkSelect(id)} 
              itemType="talk"
              sortOption={talkSort}
              onSortChange={setTalkSort}
              viewMode={talkViewMode}
              onViewModeChange={setTalkViewMode}
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
            onIconChange={(id, icon) => handleIconChange(id, icon, 'note')}
            onQuoteNote={handleQuoteNote}
          />
        ) : null;
      case 'web':
        return activeWeb ? <WebView key={activeWeb.id} web={activeWeb} /> : null;
      case 'talk':
        return activeTalk ? (
          <TalkView
            key={activeTalk.id}
            talk={activeTalk}
            onAddChatMessage={handleAddChatMessage}
            chatInput={chatInput}
            setChatInput={setChatInput}
            onIconChange={(id, icon) => handleIconChange(id, icon, 'talk')}
            onTitleChange={(id, title) => handleTitleChange(id, title, 'talk')}
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
        onNewTalk={handleNewTalk}
        onNewNote={handleNewNote}
        onNewWeb={handleNewWeb}
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

    

    
