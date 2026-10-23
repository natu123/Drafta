"use client";

import * as React from 'react';
import type { Note } from '@/lib/types';
import TiptapEditor from './tiptap-editor';


interface EditorProps {
  externalRevision?: number;
  continuityKey?: string;
  note: Note;
  onNoteUpdate: (updatedNote: Partial<Note>, noteId: string) => void;
  onIconChange: (id: string, icon: string) => void;
  scrollDirection?: 'top' | 'bottom';
  onDuplicate?: () => void;
  memoActions?: React.ReactNode;
}

const Editor: React.FC<EditorProps> = ({ note, onNoteUpdate, onIconChange, scrollDirection, onDuplicate, externalRevision, continuityKey, memoActions }) => {

  const handleContentUpdate = React.useCallback((updates: Partial<Note>, noteId: string) => {
    onNoteUpdate(updates, noteId);
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
        onDuplicate={onDuplicate}
        memoActions={memoActions}
      />
    </div>
  );
};

export default Editor;
