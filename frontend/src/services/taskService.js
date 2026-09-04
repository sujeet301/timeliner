// src/services/taskService.js
import apiClient from './apiClient';

export const taskService = {
  list: (params) => apiClient.get('/tasks', { params }),
  trash: () => apiClient.get('/tasks/trash'),
  getById: (id) => apiClient.get(`/tasks/${id}`),
  create: (payload) => apiClient.post('/tasks', payload),
  update: (id, payload) => apiClient.put(`/tasks/${id}`, payload),
  updateStatus: (id, status) => apiClient.patch(`/tasks/${id}/status`, { status }),
  updateSubtask: (taskId, subtaskId, payload) => apiClient.patch(`/tasks/${taskId}/subtasks/${subtaskId}`, payload),
  softDelete: (id) => apiClient.delete(`/tasks/${id}`),
  restore: (id) => apiClient.patch(`/tasks/${id}/restore`),
  permanentDelete: (id) => apiClient.delete(`/tasks/${id}/permanent`),
};
