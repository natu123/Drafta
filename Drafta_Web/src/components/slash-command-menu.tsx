"use client";

import * as React from 'react';
import { createPortal } from 'react-dom';
import type { Editor, ChainedCommands } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { useLang } from '@/contexts/lang-context';
import { cn } from '@/lib/utils';

type Command = { id: string; label: string; aliases: string; run: (chain: ChainedCommands) => boolean };
type MenuState = { from: number; to: number; query: string; x: number; y: number; index: number; items: Command[] };

export function SlashCommandMenu({ editor, enabled }: { editor: Editor; enabled: boolean }) {
  const { t } = useLang();
  const [menu, setMenu] = React.useState<MenuState | null>(null);
  const menuRef = React.useRef<MenuState | null>(null);
  const elementRef = React.useRef<HTMLDivElement>(null);
  const dismissed = React.useRef('');
  const menuId = React.useId();
  const publish = React.useCallback((next: MenuState | null) => { menuRef.current = next; setMenu(next); }, []);
  const execute = React.useCallback((index: number) => {
    const current = menuRef.current;
    const command = current?.items[index];
    if (!current || !command) return;
    publish(null);
    command.run(editor.chain().focus().deleteRange({ from: current.from, to: current.to }));
  }, [editor, publish]);

  React.useEffect(() => {
    const commands: Command[] = [
      { id: 'paragraph', label: t.commandParagraph, aliases: 'paragraph text', run: chain => chain.setParagraph().run() },
      ...([1, 2, 3] as const).map(level => ({ id: `h${level}`, label: `${t.commandHeading} ${level}`, aliases: `h${level} heading${level}`, run: (chain: ChainedCommands) => chain.setHeading({ level }).run() })),
      { id: 'bullet', label: t.bulletList, aliases: 'bullet list ul', run: chain => chain.toggleBulletList().run() },
      { id: 'ordered', label: t.numberedList, aliases: 'number ordered list ol', run: chain => chain.toggleOrderedList().run() },
      { id: 'task', label: t.checkboxList, aliases: 'task todo checkbox', run: chain => chain.toggleTaskList().run() },
      { id: 'quote', label: t.commandQuote, aliases: 'quote blockquote', run: chain => chain.toggleBlockquote().run() },
      { id: 'code', label: t.commandCodeBlock, aliases: 'code block', run: chain => chain.setCodeBlock().run() },
      { id: 'divider', label: t.addSeparator, aliases: 'divider horizontal rule hr', run: chain => chain.setHorizontalRule().run() },
      { id: 'table', label: t.commandTable, aliases: 'table tables', run: chain => chain.insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run() },
    ];
    const update = () => {
      const { $from, empty } = editor.state.selection;
      const match = /^\/([^\n]*)$/.exec($from.parent.textBetween(0, $from.parentOffset, '\n'));
      if (!match) dismissed.current = '';
      const token = `${$from.start()}:${match?.[1].toLocaleLowerCase().trim()}`;
      if (!enabled || !editor.isEditable || !editor.isFocused || !empty || $from.parent.type.name !== 'paragraph' || !match || token === dismissed.current) {
        if (menuRef.current) publish(null);
        return;
      }
      const query = match[1].toLocaleLowerCase().trim();
      const items = commands.filter(command => `${command.label} ${command.aliases}`.toLocaleLowerCase().includes(query));
      const coords = editor.view.coordsAtPos($from.pos);
      const height = Math.min(320, items.length * 40 + 44);
      const current = menuRef.current;
      const next = { from: $from.start(), to: $from.pos, query, items, index: current?.query === query ? Math.min(current.index, Math.max(0, items.length - 1)) : 0, x: Math.max(8, Math.min(coords.left, window.innerWidth - 288)), y: Math.max(8, Math.min(coords.bottom + 8, window.innerHeight - height - 8)) };
      if (!current || ['from', 'to', 'query', 'x', 'y'].some(key => current[key as keyof MenuState] !== next[key as keyof MenuState])) publish(next);
    };
    const key = new PluginKey('draftaSlashCommands');
    editor.registerPlugin(new Plugin({ key, props: { handleKeyDown: (view, event) => {
      const current = menuRef.current;
      if (!current || event.isComposing || view.composing) return false;
      if (event.key === 'Escape') {
        dismissed.current = `${current.from}:${current.query}`;
        publish(null);return true;
      }
      if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && current.items.length) {
        publish({ ...current, index: (current.index + (event.key === 'ArrowDown' ? 1 : -1) + current.items.length) % current.items.length });return true;
      }
      if (event.key === 'Enter' && current.items.length) { execute(current.index);return true; }
      return false;
    } } }), (plugin, plugins) => [plugin, ...plugins]);
    const dismissOutside = (event: Event) => {
      if (elementRef.current?.contains(event.target as Node)) return;
      if (menuRef.current) { dismissed.current = `${menuRef.current.from}:${menuRef.current.query}`;publish(null); }
    };
    editor.on('transaction', update);
    document.addEventListener('pointerdown', dismissOutside);
    document.addEventListener('scroll', dismissOutside, true);
    window.addEventListener('resize', dismissOutside);
    update();
    return () => {
      editor.off('transaction', update);editor.unregisterPlugin(key);
      document.removeEventListener('pointerdown', dismissOutside);
      document.removeEventListener('scroll', dismissOutside, true);
      window.removeEventListener('resize', dismissOutside);
    };
  }, [editor, enabled, t, execute, publish]);

  React.useEffect(() => {
    elementRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [menu?.index]);

  if (!menu || !enabled) return null;
  return createPortal(
    <div ref={elementRef} id={menuId} role="listbox" aria-label={t.commandMenu} className="fixed z-50 w-[280px] max-w-[calc(100vw-16px)] max-h-[min(320px,60dvh)] overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md" style={{ left: menu.x, top: menu.y }}>
      <div className="px-2 py-1 text-xs text-muted-foreground">{t.commandMenu}</div>
      {menu.items.length ? menu.items.map((command, index) => <button key={command.id} type="button" role="option" aria-selected={menu.index === index} onMouseDown={event => event.preventDefault()} onClick={() => execute(index)} className={cn('flex min-h-10 w-full items-center rounded px-2 text-start text-sm hover:bg-accent hover:text-accent-foreground', menu.index === index && 'bg-accent text-accent-foreground')}>{command.label}</button>) : <p className="px-2 py-2 text-sm">{t.noResults}</p>}
    </div>, document.body,
  );
}
