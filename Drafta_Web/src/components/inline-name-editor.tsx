"use client";

import * as React from 'react';
import { Check, X, Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem } from './ui/dropdown-menu';
import { useLang } from '@/contexts/lang-context';

export function InlineNameEditor({ initialValue = '', label, placeholder, confirmLabel, onConfirm, onCancel, inputRef, compose = false, prefix }: {
  initialValue?: string; label: string; placeholder: string; confirmLabel: string;
  onConfirm: (value: string) => void; onCancel: () => void; inputRef?: React.Ref<HTMLInputElement>;
  /** The rounded look of an add field (InlineCreate) rather than a rename in place. */
  compose?: boolean;
  /** Shown before the field, such as the all memos view's tray chip. */
  prefix?: React.ReactNode;
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
      {prefix}
      <Input ref={inputRef} autoFocus aria-label={label} placeholder={placeholder} value={value}
        className={compose ? 'inline-create-input min-w-0 flex-1' : 'min-w-0 flex-1'} onChange={event => setValue(event.target.value)}
        onFocus={event => event.target.select()}
        onCompositionStart={() => { composing.current = true; }}
        onCompositionEnd={() => { composing.current = false; }} />
      <Button type="submit" size="icon" variant={compose ? 'default' : 'ghost'} className={compose ? 'size-9 shrink-0 rounded-full' : 'size-9 shrink-0'} aria-label={confirmLabel}><Check /></Button>
      <Button type="button" size="icon" variant="ghost" className="size-9 shrink-0" aria-label={t.cancel} onClick={onCancel}><X /></Button>
    </form>
  );
}

/** Lets another control open the field, like the phone's New button (specs/19_mobile_design.md). */
export type InlineCreateHandle = { open: () => void };

/**
 * `picker` puts a control at the start of the field, open or closed (the all memos view's tray chip);
 * in the open field it gets `onPicked`, which gives the focus back to the title. `buttonLabel` is the
 * closed field's text when the picker already says where the item goes; `label` names the open field.
 */
export function InlineCreate({ label, placeholder, onCreate, ref, picker, buttonLabel }: {
  label: string; placeholder: string; onCreate: (value: string) => void; ref?: React.Ref<InlineCreateHandle>;
  picker?: React.ReactElement<{ onPicked?: () => void }>; buttonLabel?: string;
}) {
  const { t } = useLang();
  const [editing, setEditing] = React.useState(false);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const input = React.useRef<HTMLInputElement>(null);
  // An open field keeps its draft and only takes the focus back.
  React.useImperativeHandle(ref, () => ({ open: () => { if (input.current) input.current.focus(); else setEditing(true); } }), []);
  const close = () => { setEditing(false); requestAnimationFrame(() => trigger.current?.focus()); };
  const refocus = React.useCallback(() => { input.current?.focus(); }, []);
  // A rounded field with a round + at its start, like the box new messages are written in (0.9.1).
  if (editing) return <InlineNameEditor compose inputRef={input} label={label} placeholder={placeholder} confirmLabel={t.create}
    prefix={picker && React.cloneElement(picker, { onPicked: refocus })} onConfirm={value => { onCreate(value); close(); }} onCancel={close} />;
  const opener = (
    <button ref={trigger} type="button" className={picker ? 'inline-create-main' : 'inline-create'} onClick={() => setEditing(true)}>
      <span aria-hidden="true" className="inline-create-plus"><Plus /></span>
      <span className="min-w-0 truncate">{buttonLabel ?? label}</span>
    </button>
  );
  return picker ? <div className="inline-create inline-create-with-picker">{picker}{opener}</div> : opener;
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
