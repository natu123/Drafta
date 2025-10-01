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
      icon: 'constellation1',
      setIcon: (icon) => set({ icon }),
    }),
    {
      name: 'user-preferences-storage', 
      storage: createJSONStorage(() => localStorage),
    }
  )
)
