import { create } from 'zustand'
import type { Role, Profile } from '@/lib/types'

interface AuthState {
  profile: Profile | null
  role: Role | null
  setProfile: (profile: Profile) => void
  clearProfile: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  profile: null,
  role:    null,

  setProfile: (profile) => set({ profile, role: profile.role }),
  clearProfile: () => set({ profile: null, role: null }),
}))

// Selectors
export const selectProfile  = (s: AuthState) => s.profile
export const selectRole     = (s: AuthState) => s.role
export const selectIsAdmin  = (s: AuthState) => s.role === 'admin'
export const selectIsChef   = (s: AuthState) => s.role === 'chef_centre'
export const selectIsClient = (s: AuthState) => s.role === 'client'
