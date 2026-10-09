"use client";

import * as React from 'react';
import type { Note } from '@/lib/types';
import TiptapEditor from './tiptap-editor';


interface EditorProps {
  externalRevision?: number;
  continuityKey?: string;
  note: Note;
  onNoteUpdate: (updatedNote: Partial<Note>) => void;
  onIconChange: (id: string, icon: string) => void;
  scrollDirection?: 'top' | 'bottom';
  navigationAction?: React.ReactNode;
  onDelete?: () => void;
  onDuplicate?: () => void;
  historyAction?: React.ReactNode;
}

const Editor: React.FC<EditorProps> = ({ note, onNoteUpdate, onIconChange, scrollDirection, navigationAction, onDelete, onDuplicate, externalRevision, continuityKey, historyAction }) => {

  const handleContentUpdate = React.useCallback((updates: Partial<Note>) => {
    onNoteUpdate(updates);
  }, [onNoteUpdate]);

  const handleIconSelect = React.useCallback((icon: string) => {
    onIconChange(note.id, icon);
  }, [onIconChange, note.id]);


  return (
    <div className="flex flex-col h-full w-full">
      <TiptapEditor
        key={continuityKey ?? note.id}
        externalRevision={externalRevision}
        note={note}
        onNoteUpdate={handleContentUpdate}
        onIconChange={handleIconSelect}
        scrollDirection={scrollDirection}
        navigationAction={navigationAction}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        historyAction={historyAction}
      />
    </div>
  );
};

export default Editor;
