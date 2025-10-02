"use client";

import * as React from 'react';
import { Globe, Menu, List, LayoutGrid, Notebook, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import Header from '@/components/header';
import NotesSidebar from '@/components/notes-sidebar';
import VerticalTabs from '@/components/vertical-note-tabs';
import Editor from '@/components/editor';
import AiSidebar from '@/components/ai-sidebar';
import type { Note, Group, ChatMessage, Web } from '@/lib/types';
import { notes as initialNotes, groups as initialGroups, chatMessages as initialChatMessages } from '@/lib/data';
import { cn } from '@/lib/utils';
import SettingsDialog from '@/components/settings-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

type ActiveContent = {
  id: string;
  type: 'note' | 'web';
} | null;

const WebviewPlaceholder = ({ url }: { url: string }) => (
  <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
    <Globe className="w-16 h-16 mb-4" />
    <h2 className="text-2xl font-bold mb-2">Web View</h2>
    <p>This is a placeholder for web content.</p>
    <p className="text-sm mt-2">URL: <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline">{url}</a></p>
  </div>
);

type HomeSectionProps = {
  title: string;
  icon: React.ElementType;
  items: (Note | Web)[];
  onItemSelect: (id: string, type: 'note' | 'web') => void;
  itemType: 'note' | 'web';
};

const HomeSection: React.FC<HomeSectionProps> = ({ title, icon: Icon, items, onItemSelect, itemType }) => {
  return (
    <Card className="flex-1 flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Icon className="w-5 h-5 text-primary" />
          <span>{title}</span>
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
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full">
            <div className="p-2">
              {items.map(item => (
                <button 
                  key={item.id} 
                  onClick={() => onItemSelect(item.id, itemType)}
                  className="w-full text-left p-2 rounded-md hover:bg-secondary transition-colors text-sm"
                >
                  <span className="truncate">{item.title || 'Untitled'}</span>
                </button>
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
  
  const [activeContent, setActiveContent] = React.useState<ActiveContent>(notes[0] ? { type: 'note', id: notes[0].id } : null);
  
  const [chatMessages, setChatMessages] = React.useState<ChatMessage[]>(initialChatMessages);
  
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = React.useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  
  const activeNote = activeContent?.type === 'note' ? notes.find((note) => note.id === activeContent.id) ?? null : null;
  const activeWeb = activeContent?.type === 'web' ? webs.find((web) => web.id === activeContent.id) ?? null : null;

  const openTabs = [
    ...openNoteIds.map(id => notes.find(note => note.id === id)).filter((note): note is Note => !!note).map(note => ({ ...note, type: 'note' as const })),
    ...openWebIds.map(id => webs.find(web => web.id === id)).filter((web): web is Web => !!web).map(web => ({ ...web, type: 'web' as const }))
  ];

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
    };
    setNotes([newNote, ...notes]);
    if (!openNoteIds.includes(newNote.id)) {
      setOpenNoteIds([newNote.id, ...openNoteIds]);
    }
    setActiveContent({ type: 'note', id: newNote.id });
  };
  
  const handleNewWeb = () => {
    const newWeb: Web = {
      id: `web-${Date.now()}`,
      title: 'New Tab',
      url: 'https://www.google.com',
      icon: '🌐',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setWebs([newWeb, ...webs]);
    if (!openWebIds.includes(newWeb.id)) {
      setOpenWebIds([newWeb.id, ...openWebIds]);
    }
    setActiveContent({ type: 'web', id: newWeb.id });
  };

  const handleNoteSelect = (id: string) => {
    setActiveContent({ type: 'note', id });
    if (!openNoteIds.includes(id)) {
      setOpenNoteIds([id, ...openNoteIds]);
    }
  };

  const handleWebSelect = (id: string) => {
    setActiveContent({ type: 'web', id });
    if (!openWebIds.includes(id)) {
      setOpenWebIds([id, ...openWebIds]);
    }
  };


  const handleTabSelect = (id: string, type: 'note' | 'web') => {
    setActiveContent({ type, id });
  };

  const handleTabClose = (id: string, type: 'note' | 'web') => {
    let newOpenTabs = [...openTabs];
    let closingTabIndex = newOpenTabs.findIndex(tab => tab.id === id && tab.type === type);
    
    if (type === 'note') {
      setOpenNoteIds(prev => prev.filter(noteId => noteId !== id));
    } else if (type === 'web') {
      setOpenWebIds(prev => prev.filter(webId => webId !== id));
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
  
  const handleEditChatMessage = (id: string, content: string) => {
    setChatMessages(prev => prev.map(msg => msg.id === id ? { ...msg, content } : msg));
  };

  const createNoteFromDraft = (title: string, content: string) => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: title,
      content: content,
      icon: '🤖',
      group: 'ai',
      stars: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNotes([newNote, ...notes]);
    if (!openNoteIds.includes(newNote.id)) {
      setOpenNoteIds([newNote.id, ...openNoteIds]);
    }
    setActiveContent({ type: 'note', id: newNote.id });
  };

  const [isClient, setIsClient] = React.useState(false);
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <>
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Header
        onToggleLeftSidebar={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
        onToggleRightSidebar={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
        isLeftSidebarOpen={isLeftSidebarOpen}
        isRightSidebarOpen={isRightSidebarOpen}
        onNewNote={handleNewNote}
        onNewWeb={handleNewWeb}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="md:hidden">
           <Sheet open={isLeftSidebarOpen} onOpenChange={setIsLeftSidebarOpen}>
            <SheetContent side="left" className="p-0 w-80">
              <NotesSidebar
                notes={notes}
                activeNoteId={activeNote?.id}
                onNoteSelect={(id) => {
                  handleNoteSelect(id);
                  setIsLeftSidebarOpen(false); // Close sidebar on selection
                }}
                onStarNote={handleStarNote}
              />
            </SheetContent>
          </Sheet>
        </div>

        <aside
          className={cn(
            'hidden md:flex flex-col w-80 shrink-0 transition-all duration-300',
            !isLeftSidebarOpen && 'w-0'
          )}
        >
          {isLeftSidebarOpen && (
            <NotesSidebar
              notes={notes}
              activeNoteId={activeNote?.id}
              onNoteSelect={handleNoteSelect}
              onStarNote={handleStarNote}
            />
          )}
        </aside>

        <main className="flex-1 flex overflow-hidden relative">
           <VerticalTabs
              items={openTabs}
              activeId={activeContent?.id}
              onTabSelect={handleTabSelect}
              onTabClose={handleTabClose}
           />
          <div className="flex-1 overflow-y-auto">
            {activeContent?.type === 'note' && activeNote ? (
              <Editor 
                key={activeNote.id} 
                note={activeNote} 
                onNoteUpdate={handleNoteUpdate}
                onIconChange={handleIconChange}
              />
            ) : activeContent?.type === 'web' && activeWeb ? (
              <WebviewPlaceholder key={activeWeb.id} url={activeWeb.url} />
            ) : (
              <div className="p-4 md:p-8 h-full">
                <div className="flex h-full gap-4">
                  <HomeSection title="Notes" icon={Notebook} items={notes} onItemSelect={(id) => handleNoteSelect(id)} itemType="note" />
                  <HomeSection title="Web" icon={Globe} items={webs} onItemSelect={(id) => handleWebSelect(id)} itemType="web" />
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
            )}
          </div>
        </main>
        
        <div className="md-hidden">
          <Sheet open={isRightSidebarOpen} onOpenChange={setIsRightSidebarOpen}>
            <SheetContent side="right" className="p-0 w-80">
               <SheetTitle className="sr-only">AI Assistant Sidebar</SheetTitle>
              <AiSidebar
                chatMessages={chatMessages}
                onAddChatMessage={handleAddChatMessage}
                onEditChatMessage={handleEditChatMessage}
                activeNoteContent={activeNote?.content || ''}
                createNoteFromDraft={createNoteFromDraft}
              />
            </SheetContent>
          </Sheet>
        </div>

         <aside className={cn("h-full bg-background border-l w-96 shrink-0 hidden md:flex flex-col transition-all duration-300", !isRightSidebarOpen && "w-0")}>
            {isRightSidebarOpen && (
              <AiSidebar
                chatMessages={chatMessages}
                onAddChatMessage={handleAddChatMessage}
                onEditChatMessage={handleEditChatMessage}
                activeNoteContent={activeNote?.content || ''}
                createNoteFromDraft={createNoteFromDraft}
              />
            )}
          </aside>
      </div>
    </div>
    <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </>
  );
}
