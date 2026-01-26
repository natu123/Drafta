"use client";

import * as React from 'react';
import { FilePlus, History, Settings, PanelLeft, AppWindow, Feather } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { HistoryItem } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';

interface HistoryNavProps {
  history: HistoryItem[];
  onHistorySelect: (id: string, type: 'note') => void;
}

const HistoryNav: React.FC<HistoryNavProps> = ({ history, onHistorySelect }) => {
  if (history.length === 0) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative">
              <Button variant="ghost" size="icon" disabled>
                <History className="h-5 w-5" />
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>No History</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Sort history: Newest (latest accessed) at the bottom.
  // Assuming history comes in as [oldest ... newest] or [newest ... oldest]?
  // The 'history' prop usually maintains order. Let's assume standard stack behavior: newest addition is at end or beginning.
  // Actually, usually "History" lists newest at top. User requested "新しいものほど下にして" (Newer items at the bottom).
  // If `history` is currently [newest, ..., oldest], we should reverse it.
  // Let's first ensure we have a stable sort or just use index.
  // Let's assume input `history` is sorted by time.
  // We will assume the passed `history` array needs to be reversed if it's currently showing newest at top.
  // Standard UI behavior: usually newest at top.
  // The user wants: "新しいものほど下にして" -> Newest at bottom.
  // So if `history` is [newest, item2, item3], we want to render [item3, item2, newest].
  // Let's Create a local copy to manipulate.
  const [isExpanded, setIsExpanded] = React.useState(false);

  // Logic: 
  // 1. Sort/Reverse to get Newest at Bottom. 
  //    - If `history` comes from `addToHistory` (unshift), index 0 is newest.
  //    - If we want newest at bottom, we should reverse it.
  const sortedHistory = [...history].reverse();

  // 2. Slice based on expansion
  //    - Initial: show 3 items. 
  //    - Expanded: show up to 10 items.
  //    - BUT: which 3 items? Usually the *most recent* 3 items.
  //    - If newest is at bottom, the "most recent 3" are the *last* 3 of the sorted array.
  //    - Example: [old, mid, new]. Most recent = new. 
  //    - Wait, if standard history is [new, mid, old] (Index 0 = latest).
  //    - User moves Newest to Bottom -> [old, mid, new].
  //    - "Initially display 3": Typically you want to see the 3 most recent notes.
  //    - So we should take the *top 3 most recent* (which are now at the bottom).
  //    - So we need the *last* 3 items of the reversed array.

  const MAX_INITIAL = 3;
  const MAX_EXPANDED = 10;

  const displayCount = isExpanded ? MAX_EXPANDED : MAX_INITIAL;

  // If we simply slice the first N items of reversed array, we get the OLDEST items.
  // We want the RECENT items, which are at the END of the reversed array.
  // So we should take `sortedHistory.slice(-displayCount)`.
  const visibleHistory = sortedHistory.slice(-displayCount);

  return (
    <DropdownMenu onOpenChange={(open) => !open && setIsExpanded(false)}>
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <History className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Open History</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel>Recently Opened</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* If there are more items than displayed, and we are NOT expanded, show "..." or "Expand" at the TOP? 
            Since newer items are at the bottom, earlier items (history) are "above". 
            So "Show More" effectively reveals older items at the top. */}

        {!isExpanded && history.length > MAX_INITIAL && (
          <>
            <Button
              variant="ghost"
              className="w-full text-xs h-6 mb-1 text-muted-foreground"
              onClick={(e) => { e.preventDefault(); setIsExpanded(true); }}
            >
              Show Previous
            </Button>
            <DropdownMenuSeparator />
          </>
        )}

        {visibleHistory.map(item => (
          <DropdownMenuItem key={item.id} onSelect={() => onHistorySelect(item.id, item.type)}>
            <span className="mr-2 text-lg">{item.icon || '📝'}</span>
            <div className="flex flex-col">
              <span className="font-medium truncate">{item.title}</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(item.accessedAt), { addSuffix: true })}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};


interface HeaderProps {
  onToggleView: () => void;
  activeView: 'home' | 'editor';
  onNewNote: () => void;
  onOpenSettings: () => void;
  history: HistoryItem[];
  onHistorySelect: (id: string, type: 'note') => void;
}

const Header: React.FC<HeaderProps> = ({
  onToggleView,
  activeView,
  onNewNote,
  onOpenSettings,
  history,
  onHistorySelect,
}) => {
  return (
    <header className="flex items-center h-[57px] px-4 border-b bg-background z-50">
      {/* Left: Logo Section */}
      <div className="flex-1 flex items-center gap-2">
        <Feather className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold font-headline tracking-tight text-foreground">Drafta</h1>
      </div>

      {/* Center: Main Actions Section */}
      <div className="flex items-center gap-1">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onNewNote}>
                <FilePlus className="h-5 w-5 text-accent" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>New note</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleView}
                className="hidden md:flex"
              >
                {activeView === 'home' ? <PanelLeft className="h-5 w-5" /> : <AppWindow className="h-5 w-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{activeView === 'home' ? 'Writing Mode' : 'Home'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Right: Util Actions Section */}
      <div className="flex-1 flex items-center justify-end gap-2">
        <HistoryNav history={history} onHistorySelect={onHistorySelect} />
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onOpenSettings}>
                <Settings className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Settings</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </header>
  );
};

export default Header;
