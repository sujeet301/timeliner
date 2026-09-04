// src/redux/store.js
import { configureStore } from '@reduxjs/toolkit';
import authReducer, { tokenRefreshed, sessionCleared } from './authSlice';
import taskReducer from './taskSlice';
import reminderReducer from './reminderSlice';
import uiReducer from './uiSlice';
import { registerAuthHooks } from '../services/apiClient';

export const store = configureStore({
  reducer: { auth: authReducer, tasks: taskReducer, reminders: reminderReducer, ui: uiReducer },
});

registerAuthHooks({
  getAccessToken: () => store.getState().auth.accessToken,
  onTokenRefreshed: (token) => store.dispatch(tokenRefreshed(token)),
  onRefreshFailed: () => store.dispatch(sessionCleared()),
});
