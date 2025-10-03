
"use client";

import * as React from 'react';
import type { Note } from '@/lib/types';
import { Undo, Redo, MessageSquareQuote, Palette } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Separator } from './ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from '@/lib/utils';
import TiptapEditor from './tiptap-editor';


interface EditorProps {
  note: Note;
  onNoteUpdate: (updatedNote: Partial<Note>) => void;
  onIconChange: (id: string, icon: string) => void;
  onQuoteNote: (noteContent: string) => void;
}

const emojis = ['📝', '💡', '🧠', '💼', '🛒', '🎉', '✈️', '❤️', '✅', '❌', '💎', '⭐️', '🌈', '🪒'];


const Editor: React.FC<EditorProps> = ({ note, onNoteUpdate, onIconChange, onQuoteNote }) => {
  const handleContentChange = (htmlContent: string) => {
    onNoteUpdate({ content: htmlContent });
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
          content={note.content}
          onChange={handleContentChange}
          onQuote={handleQuoteClick}
          onIconChange={handleIconSelect}
          noteIcon={note.icon || '📝'}
        />
    </div>
  );
};

export default Editor;
