// src/store/authStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '../utils/api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      organization: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (identifier, password) => {
        const { data } = await authAPI.login({ identifier, password });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        set({
          user: data.user,
          organization: data.organization,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          isAuthenticated: true,
        });
        return data;
      },

      register: async (formData) => {
        const { data } = await authAPI.register(formData);
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        set({
          user: data.user,
          organization: data.organization,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          isAuthenticated: true,
        });
        return data;
      },

      logout: async () => {
        try {
          const { refreshToken } = get();
          await authAPI.logout(refreshToken);
        } catch (_) {}
        localStorage.clear();
        set({ user: null, organization: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },
    }),
    {
      name: 'orgdoc-auth',
      partialize: (state) => ({
        user: state.user,
        organization: state.organization,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
