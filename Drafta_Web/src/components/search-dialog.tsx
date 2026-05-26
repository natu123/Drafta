"use client";

import * as React from 'react';
import { Search, Inbox } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn, stripColorMarkdown } from '@/lib/utils';
import type { Note, Group } from '@/lib/types';
import { useLang } from '@/contexts/lang-context';

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: Note[];
  groups: Group[];
  onNoteSelect: (id: string) => void;
  onGroupSelect: (id: string) => void;
}

const SearchDialog: React.FC<SearchDialogProps> = ({
  open,
  onOpenChange,
  notes,
  groups,
  onNoteSelect,
  onGroupSelect,
}) => {
  const { t } = useLang();
  const [searchTerm, setSearchTerm] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setSearchTerm('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const filteredNotes = React.useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return notes
      .filter(n => !n.isDeleted && n.type !== 'separator')
      .filter(n =>
        n.title.toLowerCase().includes(term) ||
        (n.plainTextContent && n.plainTextContent.toLowerCase().includes(term))
      )
      .slice(0, 10);
  }, [notes, searchTerm]);

  const filteredGroups = React.useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return groups
      .filter(g => !g.isDeleted && g.type !== 'separator')
      .filter(g => g.name.toLowerCase().includes(term))
      .slice(0, 5);
  }, [groups, searchTerm]);

  const handleSelect = (type: 'note' | 'group', id: string) => {
    if (type === 'note') {
      onNoteSelect(id);
    } else {
      onGroupSelect(id);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>{t.searchTitle}</DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder={t.searchPlaceholder}
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {searchTerm.trim() === '' ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              {t.searchPrompt}
            </div>
          ) : filteredGroups.length === 0 && filteredNotes.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              {t.noResults}
            </div>
          ) : (
            <div className="pb-2">
              {filteredGroups.length > 0 && (
                <div>
                  <div className="px-4 py-1 text-xs font-medium text-muted-foreground uppercase">
                    {t.traysSection}
                  </div>
                  {filteredGroups.map(group => (
                    <button
                      key={group.id}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-secondary transition-colors"
                      )}
                      onClick={() => handleSelect('group', group.id)}
                    >
                      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <Inbox className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-medium truncate">{group.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {filteredNotes.length > 0 && (
                <div>
                  <div className="px-4 py-1 text-xs font-medium text-muted-foreground uppercase">
                    {t.memosSection}
                  </div>
                  {filteredNotes.map(note => (
                    <button
                      key={note.id}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-secondary transition-colors"
                      )}
                      onClick={() => handleSelect('note', note.id)}
                    >
                      <span className="text-xl shrink-0">{note.icon || '📝'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {stripColorMarkdown(note.title) || 'Untitled'}
                        </p>
                        {note.plainTextContent && (
                          <p className="text-xs text-muted-foreground truncate">
                            {note.plainTextContent}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SearchDialog;
