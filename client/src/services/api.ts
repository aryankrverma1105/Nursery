import axios from 'axios';

// Configure global default axios instance to ensure withCredentials and auth header are attached everywhere
axios.defaults.baseURL = '/api';
axios.defaults.withCredentials = true;

const attachAuthHeader = (config: any) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('nursery_token') : null;
  if (token) {
    config.headers = config.headers || {};
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  config.withCredentials = true;
  return config;
};

axios.interceptors.request.use(attachAuthHeader);

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(attachAuthHeader);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/login')) {
      originalRequest._retry = true;
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('nursery_token') : null;
        const res = await axios.post('/api/auth/refresh', { refreshToken: token }, { withCredentials: true });
        if (res.data.accessToken) {
          localStorage.setItem('nursery_token', res.data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`;
        }
        return api(originalRequest);
      } catch (refreshErr) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('nursery_token');
          localStorage.removeItem('nursery_user');
        }
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default api;

