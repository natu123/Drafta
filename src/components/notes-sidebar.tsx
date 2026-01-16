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
  onReorderNote?: (draggedId: string, targetId: string, position: 'before' | 'after' | 'inside') => void;
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

  // DnD Props
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  onDragLeave: (e: React.DragEvent) => void;
  dropTargetId: string | null;
  dropPosition: 'before' | 'after' | 'inside' | null;
}

const NoteTreeItem: React.FC<NoteTreeItemProps> = ({
  note,
  level,
  activeNoteId,
  onNoteSelect,
  onStarNote,
  onPinNote,
  isInitiallyOpen = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragLeave,
  dropTargetId,
  dropPosition
}) => {
  const [isOpen, setIsOpen] = React.useState(isInitiallyOpen);
  const hasChildren = note.children && note.children.length > 0;

  React.useEffect(() => {
    setIsOpen(isInitiallyOpen);
  }, [isInitiallyOpen]);

  // Visual indicators
  const isDropTarget = dropTargetId === note.id;

  return (
    <div className="relative">
      {/* Drop Indicator Lines */}
      {isDropTarget && dropPosition === 'before' && (
        <div className="absolute top-0 left-2 right-2 h-0.5 bg-primary z-20" />
      )}

      {note.type === 'separator' ? (
        <div
          draggable
          onDragStart={(e) => onDragStart(e, note.id)}
          onDragOver={(e) => onDragOver(e, note.id)}
          onDrop={(e) => onDrop(e, note.id)}
          onDragLeave={onDragLeave}
          className="w-full flex items-center py-2 relative group"
          style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
        >
          <div className="flex-1 h-px bg-border bg-opacity-50" />
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          draggable
          onDragStart={(e) => onDragStart(e, note.id)}
          onDragOver={(e) => onDragOver(e, note.id)}
          onDrop={(e) => onDrop(e, note.id)}
          onDragLeave={onDragLeave}
          onClick={() => onNoteSelect(note.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNoteSelect(note.id);
            }
          }}
          className={cn(
            'w-full text-left p-2 pr-4 border-b border-border transition-colors flex items-center gap-2 cursor-pointer relative',
            activeNoteId === note.id ? 'bg-primary/10' : 'hover:bg-secondary',
            isDropTarget && dropPosition === 'inside' ? 'bg-primary/20' : ''
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
        </div>
      )}

      {isDropTarget && dropPosition === 'after' && (
        <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary z-20" />
      )}

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
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDragLeave={onDragLeave}
              dropTargetId={dropTargetId}
              dropPosition={dropPosition}
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
  onReorderNote,
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  // DnD State
  const [draggedNoteId, setDraggedNoteId] = React.useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = React.useState<string | null>(null);
  const [dropPosition, setDropPosition] = React.useState<'before' | 'after' | 'inside' | null>(null);

  const noteTree = React.useMemo(() => {
    // Sort logic: Pinned first, then by Original Order (Index).
    // PRESERVING ORIGINAL ORDER ALLOWS MANUAL SORTING.
    // We only sort pinned vs unpinned.
    const sortedNotes = [...notes].sort((a, b) => {
      // 1. Pinned status priority
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      // 2. Otherwise default to array order (stable sort) effectively, 
      // or ensure we aren't randomizing it. 
      // Array.sort is stable in modern JS.
      return 0;
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

  // DnD Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    // e.dataTransfer.setData('text/plain', id); // Could use this
    setDraggedNoteId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault(); // allow drop
    if (draggedNoteId === targetId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const height = rect.height;

    // Logic for Before/Inside/After
    // Top 25% -> Before
    // Bottom 25% -> After
    // Middle 50% -> Inside (if it can have children, or just reorder if simple list)

    // For now, let's keep it simple: Top 50% = Before, Bottom 50% = After
    // To support nesting, we'd add 'Inside'. 
    // Let's try 3 zones:
    const zoneHeight = height / 4; // 25%

    if (offsetY < zoneHeight) {
      setDropPosition('before');
    } else if (offsetY > height - zoneHeight) {
      setDropPosition('after');
    } else {
      setDropPosition('inside');
    }

    setDropTargetId(targetId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Determine if we actually left the container or just child
    // e.preventDefault();
    // setDropTargetId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedNoteId && dropPosition && onReorderNote) {
      onReorderNote(draggedNoteId, targetId, dropPosition);
    }
    setDraggedNoteId(null);
    setDropTargetId(null);
    setDropPosition(null);
  };

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
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragLeave={handleDragLeave}
              dropTargetId={dropTargetId}
              dropPosition={dropPosition}
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
