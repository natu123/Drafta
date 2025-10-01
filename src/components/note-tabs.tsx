
"use client";

import * as React from 'react';
import { X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Note } from '@/lib/types';
import { ScrollArea, ScrollBar } from './ui/scroll-area';

interface NoteTabsProps {
  notes: Note[];
  activeNoteId: string | null;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
}

const NoteTabs: React.FC<NoteTabsProps> = ({ notes, activeNoteId, onTabSelect, onTabClose }) => {
  const activeTabRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [activeNoteId]);

  if (notes.length === 0) {
    return null;
  }

  return (
    <div className="border-b bg-background">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex items-center gap-1 p-1">
          {notes.map(note => (
            <button
              key={note.id}
              ref={note.id === activeNoteId ? activeTabRef : null}
              onClick={() => onTabSelect(note.id)}
              className={cn(
                'flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-md transition-colors text-sm shrink-0',
                activeNoteId === note.id
                  ? 'bg-primary/10 text-primary-foreground font-semibold'
                  : 'hover:bg-secondary'
              )}
            >
              <FileText className="w-4 h-4" />
              <span className="truncate max-w-40">{note.title || 'Untitled Note'}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(note.id);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

export default NoteTabs;
