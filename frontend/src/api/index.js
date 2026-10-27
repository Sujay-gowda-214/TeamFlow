import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const publicAuthRoutes = ['/auth/login/', '/auth/register/', '/auth/refresh/'];
    if (
      error.response?.status === 401
      && original
      && !original._retry
      && !publicAuthRoutes.includes(original.url)
    ) {
      original._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh/`, { refresh });
          localStorage.setItem('access_token', data.access);
          if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
          original.headers.Authorization = `Bearer ${data.access}`;
          return api(original);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login/', data),
  register: (data) => api.post('/auth/register/', data),
  me: () => api.get('/auth/me/'),
  updateProfile: (data) => api.put('/auth/me/update/', data),
  changePassword: (data) => api.post('/auth/me/change-password/', data),
  listUsers: () => api.get('/auth/users/'),
};

export const teamsAPI = {
  list: () => api.get('/teams/'),
  get: (id) => api.get(`/teams/${id}/`),
  create: (data) => api.post('/teams/', data),
  update: (id, data) => api.put(`/teams/${id}/`, data),
  delete: (id) => api.delete(`/teams/${id}/`),
  addMember: (id, data) => api.post(`/teams/${id}/members/`, data),
  removeMember: (id, userId) => api.delete(`/teams/${id}/members/${userId}/`),
};

export const projectsAPI = {
  list: () => api.get('/projects/'),
  get: (id) => api.get(`/projects/${id}/`),
  create: (data) => api.post('/projects/', data),
  update: (id, data) => api.put(`/projects/${id}/`, data),
  delete: (id) => api.delete(`/projects/${id}/`),
  addMember: (id, data) => api.post(`/projects/${id}/members/`, data),
  dashboardStats: () => api.get('/projects/dashboard/stats/'),
};

export const tasksAPI = {
  list: (params) => api.get('/tasks/', { params }),
  get: (id) => api.get(`/tasks/${id}/`),
  create: (data) => api.post('/tasks/', data),
  update: (id, data) => api.put(`/tasks/${id}/`, data),
  delete: (id) => api.delete(`/tasks/${id}/`),
  activityLog: (params) => api.get('/tasks/activity/', { params }),
};

export const commentsAPI = {
  list: (taskId) => api.get(`/comments/task/${taskId}/`),
  create: (taskId, data) => api.post(`/comments/task/${taskId}/`, data),
  update: (id, data) => api.put(`/comments/${id}/`, data),
  delete: (id) => api.delete(`/comments/${id}/`),
};

export const notificationsAPI = {
  list: () => api.get('/notifications/'),
  markRead: (id) => api.put(`/notifications/${id}/read/`),
  markAllRead: () => api.put('/notifications/read-all/'),
  delete: (id) => api.delete(`/notifications/${id}/`),
};

export default api;
