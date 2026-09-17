"use client";
import * as React from 'react';
import type { Editor } from '@tiptap/react';
import { ChevronUp, ChevronDown, X } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { noteSearchKey } from './tiptap-extensions/note-search';
import { useLang } from '@/contexts/lang-context';

export function NoteFind({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const { t } = useLang();
  const [query, setQuery] = React.useState('');
  const [count, setCount] = React.useState({ total: 0, current: 0 });
  React.useEffect(() => {
    const update = () => { const state = noteSearchKey.getState(editor.state); setCount({ total: state?.matches.length ?? 0, current: state?.matches.length ? state.index + 1 : 0 }); };
    editor.on('transaction', update);
    return () => { editor.off('transaction', update); if (!editor.isDestroyed) editor.view.dispatch(editor.state.tr.setMeta(noteSearchKey, { query: '' })); };
  }, [editor]);
  const apply = (action: { query?: string; step?: number }) => {
    editor.view.dispatch(editor.state.tr.setMeta(noteSearchKey, action));
    requestAnimationFrame(() => editor.view.dom.querySelector('.note-find-current')?.scrollIntoView({ block: 'center', inline: 'nearest' }));
  };
  return <div className="note-find flex items-center gap-1 border-b p-2" role="search" aria-label={t.findInMemo}>
    <Input autoFocus className="min-w-0 flex-1" aria-label={t.findInMemo} value={query} placeholder={t.findInMemo}
      onChange={event => { setQuery(event.target.value); apply({ query: event.target.value }); }}
      onKeyDown={event => { if (event.nativeEvent.isComposing) return; if (event.key === 'Escape') { event.preventDefault(); onClose(); editor.commands.focus(); } if (event.key === 'Enter') { event.preventDefault(); apply({ step: event.shiftKey ? -1 : 1 }); } }} />
    <output className="text-xs whitespace-nowrap" aria-live="polite">{count.current}/{count.total}</output>
    <Button size="icon" variant="ghost" aria-label={t.previousMatch} disabled={!count.total} onClick={() => apply({ step: -1 })}><ChevronUp /></Button>
    <Button size="icon" variant="ghost" aria-label={t.nextMatch} disabled={!count.total} onClick={() => apply({ step: 1 })}><ChevronDown /></Button>
    <Button size="icon" variant="ghost" aria-label={t.cancel} onClick={onClose}><X /></Button>
  </div>;
}
