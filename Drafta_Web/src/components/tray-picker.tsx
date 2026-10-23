'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { useLang } from '@/contexts/lang-context';
import { mobileCopy } from '@/lib/mobile-copy';
import type { Group } from '@/lib/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from './ui/dropdown-menu';

/**
 * The tray a memo added in the all memos view goes to: a chip with the tray's name that opens the
 * list of trays (AGENTS.md, All Memos). `onPicked` takes the focus back after a choice, such as to
 * the open title field.
 */
export function TrayPicker({ trays, value, onChange, onPicked }: { trays: Group[]; value: Group; onChange: (id: string) => void; onPicked?: () => void }) {
  const { t, lang } = useLang();
  const copy = mobileCopy[lang];
  const name = (tray: Group) => tray.name || t.untitledTray;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="tray-chip" aria-label={`${copy.addTarget}: ${name(value)}`} title={copy.addTarget}>
          <span className="min-w-0 truncate">{name(value)}</span>
          <ChevronDown aria-hidden="true" className="size-3.5 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[min(20rem,50dvh)] max-w-[min(18rem,calc(100vw-16px))] overflow-y-auto"
        onCloseAutoFocus={event => { if (onPicked) { event.preventDefault(); onPicked(); } }}>
        <DropdownMenuLabel>{copy.addTarget}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value.id} onValueChange={onChange}>
          {trays.map(tray => <DropdownMenuRadioItem key={tray.id} value={tray.id}><span className="truncate">{name(tray)}</span></DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
