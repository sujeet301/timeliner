// src/redux/store.js
import { configureStore } from '@reduxjs/toolkit';
import authReducer, { tokenRefreshed, sessionCleared } from './authSlice';
import taskReducer from './taskSlice';
import reminderReducer from './reminderSlice';
import uiReducer from './uiSlice';
import { registerAuthHooks } from '../services/apiClient';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    tasks: taskReducer,
    reminders: reminderReducer,
    ui: uiReducer,
  },
});

// Let apiClient read the current access token and react to refresh
// success/failure without importing the store directly (which would create
// a circular dependency between store.js and apiClient.js).
registerAuthHooks({
  getAccessToken: () => store.getState().auth.accessToken,
  onTokenRefreshed: (token) => store.dispatch(tokenRefreshed(token)),
  onRefreshFailed: () => store.dispatch(sessionCleared()),
});
