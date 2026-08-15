// src/services/reminderService.js
import apiClient from './apiClient';

export const reminderService = {
  listForTask: (taskId) => apiClient.get(`/tasks/${taskId}/reminders`),
  create: (taskId, payload) => apiClient.post(`/tasks/${taskId}/reminders`, payload),
  update: (id, payload) => apiClient.put(`/reminders/${id}`, payload),
  cancel: (id) => apiClient.delete(`/reminders/${id}`),
  snooze: (id, payload) => apiClient.patch(`/reminders/${id}/snooze`, payload),
};
