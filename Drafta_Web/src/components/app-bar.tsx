"use client";

import * as React from 'react';
import Link from 'next/link';
import { Search, Settings } from 'lucide-react';
import { BrandIcon } from '@/components/brand-icon';
import { Button } from '@/components/ui/button';
import { LanguageMenu } from '@/components/header';
import { useLang } from '@/contexts/lang-context';

/**
 * The app-wide controls of tablets and PCs, at the top of the leftmost list column: the tray column
 * on PCs, the memo column on tablets, where `leading` opens the tray drawer. It replaced the common
 * header above the columns (AGENTS.md, Web Layout; specs/21_web_layout.md).
 */
export function AppBar({ accountMenu, onOpenSearch, onOpenSettings, leading }: {
  accountMenu?: React.ReactNode;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  leading?: React.ReactNode;
}) {
  const { t } = useLang();
  return (
    <div className="app-bar flex h-[57px] shrink-0 items-center gap-1 border-b bg-background px-2">
      {leading}
      <Link href="/" aria-label="Drafta" title="Drafta" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:opacity-80">
        <BrandIcon />
      </Link>
      <div className="ml-auto flex min-w-0 items-center [&_button]:h-8 [&_button]:w-8">
        <Button variant="ghost" size="icon" aria-label={t.search} title={t.search} onClick={onOpenSearch}>
          <Search className="h-[18px] w-[18px]" />
        </Button>
        <LanguageMenu />
        <Button variant="ghost" size="icon" aria-label={t.settings} title={t.settings} onClick={onOpenSettings}>
          <Settings className="h-[18px] w-[18px]" />
        </Button>
        {accountMenu}
      </div>
    </div>
  );
}
