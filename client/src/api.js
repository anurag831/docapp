import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

api.interceptors.request.use((config) => {
  const userId = localStorage.getItem('userId');
  if (userId) {
    config.headers['x-user-id'] = userId;
  }
  return config;
});

export const auth = {
  login: (email) => api.post('/auth/login', { email }),
  getUsers: () => api.get('/auth/users')
};

export const docs = {
  getAll: () => api.get('/documents'),
  getById: (id) => api.get(`/documents/${id}`),
  create: (data) => api.post('/documents', data),
  update: (id, data) => api.put(`/documents/${id}`, data),
  delete: (id) => api.delete(`/documents/${id}`),
  share: (id, email, role = 'editor') => api.post(`/documents/${id}/share`, { shareWithEmail: email, role }),
  revokeShare: (id, targetUserId) => api.delete(`/documents/${id}/share/${targetUserId}`),
  upload: (formData) => api.post('/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
};

export const comments = {
  getAll: (docId) => api.get(`/documents/${docId}/comments`),
  create: (docId, data) => api.post(`/documents/${docId}/comments`, data),
  updateStatus: (docId, commentId, status) => api.patch(`/documents/${docId}/comments/${commentId}`, { status }),
  delete: (docId, commentId) => api.delete(`/documents/${docId}/comments/${commentId}`)
};

export const versions = {
  getAll: (docId) => api.get(`/documents/${docId}/versions`),
  getById: (docId, versionId) => api.get(`/documents/${docId}/versions/${versionId}`),
  restore: (docId, versionId) => api.post(`/documents/${docId}/versions/${versionId}/restore`)
};

export default api;
