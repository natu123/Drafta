
"use client";

import * as React from 'react';
import { X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Note, OpenTab } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

type TabItem = Note & { type: 'note' };

interface VerticalTabsProps {
  items: TabItem[];
  activeId: string | null;
  onTabSelect: (id: string, type: 'note') => void;
  onTabClose: (id: string, type: 'note') => void;
  onReorderTabs: (draggedId: string, targetId: string) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

const VerticalTabs: React.FC<VerticalTabsProps> = ({ items, activeId, onTabSelect, onTabClose, onReorderTabs, searchTerm, onSearchChange }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const activeTabRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const [draggedItem, setDraggedItem] = React.useState<OpenTab | null>(null);
  const [dropIndex, setDropIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeId]);

  if (items.length === 0) {
    return null;
  }

  const getIcon = (item: TabItem) => {
    if (item.type === 'note') return item.icon || '📝';
    return '❓';
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, item: OpenTab) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    setDropIndex(index);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // This is necessary to allow dropping
  };

  const handleDrop = (e: React.DragEvent, targetId?: string) => {
    e.preventDefault();
    if (draggedItem && (targetId || dropIndex === items.length)) {
      const finalTargetId = targetId || items[items.length - 1].id;
      // If dropping at the end, we need the parent to handle "after last" logic or we just target the last item.
      // For simplicity in the parent, we'll just send the IDs.
      // If dropIndex === items.length, it means we are dropping after the last visible item.
      onReorderTabs(draggedItem.id, finalTargetId);
    }
    resetDragState();
  };

  const resetDragState = () => {
    setDraggedItem(null);
    setDropIndex(null);
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div
        ref={containerRef}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className={cn(
          "relative bg-secondary/30 border-r z-10 flex flex-col h-full",
          isExpanded ? 'w-64' : 'w-12'
        )}
      >
        <div className="flex flex-col pt-2 overflow-y-auto flex-1">
          {isExpanded && (
            <div className="px-3 pb-2 transition-all duration-200">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter tabs..."
                  className="pl-8 h-8 text-xs bg-background/50"
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}
          {!isExpanded && (
            <div className="flex justify-center pb-2">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          {items.map((item, index) => (
            <div key={`${item.id}-${item.type}`} className="relative">
              {dropIndex === index && (
                <div className="absolute top-0 left-2 right-2 h-0.5 bg-primary z-20" />
              )}
              <Tooltip disableHoverableContent={isExpanded}>
                <TooltipTrigger asChild>
                  <div
                    ref={item.id === activeId ? activeTabRef : null}
                    onClick={() => onTabSelect(item.id, item.type)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, { id: item.id, type: item.type })}
                    onDragEnter={(e) => handleDragEnter(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, item.id)}
                    onDragEnd={resetDragState}
                    role="button"
                    tabIndex={0}
                    aria-label={item.title || 'Untitled Note'}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onTabSelect(item.id, item.type);
                      }
                    }}
                    className={cn(
                      'flex items-center gap-2 w-full text-left p-2 rounded-none transition-colors text-sm shrink-0 relative cursor-pointer',
                      'hover:bg-secondary',
                      'justify-start',
                      activeId === item.id ? 'bg-primary/10' : '',
                      isExpanded ? 'px-4' : 'px-3 justify-center',
                      draggedItem?.id === item.id && draggedItem?.type === item.type ? 'opacity-50' : 'opacity-100'
                    )}
                  >
                    <span className="text-xl shrink-0">{getIcon(item)}</span>
                    <span className={cn(
                      "truncate",
                      isExpanded ? 'opacity-100' : 'opacity-0'
                    )}>
                      {item.title || 'Untitled'}
                    </span>

                    {isExpanded && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full ml-auto shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTabClose(item.id, item.type);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </TooltipTrigger>
                {!isExpanded && (
                  <TooltipContent side="right" sideOffset={5}>
                    <p>{item.title || 'Untitled'}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          ))}
          {/* Drop zone for the end of the list */}
          <div
            className="flex-1 min-h-[50px] relative"
            onDragEnter={(e) => handleDragEnter(e, items.length)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e)}
          >
            {dropIndex === items.length && (
              <div className="absolute top-0 left-2 right-2 h-0.5 bg-primary z-20" />
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default VerticalTabs;
