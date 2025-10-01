"use client";

import * as React from 'react';
import { X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Note } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface VerticalNoteTabsProps {
  notes: Note[];
  activeNoteId: string | null;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
}

const VerticalNoteTabs: React.FC<VerticalNoteTabsProps> = ({ notes, activeNoteId, onTabSelect, onTabClose }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const activeTabRef = React.useRef<HTMLButtonElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isExpanded && activeTabRef.current) {
      activeTabRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeNoteId, isExpanded]);

  if (notes.length === 0) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div
        ref={containerRef}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className={cn(
          "relative bg-secondary/30 border-r z-10 transition-all duration-200 ease-in-out",
          isExpanded ? 'w-64' : 'w-12'
        )}
      >
        <div className="flex flex-col pt-2 overflow-y-auto h-full">
          {notes.map(note => (
            <Tooltip key={note.id} disableHoverableContent={isExpanded}>
              <TooltipTrigger asChild>
                <button
                  ref={note.id === activeNoteId ? activeTabRef : null}
                  onClick={() => onTabSelect(note.id)}
                  className={cn(
                    'flex items-center gap-2 w-full text-left p-2 rounded-none transition-colors text-sm shrink-0',
                    'hover:bg-secondary',
                    'justify-start',
                    activeNoteId === note.id
                      ? 'bg-primary/10'
                      : '',
                    isExpanded ? 'px-4' : 'px-3 justify-center'
                  )}
                >
                  <FileText className="w-5 h-5 shrink-0" />
                  <span className={cn(
                    "truncate transition-opacity duration-200",
                    isExpanded ? 'opacity-100' : 'opacity-0'
                  )}>
                    {note.title || 'Untitled Note'}
                  </span>
                  
                  {isExpanded && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full ml-auto shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTabClose(note.id);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </button>
              </TooltipTrigger>
              {!isExpanded && (
                 <TooltipContent side="right" sideOffset={5}>
                   <p>{note.title || 'Untitled Note'}</p>
                 </TooltipContent>
              )}
            </Tooltip>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default VerticalNoteTabs;
