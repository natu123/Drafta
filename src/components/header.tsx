import * as React from 'react';
import { ChevronsLeft, ChevronsRight, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/icons';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onToggleLeftSidebar: () => void;
  onToggleRightSidebar: () => void;
  isLeftSidebarOpen: boolean;
  isRightSidebarOpen: boolean;
}

const Header: React.FC<HeaderProps> = ({
  onToggleLeftSidebar,
  onToggleRightSidebar,
  isLeftSidebarOpen,
  isRightSidebarOpen,
}) => {
  return (
    <header className="flex items-center justify-between h-14 px-4 border-b bg-background z-10">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleLeftSidebar}
          className="hidden md:flex"
        >
          {isLeftSidebarOpen ? <ChevronsLeft /> : <ChevronsRight />}
          <span className="sr-only">Toggle Notes Sidebar</span>
        </Button>
        <AppLogo className="h-6 w-6 text-primary" />
        <h1 className="text-lg font-bold font-headline tracking-tight">Draftio × Prōla</h1>
      </div>
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
