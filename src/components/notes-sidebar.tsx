"use client";

import * as React from 'react';
import { Star, Search, ChevronRight, Pin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { Note } from '@/lib/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface NotesSidebarProps {
  notes: Note[];
  activeNoteId: string | null;
  onNoteSelect: (id: string) => void;
  onStarNote: (id: string, stars: 1 | 2 | 3) => void;
  onPinNote: (id: string) => void;
}

const StarRating = ({ noteId, rating, onStarNote }: { noteId: string; rating: Note['stars']; onStarNote: NotesSidebarProps['onStarNote'] }) => (
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

const PinButton = ({ noteId, isPinned, onPinNote }: { noteId: string; isPinned?: boolean; onPinNote: (id: string) => void }) => (
    <button onClick={(e) => { e.stopPropagation(); onPinNote(noteId); }} className="p-1 hover:bg-secondary rounded-md">
        <Pin className={cn(
            'w-4 h-4 transition-colors',
            isPinned ? 'text-primary fill-primary' : 'text-muted-foreground/50 hover:text-primary'
        )} />
    </button>
);

interface NoteTreeItemProps {
  note: Note;
  level: number;
  activeNoteId: string | null;
  onNoteSelect: (id: string) => void;
  onStarNote: (id: string, stars: 1 | 2 | 3) => void;
  onPinNote: (id: string) => void;
  isInitiallyOpen?: boolean;
}

const NoteTreeItem: React.FC<NoteTreeItemProps> = ({ note, level, activeNoteId, onNoteSelect, onStarNote, onPinNote, isInitiallyOpen = false }) => {
  const [isOpen, setIsOpen] = React.useState(isInitiallyOpen);
  const hasChildren = note.children && note.children.length > 0;

  React.useEffect(() => {
    setIsOpen(isInitiallyOpen);
  }, [isInitiallyOpen]);

  return (
    <div>
      <button
        onClick={() => onNoteSelect(note.id)}
        className={cn(
          'w-full text-left p-2 pr-4 border-b border-border transition-colors flex items-center gap-2',
          activeNoteId === note.id ? 'bg-primary/10' : 'hover:bg-secondary'
        )}
        style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
      >
        <div className="flex items-center gap-2 flex-1 overflow-hidden">
          {hasChildren ? (
            <ChevronRight
              className={cn('w-4 h-4 shrink-0 transition-transform', isOpen && 'rotate-90')}
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(!isOpen);
              }}
            />
          ) : (
            <div className="w-4 h-4 shrink-0" /> // Placeholder for alignment
          )}
          <span className="text-lg shrink-0">{note.icon || '📝'}</span>
          <div className="flex-1 overflow-hidden">
            <h3 className="font-semibold truncate">{note.title}</h3>
            <p className="text-xs text-muted-foreground truncate">
              {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <PinButton noteId={note.id} isPinned={note.isPinned} onPinNote={onPinNote} />
            <StarRating noteId={note.id} rating={note.stars} onStarNote={onStarNote} />
        </div>
      </button>

      {hasChildren && isOpen && (
        <div className="relative">
           <div className="absolute left-0 top-0 bottom-0 ml-[1.1rem] w-px bg-border -z-10" />
            {note.children?.map(childNote => (
                <NoteTreeItem
                key={childNote.id}
                note={childNote}
                level={level + 1}
                activeNoteId={activeNoteId}
                onNoteSelect={onNoteSelect}
                onStarNote={onStarNote}
                onPinNote={onPinNote}
                isInitiallyOpen={isInitiallyOpen}
                />
            ))}
        </div>
      )}
    </div>
  );
};


const NotesSidebar: React.FC<NotesSidebarProps> = ({
  notes,
  activeNoteId,
  onNoteSelect,
  onStarNote,
  onPinNote,
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const noteTree = React.useMemo(() => {
    const sortedNotes = [...notes].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    const items: Record<string, Note & { children: Note[] }> = {};
    const roots: Note[] = [];

    sortedNotes.forEach(note => {
      items[note.id] = { ...note, children: [] };
    });

    sortedNotes.forEach(note => {
      if (note.parentId && items[note.parentId]) {
        items[note.parentId].children.push(items[note.id]);
      } else {
        roots.push(items[note.id]);
      }
    });

    return roots;
  }, [notes]);

  const filteredNotes = React.useMemo(() => {
    if (!searchTerm) return noteTree;
    
    const lowercasedFilter = searchTerm.toLowerCase();
    
    const filterTree = (nodes: Note[]): Note[] => {
      const result: Note[] = [];
      for (const node of nodes) {
        const children = node.children ? filterTree(node.children) : [];
        if (
          node.title.toLowerCase().includes(lowercasedFilter) ||
          (node.content && node.content.toLowerCase().includes(lowercasedFilter)) ||
          children.length > 0
        ) {
          result.push({ ...node, children });
        }
      }
      return result;
    };
    
    return filterTree(noteTree);
  }, [searchTerm, noteTree]);

  return (
    <div className="flex flex-col h-full bg-secondary/30 border-r">
      <div className="p-4 space-y-4 border-b">
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
        {filteredNotes.length > 0 ? (
          filteredNotes.map(note => (
            <NoteTreeItem
              key={note.id}
              note={note}
              level={0}
              activeNoteId={activeNoteId}
              onNoteSelect={onNoteSelect}
              onStarNote={onStarNote}
              onPinNote={onPinNote}
              isInitiallyOpen={!!searchTerm}
            />
          ))
        ) : (
          <p className="p-4 text-sm text-muted-foreground">No notes found.</p>
        )}
      </div>
    </div>
  );
};

export default NotesSidebar;
