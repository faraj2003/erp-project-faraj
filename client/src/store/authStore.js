// src/store/authStore.js
// Global auth state managed by Zustand with localStorage persistence.
// This replaces the manual localStorage.setItem/getItem calls scattered across pages.
// The 'persist' middleware automatically syncs state to localStorage on every change.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      // Called after a successful login API response
      login: (userData, token) =>
        set({
          user: userData,
          token,
          isAuthenticated: true,
        }),

      // Clears everything — called on logout
      logout: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        }),

      // Convenience getters
      getRole: () => get().user?.role ?? null,
      isAdmin: () => get().user?.role === 'admin',
      isManager: () => ['manager', 'admin'].includes(get().user?.role),
    }),
    {
      name: 'factoryflow-auth', // localStorage key — matches what axios.js reads
    }
  )
);
