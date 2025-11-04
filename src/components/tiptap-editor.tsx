
"use client";

import * as React from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Placeholder from '@tiptap/extension-placeholder';
import { Undo, Redo, Bold, Italic, Strikethrough } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';
import { Input } from './ui/input';

interface TiptapEditorProps {
  title: string;
  content: string;
  onNoteUpdate: (updatedNote: { title: string; content: string }) => void;
  onIconChange: (icon: string) => void;
  noteIcon: string;
}

export const emojis = ['📝', '💡', '🍎', '🌱', '💼', '🛒', '🎉', '✈️', '❤️', '✅', '❌', '💎', '⭐️', '🌈', '🪒', '💬', '🌐'];
const colors = [
  { name: 'Black', value: '#000000' },
  { name: 'Green', value: '#64A364' },
  { name: 'Blue', value: '#51A2FF' },
  { name: 'Purple', value: '#AD46FF' },
  { name: 'Rose', value: '#FF6467' },
  { name: 'Orange', value: '#C49547' },
];

const extensions = [
  StarterKit.configure({
    heading: {
        levels: [2, 3], // h1 is now outside the editor
    },
    document: true, // Allow document node
    paragraph: true,
  }),
  Placeholder.configure({
    placeholder: 'Start writing your note here...',
  }),
  TextStyle,
  Color,
];

const TiptapEditor: React.FC<TiptapEditorProps> = ({ title: initialTitle, content, onNoteUpdate, onIconChange, noteIcon }) => {

  const [currentTitle, setCurrentTitle] = React.useState(initialTitle);
  const isSavingRef = React.useRef(false);
  const contentRef = React.useRef(content);

  const editor = useEditor({
    extensions,
    content: content,
    onUpdate: ({ editor }) => {
        contentRef.current = editor.getHTML();
        handleSave();
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none px-8 pt-4 pb-8 flex-1',
      },
    },
  });
  
  // Debounced save function
  const handleSave = React.useCallback(() => {
    if (!isSavingRef.current) {
        isSavingRef.current = true;
        setTimeout(() => {
            onNoteUpdate({ title: currentTitle, content: contentRef.current });
            isSavingRef.current = false;
        }, 500); // 500ms delay
    }
  }, [currentTitle, onNoteUpdate]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTitle(e.target.value);
  };
  
  const handleTitleBlur = () => {
    handleSave();
  };

  const handleSetColor = (color: string) => {
    editor?.chain().focus().setColor(color).run();
  };

  // Sync external changes
  React.useEffect(() => {
    if (initialTitle !== currentTitle) {
      setCurrentTitle(initialTitle);
    }
  }, [initialTitle]);

  React.useEffect(() => {
    if (editor && content !== contentRef.current) {
      const { from, to } = editor.state.selection;
      editor.commands.setContent(content, false);
      editor.commands.setTextSelection({ from, to });
      contentRef.current = content;
    }
  }, [content, editor]);

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

        <div className="flex-1 overflow-y-auto">
            <Input 
                value={currentTitle}
                onChange={handleTitleChange}
                onBlur={handleTitleBlur}
                placeholder="Untitled Note"
                className="text-3xl font-bold border-none focus-visible:ring-0 focus-visible:ring-offset-0 p-8 pb-4 h-auto"
            />
            <Separator className="mx-8 w-auto" />
            <EditorContent editor={editor} />
        </div>
      </div>
    </TooltipProvider>
  );
};

export default TiptapEditor;
