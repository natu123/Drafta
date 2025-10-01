"use client";

import * as React from 'react';
import { PlusCircle, Star, Search, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { Note, Group } from '@/lib/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface NotesSidebarProps {
  notes: Note[];
  groups: Group[];
  activeNoteId: string | null;
  onNoteSelect: (id: string) => void;
  onNewNote: () => void;
  onStarNote: (id: string, stars: 1 | 2 | 3) => void;
}

const NotesSidebar: React.FC<NotesSidebarProps> = ({
  notes,
  groups,
  activeNoteId,
  onNoteSelect,
  onNewNote,
  onStarNote,
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const StarRating = ({ noteId, rating }: { noteId: string; rating: Note['stars'] }) => (
    <div className="flex items-center">
      {[1, 2, 3].map(star => (
        <Star
          key={star}
          className={cn(
            'w-4 h-4 cursor-pointer transition-colors',
            star <= rating ? 'text-accent fill-accent' : 'text-muted-foreground/50 hover:text-accent'
          )}
          onClick={(e) => {
            e.stopPropagation();
            onStarNote(noteId, star as 1 | 2 | 3);
          }}
        />
      ))}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-secondary/30 border-r">
      <div className="p-4 space-y-4">
        <Button onClick={onNewNote} className="w-full">
          <PlusCircle className="mr-2 h-4 w-4" />
          New Note
        </Button>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <Accordion type="multiple" defaultValue={groups.map(g => g.id)} className="w-full">
          {groups.map(group => {
            const notesInGroup = filteredNotes.filter(note => note.group === group.id);
            if (notesInGroup.length === 0 && searchTerm) return null;

            return (
              <AccordionItem value={group.id} key={group.id}>
                <AccordionTrigger className="px-4 text-sm font-medium text-muted-foreground hover:no-underline hover:bg-secondary">
                    <div className="flex items-center gap-2">
                        <Folder className="w-4 h-4" />
                        <span>{group.name}</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-col">
                    {notesInGroup.length > 0 ? (
                      notesInGroup.map(note => (
                        <button
                          key={note.id}
                          onClick={() => onNoteSelect(note.id)}
                          className={cn(
                            'text-left p-4 border-b border-border transition-colors',
                            activeNoteId === note.id ? 'bg-primary/10' : 'hover:bg-secondary'
                          )}
                        >
                          <div className="flex justify-between items-start">
                             <h3 className="font-semibold truncate pr-2">{note.title}</h3>
                             <StarRating noteId={note.id} rating={note.stars} />
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {note.content.substring(0, 70).replace(/(\r\n|\n|\r)/gm," ")}...
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                          </p>
                        </button>
                      ))
                    ) : (
                      <p className="p-4 text-sm text-muted-foreground">No notes in this group.</p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </div>
  );
};

export default NotesSidebar;
