'use client';

import * as React from 'react';

/**
 * Share links for the signed-in account (specs/24_share_links.md, 4): which memos are shared, and
 * sharing or stopping one. Null where sharing is not offered (signed out, playground, production
 * before Pro starts).
 */
export type ShareControl = {
  /** noteId to token of every shared memo. */
  shared: ReadonlyMap<string, string>;
  isPro: boolean;
  start: (noteId: string) => Promise<string>;
  stop: (noteId: string) => Promise<void>;
  openPro: () => void;
};

export const ShareContext = React.createContext<ShareControl | null>(null);
export const useShare = () => React.useContext(ShareContext);
