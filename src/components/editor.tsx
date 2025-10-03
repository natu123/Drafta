
"use client";

import * as React from 'react';
import type { Note } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Undo, Redo, Smile, Eye, PenSquare, X, MessageSquareQuote, Palette } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Separator } from './ui/separator';
import { useHistory } from '@/hooks/useHistory';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

interface EditorProps {
  note: Note;
  onNoteUpdate: (updatedNote: Partial<Note>) => void;
  onIconChange: (id: string, icon: string) => void;
  onQuoteNote: (noteContent: string) => void;
}

const emojis = ['📝', '💡', '🧠', '💼', '🛒', '🎉', '✈️', '❤️', '✅', '❌', '🔥', '💎', '⭐️', '🌈', '🪒'];

const colors = [
  { name: 'Default', value: '' },
  { name: 'Green', value: '#31D492' },
  { name: 'Blue', value: '#51A2FF' },
  { name: 'Purple', value: '#AD46FF' },
  { name: 'Rose', value: '#FF6467' },
  { name: 'Gold', value: '#FFB93B' },
];

const URL_REGEX = /(?<!\[.*\]\()https?:\/\/[^\s\)]+/g;


const Editor: React.FC<EditorProps> = ({ note, onNoteUpdate, onIconChange, onQuoteNote }) => {
  const { state: content, set: setContent, undo, redo, canUndo, canRedo, reset } = useHistory(note.content || '');
  const [viewMode, setViewMode] = React.useState<'write' | 'preview'>('write');
  const [detectedUrl, setDetectedUrl] = React.useState<string | null>(null);
  const [colorTarget, setColorTarget] = React.useState<'title' | 'content'>('content');

  React.useEffect(() => {
    reset(note.content || '');
  }, [note.id, note.content, reset]);

  React.useEffect(() => {
    if (viewMode === 'write') {
        const found = content.match(URL_REGEX);
        setDetectedUrl(found ? found[0] : null);
    } else {
        setDetectedUrl(null);
    }
  }, [content, viewMode]);

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

  const handleMakeLink = () => {
    if (detectedUrl) {
      const newContent = content.replace(detectedUrl, `[${detectedUrl}](${detectedUrl})`);
      setContent(newContent);
      onNoteUpdate({ content: newContent });
      setDetectedUrl(null);
    }
  };

  const handleQuoteClick = () => {
    onQuoteNote(content);
  };

  const handleColorSelect = (colorValue: string) => {
    if (colorTarget === 'title') {
        onNoteUpdate({ titleColor: colorValue });
    } else {
        onNoteUpdate({ contentColor: colorValue });
    }
  };
  
  const currentTargetColor = colorTarget === 'title' ? note.titleColor : note.contentColor;


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
                style={{ color: note.titleColor }}
            />
        </div>
      </div>
      <div className="p-2 border-b">
        <TooltipProvider>
          <div className="flex items-center gap-1 flex-wrap">
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleQuoteClick}>
                  <MessageSquareQuote />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Quote Note</p>
              </TooltipContent>
            </Tooltip>
            <Separator orientation="vertical" className="h-6 mx-2" />
             <RadioGroup value={colorTarget} onValueChange={(value) => setColorTarget(value as 'title' | 'content')} className="flex gap-2 items-center">
                <Label className="text-sm font-medium">Color:</Label>
                <div className="flex items-center gap-1">
                    <RadioGroupItem value="title" id="r-title" />
                    <Label htmlFor="r-title" className="text-sm font-normal">Title</Label>
                </div>
                <div className="flex items-center gap-1">
                    <RadioGroupItem value="content" id="r-content" />
                    <Label htmlFor="r-content" className="text-sm font-normal">Content</Label>
                </div>
            </RadioGroup>
            <div className="flex gap-1 ml-1">
                {colors.map(color => (
                    <Tooltip key={color.name}>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                className={cn("w-6 h-6 rounded-full", currentTargetColor === color.value && "ring-2 ring-primary ring-offset-2")}
                                style={{ backgroundColor: color.value || 'hsl(var(--foreground))' }}
                                onClick={() => handleColorSelect(color.value)}
                            >
                                {color.value === '' && <X className="w-3 h-3 text-background"/>}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                           <p>{color.name}</p>
                        </TooltipContent>
                    </Tooltip>
                ))}
            </div>
          </div>
        </TooltipProvider>
      </div>

       {detectedUrl && (
        <Alert className="m-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <AlertTitle>Link detected</AlertTitle>
              <AlertDescription>
                Make this URL a clickable link? <span className="font-mono text-xs bg-muted p-1 rounded-md">{detectedUrl}</span>
              </AlertDescription>
            </div>
            <div className="flex gap-2">
                <Button onClick={handleMakeLink} size="sm">Convert</Button>
                <Button onClick={() => setDetectedUrl(null)} size="sm" variant="ghost">
                    <X className="w-4 h-4" />
                </Button>
            </div>
          </div>
        </Alert>
      )}

      <div className={cn("flex-1 overflow-y-auto p-8 prose prose-neutral dark:prose-invert max-w-none", detectedUrl && "pt-0")} style={{ color: note.contentColor }}>
        {viewMode === 'write' ? (
             <Textarea
                value={content}
                onChange={handleContentChange}
                placeholder="Start writing..."
                className="w-full h-full resize-none border-none focus-visible:ring-0 text-base p-0"
                 style={{ color: 'inherit' }}
            />
        ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                p: ({node, ...props}) => <p style={{ color: 'inherit' }} {...props} />,
                h1: ({node, ...props}) => <h1 style={{ color: 'inherit' }} {...props} />,
                h2: ({node, ...props}) => <h2 style={{ color: 'inherit' }} {...props} />,
                h3: ({node, ...props}) => <h3 style={{ color: 'inherit' }} {...props} />,
                h4: ({node, ...props}) => <h4 style={{ color: 'inherit' }} {...props} />,
                h5: ({node, ...props}) => <h5 style={{ color: 'inherit' }} {...props} />,
                h6: ({node, ...props}) => <h6 style={{ color: 'inherit' }} {...props} />,
                strong: ({node, ...props}) => <strong style={{ color: 'inherit' }} {...props} />,
                em: ({node, ...props}) => <em style={{ color: 'inherit' }} {...props} />,
                a: ({node, ...props}) => <a className="text-primary" {...props} />,
                code: ({node, ...props}) => <code style={{ color: 'inherit' }} {...props} />,
                li: ({node, ...props}) => <li style={{ color: 'inherit' }} {...props} />,
            }}>{content}</ReactMarkdown>
        )}
      </div>
    </div>
  );
};

export default Editor;
