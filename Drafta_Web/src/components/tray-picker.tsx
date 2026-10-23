'use client';

import * as React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useLang } from '@/contexts/lang-context';
import { mobileCopy } from '@/lib/mobile-copy';
import type { Group } from '@/lib/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from './ui/dropdown-menu';

/**
 * The tray a memo added in the all memos view goes to: a chip with the tray's name that opens the
 * list of trays (AGENTS.md, All Memos). `onPicked` takes the focus back after a choice, such as to
 * the open title field. `inline` opens the list right under the field it sits in, as part of it
 * (the phone's New field: a floating menu there sat under the dimmed backdrop and drifted away
 * from the chip when the keyboard closed, 0.10.2).
 */
export function TrayPicker({ trays, value, onChange, onPicked, inline = false }: {
  trays: Group[]; value: Group; onChange: (id: string) => void; onPicked?: () => void; inline?: boolean;
}) {
  const { t, lang } = useLang();
  const copy = mobileCopy[lang];
  const [open, setOpen] = React.useState(false);
  const listId = React.useId();
  const name = (tray: Group) => tray.name || t.untitledTray;
  const chip = (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" className="tray-chip" aria-label={`${copy.addTarget}: ${name(value)}`} title={copy.addTarget} {...props}>
      <span className="min-w-0 truncate">{name(value)}</span>
      <ChevronDown aria-hidden="true" className={inline && open ? 'size-3.5 shrink-0 rotate-180' : 'size-3.5 shrink-0'} />
    </button>
  );
  if (inline) return (
    <>
      {chip({ 'aria-expanded': open, 'aria-controls': listId, onClick: () => setOpen(value => !value) })}
      {open && (
        <div id={listId} role="listbox" aria-label={copy.addTarget} className="tray-chip-list">
          {trays.map(tray => (
            <button key={tray.id} type="button" role="option" aria-selected={tray.id === value.id} className="tray-chip-option"
              onClick={() => { onChange(tray.id); setOpen(false); onPicked?.(); }}>
              <Check aria-hidden="true" className="size-4 shrink-0" />
              <span className="min-w-0 truncate">{name(tray)}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{chip({})}</DropdownMenuTrigger>
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
