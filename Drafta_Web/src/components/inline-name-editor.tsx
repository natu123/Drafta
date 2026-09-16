"use client";

import * as React from 'react';
import { Check, X, Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem } from './ui/dropdown-menu';
import { useLang } from '@/contexts/lang-context';

export function InlineNameEditor({ initialValue = '', label, placeholder, confirmLabel, onConfirm, onCancel }: {
  initialValue?: string; label: string; placeholder: string; confirmLabel: string;
  onConfirm: (value: string) => void; onCancel: () => void;
}) {
  const { t } = useLang();
  const [value, setValue] = React.useState(initialValue);
  const composing = React.useRef(false);
  const submitted = React.useRef(false);
  return (
    <form className="flex min-w-0 flex-1 items-center gap-1" aria-label={label}
      onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}
      onKeyDown={event => {
        event.stopPropagation();
        if (event.nativeEvent.isComposing || composing.current || event.keyCode === 229) {
          if (event.key === 'Enter') event.preventDefault();
          return;
        }
        if (event.key === 'Escape') { event.preventDefault(); onCancel(); }
      }}
      onSubmit={event => {
        event.preventDefault();
        if (composing.current || submitted.current) return;
        submitted.current = true;
        onConfirm(value.trim());
      }}>
      <Input autoFocus aria-label={label} placeholder={placeholder} value={value}
        className="min-w-0 flex-1" onChange={event => setValue(event.target.value)}
        onFocus={event => event.target.select()}
        onCompositionStart={() => { composing.current = true; }}
        onCompositionEnd={() => { composing.current = false; }} />
      <Button type="submit" size="icon" variant="ghost" className="size-9 shrink-0" aria-label={confirmLabel}><Check /></Button>
      <Button type="button" size="icon" variant="ghost" className="size-9 shrink-0" aria-label={t.cancel} onClick={onCancel}><X /></Button>
    </form>
  );
}

export function InlineCreate({ label, placeholder, onCreate }: { label: string; placeholder: string; onCreate: (value: string) => void }) {
  const { t } = useLang();
  const [editing, setEditing] = React.useState(false);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const close = () => { setEditing(false); requestAnimationFrame(() => trigger.current?.focus()); };
  return editing ? <InlineNameEditor label={label} placeholder={placeholder} confirmLabel={t.create}
    onConfirm={value => { onCreate(value); close(); }} onCancel={close} /> : (
    <Button ref={trigger} variant="outline" className="w-full justify-start h-10" onClick={() => setEditing(true)}><Plus />{label}</Button>
  );
}

export function TrayMenu({ label, onRename, onDelete }: { label: string; onRename: () => void; onDelete: () => void }) {
  const { t } = useLang();
  const chosen = React.useRef(false);
  return <div onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button type="button" size="icon" variant="ghost" className="tray-menu-trigger size-8 shrink-0" aria-label={label}><MoreHorizontal /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" onCloseAutoFocus={event => { if (chosen.current) { event.preventDefault(); chosen.current = false; } }}>
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={() => { chosen.current = true; onRename(); }}><Pencil />{t.renameTray}</DropdownMenuItem>
          <DropdownMenuItem onSelect={onDelete}><Trash2 />{t.delete}</DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>;
}
