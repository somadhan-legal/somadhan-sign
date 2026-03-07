import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  initialized: boolean
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setLoading: (loading: boolean) => void
  initialize: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>
  resendSignupOtp: (email: string) => Promise<void>
  verifySignupOtp: (email: string, token: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
  isRecovery: boolean
  setIsRecovery: (val: boolean) => void
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  initialized: false,
  isRecovery: false,
  setIsRecovery: (val) => set({ isRecovery: val }),

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      set({
        session,
        user: session?.user ?? null,
        loading: false,
        initialized: true,
      })

      supabase.auth.onAuthStateChange((event, session) => {
        set({
          session,
          user: session?.user ?? null,
        })
        if (event === 'PASSWORD_RECOVERY') {
          set({ isRecovery: true })
        }
      })
    } catch {
      set({ loading: false, initialized: true })
    }
  },

  signInWithGoogle: async () => {
    set({ loading: true })
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}` },
      })
      if (error) throw error
      set({ loading: false })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  signInWithEmail: async (email: string, password: string) => {
    set({ loading: true })
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      set({ user: data.user, session: data.session, loading: false })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  signUpWithEmail: async (email: string, password: string, name: string) => {
    set({ loading: true })
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: undefined,
        },
      })
      if (error) throw error
      set({ loading: false })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  resendSignupOtp: async (email: string) => {
    set({ loading: true })
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      })
      if (error) throw error
      set({ loading: false })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  verifySignupOtp: async (email: string, token: string) => {
    set({ loading: true })
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup',
      })
      if (error) throw error
      set({ user: data.user, session: data.session, loading: false })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  resetPassword: async (email: string) => {
    set({ loading: true })
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      set({ loading: false })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  updatePassword: async (newPassword: string) => {
    set({ loading: true })
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      set({ loading: false, isRecovery: false })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null })
  },
}))
