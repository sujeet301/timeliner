// src/services/apiClient.js
//
// One Axios instance for the whole app. Two interceptors do the heavy lifting:
//   - REQUEST: attaches the in-memory access token as a Bearer header.
//   - RESPONSE: on a 401, tries POST /auth/refresh-token exactly once (using
//     the httpOnly refresh cookie the backend set at login), then replays the
//     original request with the new access token. If the refresh itself
//     fails, the store is cleared and the user is sent back to /login.
//
// The access token is deliberately kept in memory (Redux state) rather than
// localStorage, so it isn't readable by injected/XSS'd JS — the refresh
// token never touches JS at all, since it lives in an httpOnly cookie set by
// the server.

import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL,
  withCredentials: true, // send/receive the httpOnly refresh-token cookie
});

// These are wired up from redux/store.js after the store exists, avoiding a
// circular import between the store and this module.
let getAccessToken = () => null;
let onTokenRefreshed = () => {};
let onRefreshFailed = () => {};

export function registerAuthHooks({ getAccessToken: get, onTokenRefreshed: refreshed, onRefreshFailed: failed }) {
  getAccessToken = get;
  onTokenRefreshed = refreshed;
  onRefreshFailed = failed;
}

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let pendingQueue = [];

function resolveQueue(error, token) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  pendingQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const isAuthRoute = originalRequest?.url?.includes('/auth/');

    if (status !== 401 || isAuthRoute || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Another request already triggered a refresh — queue this one behind it.
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post(
        `${baseURL}/auth/refresh-token`,
        {},
        { withCredentials: true }
      );
      const newToken = data.data.accessToken;
      onTokenRefreshed(newToken);
      resolveQueue(null, newToken);
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      resolveQueue(refreshError, null);
      onRefreshFailed();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;
