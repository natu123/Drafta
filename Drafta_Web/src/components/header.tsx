"use client";

import * as React from 'react';
import Link from 'next/link';
import { FilePlus, History, Settings, PanelLeft, AppWindow, Feather, Search, Globe } from 'lucide-react';
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
import { useLang } from '@/contexts/lang-context';
import { LANGS, LANG_LABEL } from '@/app/translations';

interface HistoryNavProps {
  history: HistoryItem[];
  onHistorySelect: (id: string, type: 'note') => void;
}

const HistoryNav: React.FC<HistoryNavProps> = ({ history, onHistorySelect }) => {
  const { t } = useLang();
  const [isExpanded, setIsExpanded] = React.useState(false);

  if (history.length === 0) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative">
              <Button variant="ghost" size="icon" aria-label={t.historyEmpty} disabled>
                <History className="h-5 w-5" />
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t.historyEmpty}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const sortedHistory = [...history].reverse();

  const MAX_INITIAL = 3;
  const MAX_EXPANDED = 10;

  const displayCount = isExpanded ? MAX_EXPANDED : MAX_INITIAL;
  const visibleHistory = sortedHistory.slice(-displayCount);

  return (
    <DropdownMenu onOpenChange={(open) => !open && setIsExpanded(false)}>
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t.historyOpen}>
                <History className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t.historyOpen}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel>{t.historyLabel}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {!isExpanded && history.length > MAX_INITIAL && (
          <>
            <Button
              variant="ghost"
              className="w-full text-xs h-6 mb-1 text-muted-foreground"
              onClick={(e) => { e.preventDefault(); setIsExpanded(true); }}
            >
              {t.historyShowPrev}
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
  onOpenSearch: () => void;
  history: HistoryItem[];
  onHistorySelect: (id: string, type: 'note') => void;
}

const Header: React.FC<HeaderProps> = ({
  onToggleView,
  activeView,
  onNewNote,
  onOpenSettings,
  onOpenSearch,
  history,
  onHistorySelect,
}) => {
  const { lang, setLang, t } = useLang();

  return (
    <header className="flex items-center h-[57px] px-2 sm:px-4 border-b bg-background z-50">
      {/* Left: Logo Section */}
      <div className="flex-1 min-w-0 flex items-center">
        <Link href="/" aria-label="Drafta" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Feather className="h-6 w-6 text-primary" />
          <h1 className="hidden sm:block text-2xl font-bold font-headline tracking-tight text-foreground">Drafta</h1>
        </Link>
      </div>

      {/* Center: Main Actions Section */}
      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t.newNote} onClick={onNewNote}>
                <FilePlus className="h-5 w-5 text-accent" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t.newNote}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t.search} onClick={onOpenSearch}>
                <Search className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t.search}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={activeView === 'home' ? t.writingMode : t.homeMode}
                onClick={onToggleView}
              >
                {activeView === 'home' ? <PanelLeft className="h-5 w-5" /> : <AppWindow className="h-5 w-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{activeView === 'home' ? t.writingMode : t.homeMode}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Right: Util Actions Section */}
      <div className="flex-1 min-w-0 flex items-center justify-end gap-0.5 sm:gap-1">
        <div className="hidden sm:block">
          <HistoryNav history={history} onHistorySelect={onHistorySelect} />
        </div>

        {/* Language Switcher */}
        <DropdownMenu>
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={t.language}>
                    <Globe className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t.language}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t.language}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {LANGS.map((l) => (
              <DropdownMenuItem
                key={l}
                onSelect={() => setLang(l)}
                className={lang === l ? 'bg-primary/10 text-primary font-medium' : ''}
              >
                {LANG_LABEL[l]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t.settings} onClick={onOpenSettings}>
                <Settings className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t.settings}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </header>
  );
};

export default Header;
