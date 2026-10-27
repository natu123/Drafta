'use client';

import { CircleUserRound, CloudCheck, CloudOff, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export type SaveStatus = 'guest' | 'loading' | 'pending' | 'saving' | 'saved' | 'error' | 'conflict';
export type AccountLabels = {
  account: string; login: string; logout: string; retry: string; reload: string;
  status: Record<SaveStatus, string>;
};
export type AccountMenuProps = {
  labels: AccountLabels;
  name: string | null;
  status: SaveStatus;
  busy: boolean;
  errorCode?: string | null;
  /** Replaces the status label, e.g. with how many memo bodies have arrived (specs/17). */
  statusText?: string;
  onLogin: () => void;
  onLogout: () => void;
  onRetry: () => void;
  onReload: () => void;
};

/** Parent owns authentication, error handling and unsaved-change confirmation. */
export function AccountMenu({ labels, name, status, busy, errorCode, statusText, onLogin, onLogout, onRetry, onReload }: AccountMenuProps) {
  const statusLabel = statusText ?? labels.status[status];
  const StatusIcon = status === 'saved' ? CloudCheck : status === 'loading' || status === 'saving' ? LoaderCircle : CloudOff;
  // A long status gives way to the account button: in the narrow tray column it pushed the button out
  // of reach, and with it the way to sync or sign in again (2026-10-27).
  return (
    <div className="flex min-w-0 items-center gap-1">
      <span role="status" aria-live="polite" aria-label={statusLabel} title={statusLabel} className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
        <StatusIcon aria-hidden="true" className="size-4 shrink-0" />
        <span className="hidden min-w-0 truncate xl:inline">{statusLabel}</span>
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="shrink-0" aria-label={labels.account}>
            <CircleUserRound data-icon="inline-start" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-w-[calc(100vw-1rem)]">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="max-w-64 truncate">{name || labels.account}</DropdownMenuLabel>
            <DropdownMenuLabel>{statusLabel}</DropdownMenuLabel>
            {errorCode && <DropdownMenuLabel><span role="alert">{errorCode}</span></DropdownMenuLabel>}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {(status === 'error' || status === 'pending' || status === 'saving') && <DropdownMenuItem disabled={busy} onSelect={onRetry}>{labels.retry}</DropdownMenuItem>}
            {status === 'conflict' && <DropdownMenuItem disabled={busy} onSelect={onReload}>{labels.reload}</DropdownMenuItem>}
            {name === null
              ? <DropdownMenuItem disabled={busy} onSelect={onLogin}>{labels.login}</DropdownMenuItem>
              : <DropdownMenuItem disabled={busy} onSelect={onLogout}>{labels.logout}</DropdownMenuItem>}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
