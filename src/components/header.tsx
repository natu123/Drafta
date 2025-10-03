import * as React from 'react';
import { Bot, FilePlus, PanelLeft, Globe, History, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/icons';
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
  onHistorySelect: (id: string, type: 'note' | 'web') => void;
}

const HistoryNav: React.FC<HistoryNavProps> = ({ history, onHistorySelect }) => {
  if (history.length === 0) {
    return (
       <TooltipProvider>
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

  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <History className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Recent History</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel>Recently Opened</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {history.map(item => (
          <DropdownMenuItem key={item.id} onSelect={() => onHistorySelect(item.id, item.type)}>
            <span className="mr-2 text-lg">{item.type === 'note' ? item.icon || '📝' : '🌐'}</span>
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
  onToggleLeftSidebar: () => void;
  onToggleRightSidebar: () => void;
  isLeftSidebarOpen: boolean;
  isRightSidebarOpen: boolean;
  onNewNote: () => void;
  onNewWeb: () => void;
  onOpenSettings: () => void;
  history: HistoryItem[];
  onHistorySelect: (id: string, type: 'note' | 'web') => void;
}

const Header: React.FC<HeaderProps> = ({
  onToggleLeftSidebar,
  onToggleRightSidebar,
  onNewNote,
  onNewWeb,
  onOpenSettings,
  history,
  onHistorySelect,
}) => {
  return (
    <header className="flex items-center justify-between h-14 px-4 border-b bg-background z-10">
      <div className="flex items-center gap-2">
        <AppLogo className="h-8 w-8 text-primary" />
        <h1 className="text-xl font-bold font-headline tracking-tight text-foreground">Prōla</h1>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleLeftSidebar}
                className="hidden md:flex"
              >
                <PanelLeft className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Note List</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onNewNote}>
                <FilePlus className="h-5 w-5 text-accent" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>New Note</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onNewWeb}>
                <Globe className="h-5 w-5 text-accent" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>New Web</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleRightSidebar}
              >
                <Bot className="h-5 w-5 text-accent" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>New Talk</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="flex items-center gap-2">
         <HistoryNav history={history} onHistorySelect={onHistorySelect} />
         <TooltipProvider>
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
