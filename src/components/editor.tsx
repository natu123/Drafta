"use client";

import * as React from 'react';
import type { Note } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Undo, Redo, Smile } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Separator } from './ui/separator';
import { useHistory } from '@/hooks/useHistory';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from '@/lib/utils';

interface EditorProps {
  note: Note;
  onNoteUpdate: (updatedNote: Partial<Note>) => void;
  onIconChange: (id: string, icon: string) => void;
}

const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
};

const textColors = [
  { name: 'black', code: '#000000' },
  { name: 'green', code: '#31D492' },
  { name: 'blue', code: '#51A2FF' },
  { name: 'purple', code: '#AD46FF' },
  { name: 'pink', code: '#FF64FC' },
  { name: 'rose', code: '#FF6467' },
];

const emojiSelection = ['⭐️', '🌈', '❣️', '🎵', '⚛', '🔥', '📝', '💡', '🚀', '🧠', '💼', '🏠'];

const Editor: React.FC<EditorProps> = ({ note, onNoteUpdate, onIconChange }) => {
  const [title, setTitle] = React.useState(note.title);
  const { state: content, set: setContent, undo, redo, canUndo, canRedo, reset: resetContentHistory } = useHistory(note.content);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const debouncedTitle = useDebounce(title, 500);
  const debouncedContent = useDebounce(content, 500);

  React.useEffect(() => {
    if (debouncedTitle !== note.title) {
        onNoteUpdate({ title: debouncedTitle });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTitle]);

  React.useEffect(() => {
    if (debouncedContent !== note.content) {
        onNoteUpdate({ content: debouncedContent });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedContent]);
  

  // Reset state when note changes
  React.useEffect(() => {
    setTitle(note.title);
    resetContentHistory(note.content);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);
  
  const historyActions = [
    { icon: Undo, tooltip: 'Undo', action: undo, disabled: !canUndo },
    { icon: Redo, tooltip: 'Redo', action: redo, disabled: !canRedo },
  ];

  return (
    <div className="p-4 md:p-8 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-2xl shrink-0">
              {note.icon || <Smile className="w-5 h-5 text-muted-foreground" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="grid grid-cols-6 gap-1">
              {emojiSelection.map(emoji => (
                <Button 
                  key={emoji}
                  variant="ghost" 
                  size="icon" 
                  className="text-xl"
                  onClick={() => onIconChange(note.id, emoji)}
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-2xl md:text-3xl font-bold font-headline border-none shadow-none focus-visible:ring-0 p-0 h-auto"
          placeholder="Note Title"
        />
      </div>
      <div className="flex items-center gap-1 bg-muted p-1 rounded-md border-b pb-2 mb-4 flex-wrap">
        <TooltipProvider>
          <div className="flex items-center gap-1">
            {historyActions.map((item, index) => (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={item.action} disabled={item.disabled}>
                    <item.icon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>{item.tooltip}</p></TooltipContent>
              </Tooltip>
            ))}
          </div>
          
          <Separator orientation="vertical" className="h-6 mx-1" />

          <div className="flex items-center gap-1">
            {textColors.map(color => (
              <Tooltip key={color.name}>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                    const textarea = textareaRef.current;
                    if (!textarea) return;
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const selectedText = content.substring(start, end);
                    const newText = `${content.substring(0, start)}<span style="color: ${color.code};">${selectedText}</span>${content.substring(end)}`;
                    setContent(newText);
                  }}>
                    <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: color.code }} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>{color.name}</p></TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      </div>

      <div className="relative flex-1">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className={cn(
            'absolute inset-0 z-10 resize-none overflow-auto w-full h-full p-0 m-0 text-base bg-transparent whitespace-pre-wrap break-words font-body focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0'
          )}
          placeholder="Start writing..."
        />
      </div>
    </div>
  );
};

export default Editor;
