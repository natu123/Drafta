"use client";

import * as React from 'react';
import { Bot, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ChatMessage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface TalkViewProps {
  chatMessages: ChatMessage[];
  onAddChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
}

const TalkView: React.FC<TalkViewProps> = ({ chatMessages, onAddChatMessage }) => {
  const [chatInput, setChatInput] = React.useState('');
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-4 border-b">
        <Bot className="h-6 w-6 text-primary" />
        <h2 className="text-lg font-bold font-headline">Prōla Talk</h2>
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
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className={cn('text-xs mt-1', msg.author === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                  {format(new Date(msg.timestamp), 'p')}
                </p>
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

export default TalkView;

    