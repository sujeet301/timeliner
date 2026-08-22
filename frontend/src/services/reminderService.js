// src/services/reminderService.js
import apiClient from './apiClient';

export const reminderService = {
  listForTask: (taskId) => apiClient.get(`/api/tasks/${taskId}/reminders`),
  create: (taskId, payload) => apiClient.post(`/api/tasks/${taskId}/reminders`, payload),
  update: (id, payload) => apiClient.put(`/api/reminders/${id}`, payload),
  cancel: (id) => apiClient.delete(`/api/reminders/${id}`),
  snooze: (id, payload) => apiClient.patch(`/api/reminders/${id}/snooze`, payload),
};
