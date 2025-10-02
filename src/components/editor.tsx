"use client";

import * as React from 'react';
import type { Note } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Undo, Redo, Smile, Construction } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Separator } from './ui/separator';
import { useHistory } from '@/hooks/useHistory';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface EditorProps {
  note: Note;
  onNoteUpdate: (updatedNote: Partial<Note>) => void;
  onIconChange: (id: string, icon: string) => void;
}

const Editor: React.FC<EditorProps> = ({ note, onNoteUpdate, onIconChange }) => {
  return (
     <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
        <Construction className="w-16 h-16 mb-4 text-primary" />
        <h2 className="text-2xl font-bold mb-2">Editor Under Construction</h2>
        <p className="text-center">This feature is currently being developed and will be available soon.</p>
        <p className="text-center mt-2">Thank you for your patience!</p>
    </div>
  );
};

export default Editor;
