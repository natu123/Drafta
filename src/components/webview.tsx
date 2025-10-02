
'use client';

import * as React from 'react';
import type { Web } from '@/lib/types';
import { Button } from './ui/button';
import { ArrowLeft, ArrowRight, Globe, Lock, RefreshCw, Star } from 'lucide-react';
import { Input } from './ui/input';

interface WebViewProps {
  web: Web;
}

const WebView: React.FC<WebViewProps> = ({ web }) => {
    const [url, setUrl] = React.useState(web.url);

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUrl(e.target.value);
    }

    const handleUrlSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // Here you would typically navigate to the new URL
        console.log(`Navigating to: ${url}`);
    }

  return (
    <div className="flex flex-col h-full bg-secondary/20">
      <div className="flex items-center gap-2 p-2 border-b bg-background">
        <Button variant="ghost" size="icon" disabled>
          <ArrowLeft />
        </Button>
        <Button variant="ghost" size="icon" disabled>
          <ArrowRight />
        </Button>
        <Button variant="ghost" size="icon" disabled>
          <RefreshCw />
        </Button>
        <form onSubmit={handleUrlSubmit} className="flex-1 relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
                value={url}
                onChange={handleUrlChange}
                className="w-full bg-secondary/50 rounded-full pl-9"
                placeholder="https://..."
            />
            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" disabled>
                <Star className="h-4 w-4" />
            </Button>
        </form>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
         <Globe className="w-24 h-24 mb-4" />
         <h2 className="text-3xl font-bold mb-2">Web Content Area</h2>
         <p>This is where web page content for <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline">{url}</a> would be displayed.</p>
         <p className="text-sm mt-4">Actual web page rendering is not implemented in this prototype.</p>
      </div>
    </div>
  );
};

export default WebView;
