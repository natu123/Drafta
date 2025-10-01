import * as React from 'react';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
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
          size="icon"
          onClick={onToggleRightSidebar}
          className={cn("hidden md:flex transition-transform", isRightSidebarOpen && "rotate-180")}
        >
          <ChevronsLeft />
          <span className="sr-only">Toggle AI Sidebar</span>
        </Button>
      </div>
    </header>
  );
};

export default Header;
