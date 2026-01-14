"use client";

import * as React from 'react';
import type { Note } from '@/lib/types';
import TiptapEditor from './tiptap-editor';


interface EditorProps {
  note: Note;
  onNoteUpdate: (updatedNote: Partial<Note>) => void;
  onIconChange: (id: string, icon: string) => void;
  scrollDirection?: 'top' | 'bottom';
}

const Editor: React.FC<EditorProps> = ({ note, onNoteUpdate, onIconChange, scrollDirection }) => {

  const handleContentUpdate = React.useCallback((updates: { title: string, content: string }) => {
    onNoteUpdate(updates);
  }, [onNoteUpdate]);

  const handleIconSelect = React.useCallback((icon: string) => {
    onIconChange(note.id, icon);
  }, [onIconChange, note.id]);


  return (
    <div className="flex flex-col h-full">
      <TiptapEditor
        note={note}
        onNoteUpdate={handleContentUpdate}
        onIconChange={handleIconSelect}
        scrollDirection={scrollDirection}
      />
    </div>
  );
};

export default Editor;
