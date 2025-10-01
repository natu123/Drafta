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
        // Only set the icon if the input is not empty, taking the first character.
        // If the input is empty, do not change the state, allowing the user to clear the input field
        // before typing a new character.
        if (icon) {
          set({ icon: icon.charAt(0) });
        }
      },
    }),
    {
      name: 'user-preferences-storage', 
      storage: createJSONStorage(() => localStorage),
    }
  )
)
