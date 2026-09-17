"use client";

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

// Keep the server and hydration snapshots identical before using browser APIs.
export function useClientReady() {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}

export function useShortcutMod(): 'Ctrl' | 'Cmd' {
  const ready = useClientReady();
  return ready && /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? 'Cmd' : 'Ctrl';
}
