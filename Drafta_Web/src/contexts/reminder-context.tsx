'use client';

import * as React from 'react';
import type { PushState } from '@/lib/push-client';
import type { Repeat } from '@/lib/reminder-time';
import type { ReminderView } from '@/lib/reminders-client';

/**
 * Reminders for the signed-in account (specs/25_reminders.md, 2.3): each memo's reminder, whether
 * this device receives them, and setting or removing one. Null where reminders are not offered
 * (signed out, playground, production before Pro starts).
 */
export type ReminderControl = {
  /** noteId to its reminder. */
  all: ReadonlyMap<string, ReminderView>;
  isPro: boolean;
  /** Whether this device receives reminders (before any is set, the permission may not be asked yet). */
  push: PushState;
  /** Sets a reminder, then asks this device for the permission once; resolves to the device's state. */
  set: (noteId: string, wallTime: string, repeat: Repeat) => Promise<PushState>;
  remove: (noteId: string) => Promise<void>;
  openPro: () => void;
};

export const ReminderContext = React.createContext<ReminderControl | null>(null);
export const useReminders = () => React.useContext(ReminderContext);
