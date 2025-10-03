
"use client";

import * as React from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Placeholder from '@tiptap/extension-placeholder';
import { Undo, Redo, MessageSquareQuote, Bold, Italic, Strikethrough, Code } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';

interface TiptapEditorProps {
  content: string;
  onChange: (htmlContent: string) => void;
  onQuote: () => void;
  onIconChange: (icon: string) => void;
  noteIcon: string;
}

const emojis = ['📝', '💡', '🧠', '💼', '🛒', '🎉', '✈️', '❤️', '✅', '❌', '💎', '⭐️', '🌈', '🪒'];
const colors = [
  { name: 'Black', value: '#000000' },
  { name: 'Green', value: '#31D492' },
  { name: 'Blue', value: '#51A2FF' },
  { name: 'Purple', value: '#AD46FF' },
  { name: 'Rose', value: '#FF6467' },
  { name: 'Gold', value: '#FFB93B' },
];

const TiptapEditor: React.FC<TiptapEditorProps> = ({ content, onChange, onQuote, onIconChange, noteIcon }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      TextStyle,
      Color,
      Placeholder.configure({
        placeholder: 'Start writing your note here...',
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-neutral dark:prose-invert max-w-none focus:outline-none p-8 flex-1',
      },
    },
  });

  const handleSetColor = (color: string) => {
    editor?.chain().focus().setColor(color).run();
  };

  if (!editor) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
         <div className="p-4 border-b">
            <div className="flex items-center gap-2">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-2xl w-12 h-12">
                            {noteIcon}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2">
                        <div className="grid grid-cols-5 gap-2">
                            {emojis.map((emoji) => (
                            <Button
                                key={emoji}
                                variant="ghost"
                                size="icon"
                                className={cn("text-xl rounded-md", noteIcon === emoji && "bg-primary/20")}
                                onClick={() => onIconChange(emoji)}
                            >
                                {emoji}
                            </Button>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>
                 <div className="w-full text-2xl font-bold p-2 focus:outline-none"
                    // This is a simple way to have an editable title. For a real app,
                    // you would want to use a separate TipTap instance or handle this more robustly.
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => onChange(editor.getHTML())} // A bit of a hack to trigger save
                    dangerouslySetInnerHTML={{ __html: editor.getJSON().content?.[0]?.content?.[0]?.text || 'Untitled Note' }}
                />
            </div>
      </div>
        <div className="p-2 border-b flex items-center gap-1 flex-wrap">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
                <Undo />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Undo (Ctrl+Z)</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
                <Redo />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Redo (Ctrl+Y)</p></TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" className="h-6 mx-2" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onQuote}>
                <MessageSquareQuote />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Quote Note</p></TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" className="h-6 mx-2" />
          <div className="flex gap-1 ml-1">
            {colors.map(color => (
                <Tooltip key={color.name}>
                    <TooltipTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            className={cn("w-6 h-6 rounded-full", editor.isActive('textStyle', { color: color.value }) && "ring-2 ring-primary ring-offset-2")}
                            style={{ backgroundColor: color.value }}
                            onClick={() => handleSetColor(color.value)}
                        >
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{color.name}</p></TooltipContent>
                </Tooltip>
            ))}
          </div>
        </div>
        
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="bg-background border rounded-md shadow-lg p-1 flex gap-1">
             <Button
                onClick={() => editor.chain().focus().toggleBold().run()}
                variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
                size="icon"
            >
                <Bold />
            </Button>
            <Button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
                size="icon"
            >
                <Italic />
            </Button>
            <Button
                onClick={() => editor.chain().focus().toggleStrike().run()}
                variant={editor.isActive('strike') ? 'secondary' : 'ghost'}
                size="icon"
            >
                <Strikethrough />
            </Button>
        </BubbleMenu>

        <EditorContent editor={editor} className="flex-1 overflow-y-auto" />
      </div>
    </TooltipProvider>
  );
};

export default TiptapEditor;
