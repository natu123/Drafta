
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
import { Avatar, AvatarFallback } from './ui/avatar';
import { User } from 'lucide-react';


type ChatInputState = string | ((prev: string) => string) | ((prev: string) => { text: string, currentInput: string });

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
    const textarea = textareaRef.current;
    if (!textarea) return;

    if (typeof chatInput === 'function') {
        const result = (chatInput as Function)(textarea.value);
        if (typeof result === 'object' && result !== null && 'text' in result) {
            const { text, currentInput } = result;
            const start = textarea.selectionStart;
            const newText = currentInput.slice(0, start) + text + currentInput.slice(start);
            textarea.value = newText;
            setChatInput(newText);
            textarea.focus();
            // Move cursor to the end of the inserted text
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = start + text.length;
            }, 0);
        } else {
            const currentVal = String(result);
            textarea.value = currentVal;
            setChatInput(currentVal);
        }
    } else if (typeof chatInput === 'string') {
        textarea.value = chatInput;
    }
  }, [chatInput, setChatInput]);


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
    const authorName = message.author === 'user' ? 'You' : message.authorName || 'Prōla';
    const quoteText = `> ${authorName}:\n> ${contentToQuote.replace(/\n/g, '\n> ')}\n\n`;
    
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
    const currentVal = textareaRef.current?.value || '';
    if (!currentVal.trim()) return;
    onAddChatMessage({ author: 'user', content: currentVal, authorName: 'You' });
    setChatInput('');

    setTimeout(() => {
        let aiAuthorName = 'Prōla';
        switch (selectedModel) {
            case "Auto (Optimal)":
                aiAuthorName = "[DEMO] DeepSeek-V3 (Auto)";
                break;
            case "Perplexity":
                aiAuthorName = "[DEMO] Perplexity";
                break;
            case "ChatGPT":
                aiAuthorName = "[DEMO] ChatGPT";
                break;
            case "Gemini":
                aiAuthorName = "[DEMO] Gemini";
                break;
            default:
                aiAuthorName = `[DEMO] ${selectedModel}`;
        }
        
        const responseContent = `${aiAuthorName.split(' ')[0]} I'm a demo assistant! I can't process that, but you can use the tools below.`;
        onAddChatMessage({ author: 'ai', content: responseContent, authorName: aiAuthorName });
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
      
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="p-4 space-y-4">
          {chatMessages.map(msg => (
             <div key={msg.id} className={cn('flex items-start gap-4 group relative', msg.author === 'user' && 'bg-secondary/50 p-4 rounded-lg')}>
                <Avatar className="w-8 h-8 shrink-0 mt-1">
                  {msg.author === 'ai' ? (
                    <AvatarFallback className="bg-primary/20">
                      <Bot className="w-5 h-5 text-primary" />
                    </AvatarFallback>
                  ) : (
                    <AvatarFallback>
                      <User className="w-5 h-5" />
                    </AvatarFallback>
                  )}
                </Avatar>
              
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold">{msg.author === 'user' ? 'You' : msg.authorName || 'Prōla'}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(msg.timestamp), 'HH:mm (yyyy-MM-dd)')}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
                 <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-6 w-6 bg-background hover:bg-secondary rounded-full shadow" onClick={() => handleQuoteMessage(msg)}>
                        <MessageSquareQuote className="h-3 w-3 text-muted-foreground" />
                    </Button>
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
            defaultValue={typeof chatInput === 'string' ? chatInput : ''}
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
          <Button type="submit" disabled={!textareaRef.current?.value.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default TalkView;
