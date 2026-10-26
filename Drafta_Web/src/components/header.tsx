"use client";

import * as React from 'react';
import Image from 'next/image';
import { History, Globe } from 'lucide-react';
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
import { LANGUAGE_FLAGS } from '@/app/languages';

interface HistoryNavProps {
  history: HistoryItem[];
  onHistorySelect: (id: string, type: 'note') => void;
}

/** The recently opened memos, at the end of the tab strip on tablets and PCs (specs/21_web_layout.md). */
export const HistoryNav: React.FC<HistoryNavProps> = ({ history, onHistorySelect }) => {
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
              <span className="font-medium truncate">{item.title || t.untitledMemo}</span>
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


/** The language switcher, in the app bar on tablets and PCs or the tray list header on phones (specs/19, specs/21). */
export function LanguageMenu() {
  const { lang, setLang, t } = useLang();
  return (
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
            <Image src={`/flags/${LANGUAGE_FLAGS[l]}.svg`} alt="" width={20} height={20} className="shrink-0" />
            {LANG_LABEL[l]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
