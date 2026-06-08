// src/utils/api.js
// Axios instance with JWT auth + auto-refresh interceptor

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://orgdocai-production.up.railway.app/api',
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor — attach access token ─────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Response Interceptor — auto-refresh on 401 ────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => (error ? prom.reject(error) : prom.resolve(token)));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post('/api/auth/refresh', { refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        processQueue(null, data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (err) {
        processQueue(err, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ─── Auth API ─────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  me: () => api.get('/auth/me'),
};

// ─── Events API ───────────────────────────────────────────
export const eventsAPI = {
  list: (params) => api.get('/events', { params }),
  get: (id) => api.get(`/events/${id}`),
  create: (data) => api.post('/events', data),
  update: (id, data) => api.put(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`),
};

// ─── Files API ────────────────────────────────────────────
export const filesAPI = {
  getAll: (params) => api.get('/files', { params }),
  getByEvent: (eventId, params) => api.get(`/files/event/${eventId}`, { params }),
  upload: (eventId, formData, onProgress) =>
    api.post(`/files/event/${eventId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress?.(Math.round((e.loaded * 100) / e.total)),
    }),
  uploadMany: (eventId, formData, onProgress) =>
    api.post(`/files/event/${eventId}/upload-many`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress?.(Math.round((e.loaded * 100) / e.total)),
    }),
  delete: (id) => api.delete(`/files/${id}`),
};

// ─── Chat API ─────────────────────────────────────────────
export const chatAPI = {
  send: (message) => api.post('/chat', { message }),
  history: (params) => api.get('/chat/history', { params }),
  clear: () => api.delete('/chat/history'),
};

// ─── Analytics API ────────────────────────────────────────
export const analyticsAPI = {
  get: () => api.get('/analytics'),
};

export default api;
