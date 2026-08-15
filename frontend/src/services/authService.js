// src/services/authService.js
import apiClient from './apiClient';

export const authService = {
  signup: (payload) => apiClient.post('/auth/signup', payload),
  login: (payload) => apiClient.post('/auth/login', payload),
  logout: () => apiClient.post('/auth/logout'),
  me: () => apiClient.get('/auth/me'),
  refreshToken: () => apiClient.post('/auth/refresh-token'),
  updateProfile: (payload) => apiClient.put('/auth/profile', payload),
  forgotPassword: (email) => apiClient.post('/auth/forgot-password', { email }),
  resetPassword: (payload) => apiClient.post('/auth/reset-password', payload),
  requestOtp: (phone) => apiClient.post('/auth/request-otp', { phone }),
  verifyOtp: (otp) => apiClient.post('/auth/verify-otp', { otp }),
};
