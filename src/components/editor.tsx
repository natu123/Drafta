"use client";

import * as React from 'react';
import type { Note } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Undo, Redo, Smile, Eye, PenSquare } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Separator } from './ui/separator';
import { useHistory } from '@/hooks/useHistory';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface EditorProps {
  note: Note;
  onNoteUpdate: (updatedNote: Partial<Note>) => void;
  onIconChange: (id: string, icon: string) => void;
}

const emojis = ['📝', '💡', '🧠', '💼', '🛒', '🎉', '✈️', '❤️', '✅', '❌', '🔥', '🤖', '🤔', '👨‍💻', '👩‍💻'];

const Editor: React.FC<EditorProps> = ({ note, onNoteUpdate, onIconChange }) => {
  const { state: content, set: setContent, undo, redo, canUndo, canRedo, reset } = useHistory(note.content || '');
  const [viewMode, setViewMode] = React.useState<'write' | 'preview'>('write');

  React.useEffect(() => {
    reset(note.content || '');
  }, [note.id, note.content, reset]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    onNoteUpdate({ content: e.target.value });
  };
  
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onNoteUpdate({ title: e.target.value });
  };
  
  const handleIconSelect = (icon: string) => {
    onIconChange(note.id, icon);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-2xl w-12 h-12">
                        {note.icon || '📝'}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2">
                    <div className="grid grid-cols-5 gap-2">
                        {emojis.map((emoji) => (
                        <Button
                            key={emoji}
                            variant="ghost"
                            size="icon"
                            className={cn("text-xl rounded-md", note.icon === emoji && "bg-primary/20")}
                            onClick={() => handleIconSelect(emoji)}
                        >
                            {emoji}
                        </Button>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>
            <Input
                value={note.title}
                onChange={handleTitleChange}
                placeholder="Untitled Note"
                className="text-2xl font-bold border-none shadow-none focus-visible:ring-0 p-2 h-auto"
            />
        </div>
      </div>
      <div className="p-2 border-b">
        <TooltipProvider>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={undo} disabled={!canUndo}>
                  <Undo />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Undo (Ctrl+Z)</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={redo} disabled={!canRedo}>
                  <Redo />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Redo (Ctrl+Y)</p>
              </TooltipContent>
            </Tooltip>
            <Separator orientation="vertical" className="h-6 mx-2" />
             <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant={viewMode === 'write' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('write')}>
                        <PenSquare />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Write</p>
                </TooltipContent>
            </Tooltip>
             <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant={viewMode === 'preview' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('preview')}>
                        <Eye />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Preview</p>
                </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>
      <div className="flex-1 overflow-y-auto p-8 prose prose-neutral dark:prose-invert max-w-none">
        {viewMode === 'write' ? (
             <Textarea
                value={content}
                onChange={handleContentChange}
                placeholder="Start writing..."
                className="w-full h-full resize-none border-none focus-visible:ring-0 text-base p-0"
            />
        ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        )}
      </div>
    </div>
  );
};

export default Editor;
