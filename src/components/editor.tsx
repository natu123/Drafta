"use client";

import * as React from 'react';
import type { Note } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bold, Italic, Strikethrough, Code, Undo, Redo, List, ListOrdered, Eraser } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Separator } from './ui/separator';
import { useHistory } from '@/hooks/useHistory';
import { parseMarkdown, stripMarkdown } from '@/lib/utils';

interface EditorProps {
  note: Note;
  onNoteUpdate: (updatedNote: Partial<Note>) => void;
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

const Editor: React.FC<EditorProps> = ({ note, onNoteUpdate }) => {
  const [title, setTitle] = React.useState(note.title);
  const { state: content, set: setContent, undo, redo, canUndo, canRedo, reset: resetContentHistory } = useHistory(note.content);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const debouncedTitle = useDebounce(title, 500);
  const debouncedContent = useDebounce(content, 500);

  React.useEffect(() => {
    onNoteUpdate({ title: debouncedTitle });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTitle]);

  React.useEffect(() => {
    onNoteUpdate({ content: debouncedContent });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedContent]);

  // Reset state when note changes
  React.useEffect(() => {
    setTitle(note.title);
    resetContentHistory(note.content);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note]);

  const applyMarkdown = (syntax: { prefix: string; suffix: string }) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = `${content.substring(0, start)}${syntax.prefix}${selectedText}${syntax.suffix}${content.substring(end)}`;
    
    setContent(newText);
    textarea.focus();
    setTimeout(() => {
      textarea.selectionStart = start + syntax.prefix.length;
      textarea.selectionEnd = end + syntax.prefix.length;
    }, 0);
  };
  
  const applyColor = (color: string) => {
    applyMarkdown({ prefix: `<span style="color: ${color};">`, suffix: `</span>` });
  };

  const handleStripMarkdown = () => {
    setContent(stripMarkdown(content));
  };
  
  const toolbarActions = [
    { icon: Bold, tooltip: 'Bold', action: () => applyMarkdown({prefix: '**', suffix: '**'}) },
    { icon: Italic, tooltip: 'Italic', action: () => applyMarkdown({prefix: '*', suffix: '*'}) },
    { icon: Strikethrough, tooltip: 'Strikethrough', action: () => applyMarkdown({prefix: '~~', suffix: '~~'}) },
    { icon: Code, tooltip: 'Code', action: () => applyMarkdown({prefix: '`', suffix: '`'}) },
    { type: 'separator' },
    { icon: List, tooltip: 'Unordered List', action: () => applyMarkdown({prefix: '- ', suffix: ''}) },
    { icon: ListOrdered, tooltip: 'Ordered List', action: () => applyMarkdown({prefix: '1. ', suffix: ''}) },
    { type: 'separator' },
    { icon: Undo, tooltip: 'Undo', action: undo, disabled: !canUndo },
    { icon: Redo, tooltip: 'Redo', action: redo, disabled: !canRedo },
    { icon: Eraser, tooltip: 'Strip Formatting', action: handleStripMarkdown },
  ];

  return (
    <div className="p-4 md:p-8 h-full">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="text-2xl md:text-3xl font-bold font-headline border-none shadow-none focus-visible:ring-0 p-0 h-auto mb-4"
        placeholder="Note Title"
      />
      <Tabs defaultValue="write" className="flex-1 flex flex-col h-full">
        <div className="flex justify-between items-center border-b pb-2">
           <TabsList>
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-1 bg-muted p-1 rounded-md">
            <TooltipProvider>
              {toolbarActions.map((item, index) => item.type === 'separator' ? <Separator key={index} orientation="vertical" className="h-6 mx-1" /> : (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={item.action} disabled={item.disabled}>
                      <item.icon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{item.tooltip}</p></TooltipContent>
                </Tooltip>
              ))}
               <Separator orientation="vertical" className="h-6 mx-1" />
              <div className="flex items-center gap-1 pl-1">
                {textColors.map(color => (
                  <Tooltip key={color.name}>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyColor(color.code)}>
                        <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: color.code }} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{color.name}</p></TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
          </div>
        </div>
        <TabsContent value="write" className="mt-4 flex-1">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-full border-none shadow-none focus-visible:ring-0 p-0 resize-none text-base leading-relaxed"
            placeholder="Start writing..."
          />
        </TabsContent>
        <TabsContent value="preview" className="mt-4 flex-1">
            <div
                className="prose prose-stone dark:prose-invert max-w-none p-2 rounded-md bg-white h-full overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
            />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Editor;
