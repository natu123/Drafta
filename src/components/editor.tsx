
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
  
  const handleContentChange = (htmlContent: string) => {
    onNoteUpdate({ content: htmlContent });
  };
  
  const handleTitleChange = (newTitle: string) => {
    onNoteUpdate({ title: newTitle });
  };

  const handleIconSelect = (icon: string) => {
    onIconChange(note.id, icon);
  };

  const handleQuoteClick = () => {
    // Basic conversion of HTML to text for quoting.
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = note.content;
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    onQuoteNote(textContent);
  };
  

  return (
    <div className="flex flex-col h-full">
        <TiptapEditor
          title={note.title}
          content={note.content}
          onTitleChange={handleTitleChange}
          onContentChange={handleContentChange}
          onQuote={handleQuoteClick}
          onIconChange={handleIconSelect}
          noteIcon={note.icon || '📝'}
        />
    </div>
  );
};

export default Editor;
