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
  onLogin: () => void;
  onLogout: () => void;
  onRetry: () => void;
  onReload: () => void;
};

/** Parent owns authentication, error handling and unsaved-change confirmation. */
export function AccountMenu({ labels, name, status, busy, errorCode, onLogin, onLogout, onRetry, onReload }: AccountMenuProps) {
  const statusLabel = labels.status[status];
  const StatusIcon = status === 'saved' ? CloudCheck : status === 'loading' || status === 'saving' ? LoaderCircle : CloudOff;
  return (
    <div className="flex shrink-0 items-center gap-1">
      <span role="status" aria-live="polite" aria-label={statusLabel} title={statusLabel} className="flex items-center gap-1 text-xs text-muted-foreground">
        <StatusIcon aria-hidden="true" className="size-4" />
        <span className="hidden xl:inline">{statusLabel}</span>
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={labels.account}>
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
            {status === 'error' && <DropdownMenuItem disabled={busy} onSelect={onRetry}>{labels.retry}</DropdownMenuItem>}
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
