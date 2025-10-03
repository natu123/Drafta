
"use client";

import * as React from 'react';
import type { Note } from '@/lib/types';
import TiptapEditor from './tiptap-editor';


interface EditorProps {
  note: Note;
  onNoteUpdate: (updatedNote: Partial<Note>) => void;
  onIconChange: (id: string, icon: string) => void;
  onQuoteNote: (noteContent: string) => void;
}

const Editor: React.FC<EditorProps> = ({ note, onNoteUpdate, onIconChange, onQuoteNote }) => {
  
  const handleContentUpdate = React.useCallback((updates: { title: string, content: string }) => {
    onNoteUpdate(updates);
  }, [onNoteUpdate]);

  const handleIconSelect = React.useCallback((icon: string) => {
    onIconChange(note.id, icon);
  }, [onIconChange, note.id]);

  const handleQuoteClick = React.useCallback(() => {
    const selection = window.getSelection()?.toString().trim();
    if (selection) {
      onQuoteNote(selection);
    } else {
      // Basic conversion of HTML to text for quoting if nothing is selected.
      const tempDiv = document.createElement('div');
      // The editor content is now title + content
      tempDiv.innerHTML = `<h1>${note.title}</h1>${note.content}`;
      const textContent = tempDiv.textContent || tempDiv.innerText || '';
      onQuoteNote(textContent);
    }
  }, [onQuoteNote, note.title, note.content]);
  

  return (
    <div className="flex flex-col h-full">
        <TiptapEditor
          title={note.title}
          content={note.content}
          onNoteUpdate={handleContentUpdate}
          onQuote={handleQuoteClick}
          onIconChange={handleIconSelect}
          noteIcon={note.icon || '📝'}
        />
    </div>
  );
};

export default Editor;
