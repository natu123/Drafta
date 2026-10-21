"use client";

import * as React from 'react';
import Link from 'next/link';
import { WorkspaceView } from '@/components/workspace-view';
import { Button } from '@/components/ui/button';
import { useLang } from '@/contexts/lang-context';
import { playgroundCopy } from '@/lib/playground-copy';
import { playgroundChangeWatcher } from '@/lib/playground';
import type { WorkspaceState } from '@/lib/workspace-state';

/**
 * The app with the sample workspace and nothing saved (AGENTS.md, Playground). It never reaches
 * Firebase, and nothing here moves into an account.
 */
export default function Playground() {
  const { lang } = useLang();
  const copy = playgroundCopy[lang];
  const [watch] = React.useState(playgroundChangeWatcher);
  const [changed, setChanged] = React.useState(false);
  const onWorkspaceChange = React.useCallback((state: WorkspaceState) => { if (watch(state)) setChanged(true); }, [watch]);

  React.useEffect(() => {
    if (!changed) return;
    const confirmLeave = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', confirmLeave);
    return () => window.removeEventListener('beforeunload', confirmLeave);
  }, [changed]);

  const notice = (
    <div role="note" className="playground-notice flex shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b bg-[#C49547]/15 px-4 py-1.5 text-center text-sm">
      <span>{copy.notice}</span>
      <Button asChild size="sm" variant="outline" className="h-7"><Link href="/app/">{copy.signIn}</Link></Button>
    </div>
  );
  return <WorkspaceView onWorkspaceChange={onWorkspaceChange} notice={notice} />;
}
