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
  navigationAction?: React.ReactNode;
  onDelete?: () => void;
  onDuplicate?: () => void;
  historyAction?: React.ReactNode;
  /** View only, while the memo bodies of a new device are still arriving (specs/17). */
  readOnly?: boolean;
}

const Editor: React.FC<EditorProps> = ({ note, onNoteUpdate, onIconChange, scrollDirection, navigationAction, onDelete, onDuplicate, externalRevision, continuityKey, historyAction, readOnly }) => {

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
        navigationAction={navigationAction}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        historyAction={historyAction}
        forceReadOnly={readOnly}
      />
    </div>
  );
};

export default Editor;
