// src/services/authService.js
import apiClient from './apiClient';

export const authService = {
  signup: (payload) => apiClient.post('/api/auth/signup', payload),
  login: (payload) => apiClient.post('/api/auth/login', payload),
  googleLogin: (credential) => apiClient.post('/api/auth/google', { credential }),
  logout: () => apiClient.post('/api/auth/logout'),
  me: () => apiClient.get('/api/auth/me'),
  refreshToken: () => apiClient.post('/api/auth/refresh-token'),
  updateProfile: (payload) => apiClient.put('/api/auth/profile', payload),
  forgotPassword: (email) => apiClient.post('/api/auth/forgot-password', { email }),
  resetPassword: (payload) => apiClient.post('/api/auth/reset-password', payload),
  requestOtp: (phone) => apiClient.post('/api/auth/request-otp', { phone }),
  verifyOtp: (otp) => apiClient.post('/api/auth/verify-otp', { otp }),
  updateLeetcodeSettings: (payload) => apiClient.put('/api/auth/leetcode-settings', payload),
  getLeetcodeStatus: () => apiClient.get('/api/auth/leetcode-status'),
};
