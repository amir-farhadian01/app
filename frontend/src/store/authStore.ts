import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  roles: string[]
}

interface AuthState {
  token: string | null
  refreshToken: string | null
  user: User | null
  setAuth: (token: string, refreshToken: string, user: User) => void
  refresh: () => Promise<boolean>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      setAuth: (token, refreshToken, user) => set({ token, refreshToken, user }),
      refresh: async () => {
        const { refreshToken } = get()
        if (!refreshToken) return false
        try {
          const res = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          })
          if (!res.ok) return false
          const data = await res.json() as { token: string; refreshToken: string }
          set({ token: data.token, refreshToken: data.refreshToken })
          return true
        } catch {
          return false
        }
      },
      logout: () => set({ token: null, refreshToken: null, user: null }),
    }),
    { name: 'neighborly-auth' }
  )
)
