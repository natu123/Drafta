
"use client";

import * as React from 'react';
import { Bot, Send, ScreenShare, ScreenShareOff, Mic, MicOff, MessageSquareQuote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ChatMessage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

type ChatInputState = string | ((current: string, textarea: HTMLTextAreaElement | null) => string);

interface TalkViewProps {
  chatMessages: ChatMessage[];
  onAddChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  chatInput: ChatInputState;
  setChatInput: (value: ChatInputState) => void;
}

const aiModels = ["Auto (Optimal)", "Perplexity", "ChatGPT", "Gemini"];

const TalkView: React.FC<TalkViewProps> = ({ chatMessages, onAddChatMessage, chatInput, setChatInput }) => {
  const [isSharing, setIsSharing] = React.useState(false);
  const [isVoiceMode, setIsVoiceMode] = React.useState(false);
  const [stream, setStream] = React.useState<MediaStream | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedModel, setSelectedModel] = React.useState(aiModels[0]);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const currentChatInput = typeof chatInput === 'function' 
    ? chatInput(textareaRef.current?.value ?? '', textareaRef.current) 
    : chatInput;


  React.useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [chatMessages]);

  React.useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);
  
  React.useEffect(() => {
    if (typeof chatInput === 'function') {
      const currentVal = textareaRef.current?.value ?? '';
      const newVal = chatInput(currentVal, textareaRef.current);
      if (textareaRef.current) {
        textareaRef.current.value = newVal;
      }
    }
  }, [chatInput]);

  React.useEffect(() => {
    if (typeof chatInput === 'string') {
        textareaRef.current?.focus();
    }
  }, [chatInput]);


  const handleStartSharing = async () => {
    setError(null);
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      setStream(displayStream);
      setIsSharing(true);
      
      displayStream.getVideoTracks()[0].onended = () => {
        handleStopSharing(displayStream);
      };

    } catch (err) {
      console.error("Error starting screen share:", err);
      setError("Screen sharing permission was denied. Please grant permission to use this feature.");
       toast({
          variant: "destructive",
          title: "Screen Share Failed",
          description: "Could not start screen sharing. Please ensure you grant the necessary permissions.",
        });
    }
  };

  const handleStopSharing = (streamToStop?: MediaStream) => {
    const currentStream = streamToStop || stream;
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setIsSharing(false);
  };
  
  const toggleScreenSharing = () => {
    if (isSharing) {
      handleStopSharing();
    } else {
      handleStartSharing();
    }
  };
  
  const toggleVoiceMode = () => {
    setIsVoiceMode(prev => !prev);
  }

  const handleQuoteMessage = (message: ChatMessage) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const selection = window.getSelection()?.toString().trim();
    const contentToQuote = selection || message.content;
    const quoteText = `> **${message.author === 'user' ? 'You' : 'Prōla'}**:\n> ${contentToQuote.replace(/\n/g, '\n> ')}\n\n`;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = textarea.value;
    const newText = currentText.slice(0, start) + quoteText + currentText.slice(end);
    
    setChatInput(newText);
    
    // Focus and set cursor after the inserted text
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + quoteText.length;
    }, 0);
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentChatInput.trim()) return;
    onAddChatMessage({ author: 'user', content: currentChatInput });
    setChatInput('');

    setTimeout(() => {
      const operator = selectedModel === "Auto (Optimal)" ? "Gemini" : selectedModel;
      const responseContent = `[${operator}] I'm a demo assistant! I can't process that, but you can use the tools below.`;
      onAddChatMessage({ author: 'ai', content: responseContent });
    }, 1000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setChatInput(e.target.value);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 p-4 border-b">
        <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            <h2 className="text-lg font-bold font-headline">Talk</h2>
        </div>
        <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-[180px] h-9 text-sm">
                <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
                {aiModels.map(model => (
                    <SelectItem key={model} value={model}>{model}</SelectItem>
                ))}
            </SelectContent>
        </Select>
      </div>

       {isSharing && (
        <div className="relative p-4 border-b">
          <video ref={videoRef} autoPlay muted className="w-full rounded-md bg-black" />
           <div className="absolute top-6 right-6">
            <Button size="sm" variant="destructive" onClick={() => handleStopSharing()}>
              <ScreenShareOff className="mr-2 h-4 w-4" />
              Stop Sharing
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4">
            <Alert variant="destructive">
                <AlertTitle>Screen Share Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        </div>
      )}
      
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {chatMessages.map(msg => (
            <div key={msg.id} className={cn('flex items-start gap-3 group', msg.author === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.author === 'ai' && <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0"><Bot className="w-5 h-5 text-primary" /></div>}
              <div className={cn(
                'p-3 rounded-lg max-w-xs relative', 
                msg.author === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              )}>
                 <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-6 w-6 bg-background hover:bg-secondary rounded-full shadow" onClick={() => handleQuoteMessage(msg)}>
                        <MessageSquareQuote className="h-3 w-3 text-muted-foreground" />
                    </Button>
                 </div>
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
        <form onSubmit={handleChatSubmit} className="flex items-start gap-2">
          <Textarea
            ref={textareaRef}
            placeholder="Chat with Prōla..."
            className="flex-1 resize-none"
            rows={1}
            value={currentChatInput}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleChatSubmit(e);
              }
            }}
          />
           <Button type="button" size="icon" variant={isVoiceMode ? "destructive" : "ghost"} onClick={toggleVoiceMode}>
             {isVoiceMode ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Button type="button" size="icon" variant={isSharing ? "destructive" : "ghost"} onClick={toggleScreenSharing}>
             {isSharing ? <ScreenShareOff className="h-4 w-4" /> : <ScreenShare className="h-4 w-4" />}
          </Button>
          <Button type="submit" size="icon" disabled={!currentChatInput.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default TalkView;

    