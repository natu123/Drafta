import * as React from 'react';
import { Bot, PlusCircle, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/icons';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';


interface HeaderProps {
  onToggleLeftSidebar: () => void;
  onToggleRightSidebar: () => void;
  isLeftSidebarOpen: boolean;
  isRightSidebarOpen: boolean;
  onNewNote: () => void;
}

const Header: React.FC<HeaderProps> = ({
  onToggleLeftSidebar,
  onToggleRightSidebar,
  onNewNote,
}) => {
  return (
    <header className="flex items-center justify-between h-14 px-4 border-b bg-background z-10">
      <TooltipProvider>
      <div className="flex items-center gap-2">
        <AppLogo className="h-8 w-8 text-primary" />
        <h1 className="text-xl font-bold font-headline tracking-tight">Draftio</h1>
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
                <PlusCircle className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>New Note</p>
            </TooltipContent>
          </Tooltip>
      </div>
      </TooltipProvider>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={onToggleRightSidebar}
        >
          <Bot className="h-5 w-5 mr-2" />
          Prōla
        </Button>
      </div>
    </header>
  );
};

export default Header;
