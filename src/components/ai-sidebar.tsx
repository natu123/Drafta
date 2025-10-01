"use client";

import * as React from 'react';
import { Bot, Send, Sparkles, Loader2, Feather, Pencil, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ChatMessage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { summarizeAction, generateDraftAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Input } from './ui/input';

interface AiSidebarProps {
  chatMessages: ChatMessage[];
  onAddChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  onEditChatMessage: (id: string, content: string) => void;
  activeNoteContent: string;
  createNoteFromDraft: (title: string, content: string) => void;
}

const AiSidebar: React.FC<AiSidebarProps> = ({ chatMessages, onAddChatMessage, onEditChatMessage, activeNoteContent, createNoteFromDraft }) => {
  const [chatInput, setChatInput] = React.useState('');
  const [promptInput, setPromptInput] = React.useState('');
  const [isSummarizing, setIsSummarizing] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [editingMessageId, setEditingMessageId] = React.useState<string | null>(null);
  const [editingContent, setEditingContent] = React.useState('');

  const { toast } = useToast();
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onAddChatMessage({ author: 'user', content: chatInput });
    setChatInput('');

    // Mock AI response
    setTimeout(() => {
      onAddChatMessage({ author: 'ai', content: "I'm a demo assistant! I can't process that, but you can use the tools below." });
    }, 1000);
  };
  
  const handleSummarize = async () => {
    if (!activeNoteContent.trim()) {
        toast({ title: 'Error', description: 'Note content is empty.', variant: 'destructive' });
        return;
    }
    setIsSummarizing(true);
    const result = await summarizeAction({ noteContent: activeNoteContent });
    setIsSummarizing(false);
    if (result.success && result.summary) {
        onAddChatMessage({ author: 'ai', content: `**Summary:**\n${result.summary}` });
    } else {
        toast({ title: 'Summarization Failed', description: result.error, variant: 'destructive' });
    }
  };

  const handleGenerate = async () => {
    if (!promptInput.trim()) {
      toast({ title: 'Error', description: 'Prompt is empty.', variant: 'destructive' });
      return;
    }
    setIsGenerating(true);
    const result = await generateDraftAction({ prompt: promptInput });
    setIsGenerating(false);
    if (result.success && result.draft) {
        createNoteFromDraft(`AI Draft: ${promptInput}`, result.draft);
        toast({ title: 'Draft Generated', description: 'A new note has been created from your prompt.' });
        setPromptInput('');
    } else {
        toast({ title: 'Generation Failed', description: result.error, variant: 'destructive' });
    }
  };
  
  const handleEditSave = (id: string) => {
    onEditChatMessage(id, editingContent);
    setEditingMessageId(null);
    setEditingContent('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-4 border-b">
        <Bot className="h-6 w-6 text-primary" />
        <h2 className="text-lg font-bold font-headline">Prōla AI</h2>
      </div>

      <div className="p-4 space-y-4 border-b">
        <Card>
            <CardHeader className="p-4">
                <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span>AI Tools</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
                 <Button onClick={handleSummarize} disabled={isSummarizing || !activeNoteContent.trim()} className="w-full">
                    {isSummarizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Feather className="mr-2 h-4 w-4" />}
                    Summarize Note
                </Button>
                <div className="space-y-2">
                    <Input 
                        placeholder="Enter a prompt for a new note..." 
                        value={promptInput}
                        onChange={(e) => setPromptInput(e.target.value)}
                    />
                    <Button onClick={handleGenerate} disabled={isGenerating} className="w-full" variant="secondary">
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Feather className="mr-2 h-4 w-4" />}
                        Generate New Note
                    </Button>
                </div>
            </CardContent>
        </Card>
      </div>
      
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {chatMessages.map(msg => (
            <div key={msg.id} className={cn('flex items-start gap-3 group', msg.author === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.author === 'ai' && <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0"><Bot className="w-5 h-5 text-primary" /></div>}
              <div className={cn(
                'p-3 rounded-lg max-w-xs relative', 
                msg.author === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              )}>
                {editingMessageId === msg.id ? (
                  <div className="space-y-2">
                    <Textarea 
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      className="text-sm bg-background/20 text-foreground"
                    />
                    <div className="flex justify-end gap-2">
                       <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEditSave(msg.id)}><Save className="h-4 w-4" /></Button>
                       <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingMessageId(null)}><X className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className={cn('text-xs mt-1', msg.author === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                      {format(new Date(msg.timestamp), 'p')}
                    </p>
                     {msg.author === 'user' && (
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="absolute -left-10 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          setEditingMessageId(msg.id);
                          setEditingContent(msg.content);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t">
        <form onSubmit={handleChatSubmit} className="flex items-center gap-2">
          <Textarea
            placeholder="Chat with Prōla..."
            className="flex-1 resize-none"
            rows={1}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleChatSubmit(e);
              }
            }}
          />
          <Button type="submit" size="icon" disabled={!chatInput.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AiSidebar;
