'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLang } from '@/contexts/lang-context';
import { getFirebaseClient } from '@/lib/firebase-client';
import { storageCopy } from '@/lib/storage-copy';
import { readLegacyWorkspace } from '@/lib/cloud-workspace-legacy';
import { migrateWorkspace, type MigrationProgress } from '@/lib/cloud-workspace-migration';
import { keepMigrationBackup } from '@/lib/workspace-cache';
import type { WorkspaceBackup } from '@/lib/workspace-backup';
import { Button } from './ui/button';
import { BrandIcon } from './brand-icon';

/**
 * Shown instead of the workspace while the account still uses the 0.7 storage (specs/17). Nothing
 * is written until the person starts the update; the workspace is first kept on this device.
 */
export function StorageMigration({ uid, accountMenu, onDone }: { uid: string; accountMenu: React.ReactNode; onDone: () => void }) {
  const { lang } = useLang();
  const copy = storageCopy[lang].migration;
  const [current, setCurrent] = React.useState<WorkspaceBackup | null>(null);
  const [progress, setProgress] = React.useState<MigrationProgress | null>(null);
  const [failed, setFailed] = React.useState<string | null>(null);
  const [running, setRunning] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    const db = getFirebaseClient()?.db;
    if (!db) return;
    readLegacyWorkspace(db, uid).then(result => {
      if (!active) return;
      if (result?.kind === 'legacy') setCurrent(result.saved.backup);
      else onDone(); // Another device finished the update.
    }).catch(error => { if (active) setFailed(error instanceof Error ? error.name : 'load-failed'); });
    return () => { active = false; };
  }, [uid, onDone]);

  const download = () => {
    if (!current) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(current, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `drafta-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const start = async () => {
    setRunning(true); setFailed(null);
    try {
      const db = getFirebaseClient()?.db;
      if (!db) throw new Error('Firebase unavailable');
      await migrateWorkspace(db, uid, { onProgress: setProgress, keepBackup: backup => keepMigrationBackup(uid, backup) });
      onDone();
    } catch (error) {
      setFailed(error instanceof Error ? error.name : 'migration-failed');
      setRunning(false);
    }
  };

  const step = progress && copy.steps[progress.step];
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 p-6 text-center">
      <div className="absolute right-4 top-3">{accountMenu}</div>
      <Link href="/" className="flex items-center gap-2"><BrandIcon /><span className="text-3xl font-bold">Drafta</span></Link>
      <h1 className="text-xl font-semibold">{copy.title}</h1>
      <p className="max-w-lg">{copy.body}</p>
      {current && <p className="text-sm text-muted-foreground">{copy.memos(current.notes.filter(note => note.type !== 'separator').length)}</p>}
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="outline" disabled={!current || running} onClick={download}>{copy.backup}</Button>
        <Button disabled={!current || running} onClick={() => { void start(); }}>{failed ? copy.retry : copy.start}</Button>
      </div>
      <p className="max-w-lg text-sm text-muted-foreground">{copy.backupNote}</p>
      {step && <p role="status" aria-live="polite">{step}{progress.total > 1 ? ` (${progress.done} / ${progress.total})` : ''}</p>}
      {failed && <p role="alert" className="max-w-lg">{copy.failed} <span className="text-xs text-muted-foreground">({failed})</span></p>}
    </main>
  );
}
