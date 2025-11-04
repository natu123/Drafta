
"use client";

import * as React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Note, OpenTab } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

type TabItem = Note & { type: 'note' };

interface VerticalTabsProps {
  items: TabItem[];
  activeId: string | null;
  onTabSelect: (id: string, type: 'note') => void;
  onTabClose: (id: string, type: 'note') => void;
  onReorderTabs: (reorderedTabs: OpenTab[]) => void;
}

const VerticalTabs: React.FC<VerticalTabsProps> = ({ items, activeId, onTabSelect, onTabClose, onReorderTabs }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const activeTabRef = React.useRef<HTMLButtonElement>(null);
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
  
  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>, item: OpenTab) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLButtonElement>, index: number) => {
    e.preventDefault();
    setDropIndex(index);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault(); // This is necessary to allow dropping
  };

  const handleDrop = () => {
    if (draggedItem && dropIndex !== null) {
      const draggedIndex = items.findIndex(i => i.id === draggedItem.id && i.type === draggedItem.type);
      if (draggedIndex === -1) return;

      const newItems = [...items];
      const [removed] = newItems.splice(draggedIndex, 1);
      newItems.splice(dropIndex, 0, removed);
      
      onReorderTabs(newItems.map(i => ({id: i.id, type: i.type})));
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
          "relative bg-secondary/30 border-r z-10 transition-all duration-200 ease-in-out",
          isExpanded ? 'w-64' : 'w-12'
        )}
      >
        <div className="flex flex-col pt-2 overflow-y-auto h-full" onDragLeave={resetDragState} onDrop={handleDrop} onDragOver={handleDragOver}>
          {items.map((item, index) => (
            <div key={`${item.id}-${item.type}`} className="relative">
             {dropIndex === index && (
                <div className="absolute top-0 left-2 right-2 h-0.5 bg-primary z-20" />
              )}
              <Tooltip disableHoverableContent={isExpanded}>
                <TooltipTrigger asChild>
                  <button
                    ref={item.id === activeId ? activeTabRef : null}
                    onClick={() => onTabSelect(item.id, item.type)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, {id: item.id, type: item.type})}
                    onDragEnter={(e) => handleDragEnter(e, index)}
                    onDragEnd={resetDragState}
                    className={cn(
                      'flex items-center gap-2 w-full text-left p-2 rounded-none transition-colors text-sm shrink-0 relative',
                      'hover:bg-secondary',
                      'justify-start',
                      activeId === item.id ? 'bg-primary/10' : '',
                      isExpanded ? 'px-4' : 'px-3 justify-center',
                      draggedItem?.id === item.id && draggedItem?.type === item.type ? 'opacity-50' : 'opacity-100'
                    )}
                  >
                    <span className="text-xl shrink-0">{getIcon(item)}</span>
                    <span className={cn(
                      "truncate transition-opacity duration-200",
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
                  </button>
                </TooltipTrigger>
                {!isExpanded && (
                   <TooltipContent side="right" sideOffset={5}>
                     <p>{item.title || 'Untitled'}</p>
                   </TooltipContent>
                )}
              </Tooltip>
            </div>
          ))}
          {dropIndex === items.length && (
            <div className="relative h-1">
              <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary z-20" />
            </div>
           )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default VerticalTabs;
