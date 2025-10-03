
"use client";

import * as React from 'react';
import { useEditor, EditorContent, BubbleMenu, generateHTML } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Placeholder from '@tiptap/extension-placeholder';
import { Undo, Redo, MessageSquareQuote, Bold, Italic, Strikethrough } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';

interface TiptapEditorProps {
  title: string;
  content: string;
  onNoteUpdate: (updatedNote: { title: string; content: string }) => void;
  onQuote: () => void;
  onIconChange: (icon: string) => void;
  noteIcon: string;
}

const emojis = ['📝', '💡', '🍎', '🌱', '💼', '🛒', '🎉', '✈️', '❤️', '✅', '❌', '💎', '⭐️', '🌈', '🪒'];
const colors = [
  { name: 'Black', value: '#000000' },
  { name: 'Green', value: '#7AD67A' },
  { name: 'Blue', value: '#51A2FF' },
  { name: 'Purple', value: '#AD46FF' },
  { name: 'Rose', value: '#FF6467' },
  { name: 'Gold', value: '#FFB93B' },
];

const extensions = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3],
    },
  }),
  Placeholder.configure({
    placeholder: ({ node }) => {
      if (node.type.name === 'heading' && node.parent && node.parent.firstChild === node) {
        return 'Untitled Note';
      }
      if (node.type.name === 'paragraph' && node.parent && !node.content.size && node.parent.childCount <= 1) {
         return 'Start writing your note here...';
      }
      return '';
    },
  }),
  TextStyle,
  Color,
];

const TiptapEditor: React.FC<TiptapEditorProps> = ({ title, content, onNoteUpdate, onQuote, onIconChange, noteIcon }) => {

  const editor = useEditor({
    extensions,
    // Combine title and content for the editor
    content: `<h1>${title}</h1>${content}`,
    onBlur: ({ editor }) => {
      const editorContentJSON = editor.getJSON();
      const editorContent = editorContentJSON.content;
      
      let newTitle = '';
      let newContent = '';

      if (editorContent && editorContent.length > 0) {
        const titleNodeIndex = editorContent.findIndex(node => node.type === 'heading' && node.attrs?.level === 1);

        if (titleNodeIndex !== -1) {
          const titleNode = editorContent[titleNodeIndex];
          newTitle = titleNode.content?.map(c => c.text).join('') || '';
          
          const contentNodes = editorContent.slice(titleNodeIndex + 1);
          if (contentNodes.length > 0) {
            newContent = generateHTML({ type: 'doc', content: contentNodes }, extensions);
          }
        } else if (editorContent.length > 0) {
          // Fallback if no h1 is found, treat first block as title
          const firstNode = editorContent[0];
          newTitle = firstNode.content?.map(c => c.text).join('') || '';
          const contentNodes = editorContent.slice(1);
          if (contentNodes.length > 0) {
            newContent = generateHTML({ type: 'doc', content: contentNodes }, extensions);
          }
        }
      }
      
      onNoteUpdate({ title: newTitle, content: newContent });
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none p-8 flex-1',
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
         <div className="p-2 border-b flex items-center gap-1 flex-wrap">
          <Popover>
              <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-2xl w-12 h-12 shrink-0">
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
                            className={cn("w-6 h-6 rounded-full p-0", editor.isActive('textStyle', { color: color.value }) && "ring-2 ring-primary ring-offset-2")}
                            style={{ backgroundColor: color.value }}
                            onClick={() => handleSetColor(color.value)}
                        >
                          <span className="sr-only">{color.name}</span>
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

    
