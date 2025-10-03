
"use client";

import * as React from 'react';
import { X, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Note, Web, Talk } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

type TabItem = (Note | Web | Talk) & { type: 'note' | 'web' | 'talk' };

interface VerticalTabsProps {
  items: TabItem[];
  activeId: string | null;
  onTabSelect: (id: string, type: 'note' | 'web' | 'talk') => void;
  onTabClose: (id: string, type: 'note' | 'web' | 'talk') => void;
}

const VerticalTabs: React.FC<VerticalTabsProps> = ({ items, activeId, onTabSelect, onTabClose }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const activeTabRef = React.useRef<HTMLButtonElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isExpanded && activeTabRef.current) {
      activeTabRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeId, isExpanded]);

  if (items.length === 0) {
    return null;
  }

  const getIcon = (item: TabItem) => {
    if (item.type === 'note') return item.icon || '📝';
    if (item.type === 'web') return item.icon || '🌐';
    if (item.type === 'talk') return item.icon || '💬';
    return '❓';
  };

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
          {items.map(item => (
            <Tooltip key={`${item.id}-${item.type}`} disableHoverableContent={isExpanded}>
              <TooltipTrigger asChild>
                <button
                  ref={item.id === activeId ? activeTabRef : null}
                  onClick={() => onTabSelect(item.id, item.type)}
                  className={cn(
                    'flex items-center gap-2 w-full text-left p-2 rounded-none transition-colors text-sm shrink-0',
                    'hover:bg-secondary',
                    'justify-start',
                    activeId === item.id
                      ? 'bg-primary/10'
                      : '',
                    isExpanded ? 'px-4' : 'px-3 justify-center'
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
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default VerticalTabs;
