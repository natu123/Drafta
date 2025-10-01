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
        const newIcon = icon.charAt(0);
        if (newIcon) {
          set({ icon: newIcon });
        }
      },
    }),
    {
      name: 'user-preferences-storage', 
      storage: createJSONStorage(() => localStorage),
    }
  )
)
