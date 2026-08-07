"use client";

import * as React from 'react';
import type { Note } from '@/lib/types';
import TiptapEditor from './tiptap-editor';


interface EditorProps {
  note: Note;
  onNoteUpdate: (updatedNote: Partial<Note>) => void;
  onIconChange: (id: string, icon: string) => void;
  scrollDirection?: 'top' | 'bottom';
  navigationAction?: React.ReactNode;
}

const Editor: React.FC<EditorProps> = ({ note, onNoteUpdate, onIconChange, scrollDirection, navigationAction }) => {

  const handleContentUpdate = React.useCallback((updates: Partial<Note>) => {
    onNoteUpdate(updates);
  }, [onNoteUpdate]);

  const handleIconSelect = React.useCallback((icon: string) => {
    onIconChange(note.id, icon);
  }, [onIconChange, note.id]);


  return (
    <div className="flex flex-col h-full w-full">
      <TiptapEditor
        key={note.id}
        note={note}
        onNoteUpdate={handleContentUpdate}
        onIconChange={handleIconSelect}
        scrollDirection={scrollDirection}
        navigationAction={navigationAction}
      />
    </div>
  );
};

export default Editor;
