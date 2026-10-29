'use client';

import * as React from 'react';
import Link from 'next/link';
import { DOMSerializer, type Node } from '@tiptap/pm/model';
import { useLang } from '@/contexts/lang-context';
import { getFirebaseClient } from '@/lib/firebase-client';
import { documentSchema } from './tiptap-extensions/document-schema';
import { readShare } from '@/lib/share-links';
import { shareCopy } from '@/lib/share-copy';
import { BrandIcon } from './brand-icon';

/**
 * A shared memo for anyone with its link (specs/24_share_links.md, 2.6): read-only, no sign-in. The
 * token is after `#`, so it never reaches the server or other sites. Missing, blocked and no-longer-Pro
 * memos all show the same message.
 */
export default function SharePage() {
  const { lang } = useLang();
  const copy = shareCopy[lang];
  const [memo, setMemo] = React.useState<{ title: string; node: Node } | null | undefined>(undefined);
  const body = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let current = true;
    const read = () => {
      const db = getFirebaseClient()?.db;
      const token = window.location.hash.slice(1);
      setMemo(undefined);
      if (!db) { setMemo(null); return; }
      void readShare(db, token).then(result => {
        if (!current) return;
        try {
          const node = result ? documentSchema.nodeFromJSON(result.document.document) : null;
          node?.check();
          setMemo(node && result ? { title: result.title, node } : null);
        } catch {
          setMemo(null);
        }
      });
    };
    read();
    window.addEventListener('hashchange', read);
    return () => { current = false; window.removeEventListener('hashchange', read); };
  }, []);

  React.useEffect(() => {
    const target = body.current;
    if (!target || !memo) return;
    target.replaceChildren(DOMSerializer.fromSchema(documentSchema).serializeFragment(memo.node.content, { document }));
    for (const link of target.querySelectorAll('a')) { link.target = '_blank'; link.rel = 'noopener noreferrer nofollow'; }
  }, [memo]);

  React.useEffect(() => {
    document.title = memo ? `${memo.title || 'Drafta'} - Drafta` : 'Drafta';
  }, [memo]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-10 sm:px-8">
        {memo === undefined && <p className="text-sm text-muted-foreground">{copy.loading}</p>}
        {memo === null && <p role="status" className="text-muted-foreground">{copy.unavailable}</p>}
        {memo && <article ref={body} className="share-memo prose max-w-none break-words dark:prose-invert" />}
      </main>
      <footer className="pb-8 text-center text-xs text-muted-foreground">
        <Link href="/" className="inline-flex items-center gap-1.5 hover:text-foreground"><BrandIcon />{copy.madeWith}</Link>
      </footer>
    </div>
  );
}
