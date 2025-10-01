"use client";

import * as React from 'react';
import {
  ChevronsLeft,
  Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import Header from '@/components/header';
import NotesSidebar from '@/components/notes-sidebar';
import NoteTabs from '@/components/note-tabs';
import Editor from '@/components/editor';
import AiSidebar from '@/components/ai-sidebar';
import type { Note, Group, ChatMessage } from '@/lib/types';
import { notes as initialNotes, groups as initialGroups, chatMessages as initialChatMessages } from '@/lib/data';
import { cn } from '@/lib/utils';

export default function Home() {
  const [notes, setNotes] = React.useState<Note[]>(initialNotes);
  const [groups, setGroups] = React.useState<Group[]>(initialGroups);
  const [activeNoteId, setActiveNoteId] = React.useState<string | null>(notes[0]?.id ?? null);
  const [openNoteIds, setOpenNoteIds] = React.useState<string[]>([notes[0]?.id ?? 'note-1'].filter(Boolean));
  const [chatMessages, setChatMessages] = React.useState<ChatMessage[]>(initialChatMessages);
  
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = React.useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = React.useState(true);
  
  const activeNote = notes.find((note) => note.id === activeNoteId) ?? null;
  const openNotes = openNoteIds.map(id => notes.find(note => note.id === id)).filter((note): note is Note => !!note);

  const handleNoteUpdate = (updatedNote: Partial<Note>) => {
    setNotes(notes.map(note => note.id === activeNoteId ? { ...note, ...updatedNote, updatedAt: new Date().toISOString() } : note));
  };
  
  const handleNewNote = () => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: 'Untitled Note',
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
    setActiveNoteId(newNote.id);
  };
  
  const handleNoteSelect = (id: string) => {
    setActiveNoteId(id);
    if (!openNoteIds.includes(id)) {
      setOpenNoteIds([id, ...openNoteIds]);
    }
  };

  const handleTabSelect = (id: string) => {
    setActiveNoteId(id);
  };

  const handleTabClose = (id: string) => {
    const newOpenNoteIds = openNoteIds.filter(noteId => noteId !== id);
    setOpenNoteIds(newOpenNoteIds);
    if (activeNoteId === id) {
      setActiveNoteId(newOpenNoteIds[0] || null);
    }
  };

  const handleStarNote = (id: string, stars: number) => {
    setNotes(notes.map(note => note.id === id ? { ...note, stars: (note.stars === stars ? 0 : stars) as Note['stars'] } : note));
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
      group: 'ai',
      stars: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNotes([newNote, ...notes]);
    if (!openNoteIds.includes(newNote.id)) {
      setOpenNoteIds([newNote.id, ...openNoteIds]);
    }
    setActiveNoteId(newNote.id);
  };

  const [isClient, setIsClient] = React.useState(false);
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Header
        onToggleLeftSidebar={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
        onToggleRightSidebar={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
        isLeftSidebarOpen={isLeftSidebarOpen}
        isRightSidebarOpen={isRightSidebarOpen}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Mobile Left Sidebar */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="fixed top-14 left-2 z-40">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-80">
              <NotesSidebar
                notes={notes}
                groups={groups}
                activeNoteId={activeNoteId}
                onNoteSelect={handleNoteSelect}
                onNewNote={handleNewNote}
                onStarNote={handleStarNote}
              />
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop Left Sidebar */}
        <aside
          className={cn(
            'hidden md:flex flex-col w-80 shrink-0 transition-all duration-300 ease-in-out',
            !isLeftSidebarOpen && 'w-0'
          )}
        >
          {isLeftSidebarOpen && (
            <NotesSidebar
              notes={notes}
              groups={groups}
              activeNoteId={activeNoteId}
              onNoteSelect={handleNoteSelect}
              onNewNote={handleNewNote}
              onStarNote={handleStarNote}
            />
          )}
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden relative">
           <Button variant="ghost" size="icon" className="md:hidden fixed top-14 right-2 z-40" onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}>
              <ChevronsLeft className="h-6 w-6" />
            </Button>
           <NoteTabs 
              notes={openNotes}
              activeNoteId={activeNoteId}
              onTabSelect={handleTabSelect}
              onTabClose={handleTabClose}
           />
          <div className="flex-1 overflow-y-auto">
            {activeNote ? (
              <Editor key={activeNote.id} note={activeNote} onNoteUpdate={handleNoteUpdate} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <p className="text-lg">Select a note to start editing</p>
                <p>or</p>
                <Button onClick={handleNewNote} className="mt-2">Create a new note</Button>
              </div>
            )}
          </div>
        </main>
        
        {/* Right Sidebar */}
        <aside className={cn(
          "h-full transition-all duration-300 ease-in-out bg-background border-l",
          "w-96 shrink-0 hidden md:flex flex-col",
          !isRightSidebarOpen && "w-0 hidden"
        )}>
          <AiSidebar
            chatMessages={chatMessages}
            onAddChatMessage={handleAddChatMessage}
            onEditChatMessage={handleEditChatMessage}
            activeNoteContent={activeNote?.content || ''}
            createNoteFromDraft={createNoteFromDraft}
          />
        </aside>
        
        {/* Mobile Right Sidebar */}
        {isClient && window.innerWidth < 768 && (
          <Sheet open={isRightSidebarOpen} onOpenChange={setIsRightSidebarOpen}>
              <SheetContent side="right" className="p-0 w-80">
                 <AiSidebar
                    chatMessages={chatMessages}
                    onAddChatMessage={handleAddChatMessage}
                    onEditChatMessage={handleEditChatMessage}
                    activeNoteContent={activeNote?.content || ''}
                    createNoteFromDraft={createNoteFromDraft}
                  />
              </SheetContent>
          </Sheet>
        )}
      </div>
    </div>
  );
}
