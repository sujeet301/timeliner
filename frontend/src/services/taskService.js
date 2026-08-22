// src/services/taskService.js
import apiClient from './apiClient';

export const taskService = {
  list: (params) => apiClient.get('/api/tasks', { params }),
  trash: () => apiClient.get('/api/tasks/trash'),
  getById: (id) => apiClient.get(`/api/tasks/${id}`),
  create: (payload) => apiClient.post('/api/tasks', payload),
  update: (id, payload) => apiClient.put(`/api/tasks/${id}`, payload),
  updateStatus: (id, status) => apiClient.patch(`/api/tasks/${id}/status`, { status }),
  updateSubtask: (taskId, subtaskId, payload) =>
    apiClient.patch(`/api/tasks/${taskId}/subtasks/${subtaskId}`, payload),
  softDelete: (id) => apiClient.delete(`/api/tasks/${id}`),
  restore: (id) => apiClient.patch(`/api/tasks/${id}/restore`),
  permanentDelete: (id) => apiClient.delete(`/api/tasks/${id}/permanent`),
};
