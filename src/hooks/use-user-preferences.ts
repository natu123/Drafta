"use client"

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface UserPreferencesState {
  icon: string;
  setIcon: (icon: string) => void;
}

export const useUserPreferences = create<UserPreferencesState>()(
  persist(
    (set) => ({
      icon: '1',
      setIcon: (icon) => {
        // Allow the input to be cleared (empty string) or set to a new character.
        // We only take the first character if the input string is longer than 1.
        set({ icon: icon.charAt(0) });
      },
    }),
    {
      name: 'user-preferences-storage', 
      storage: createJSONStorage(() => localStorage),
    }
  )
)
