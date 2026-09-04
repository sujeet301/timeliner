// src/redux/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../services/authService';
import { toast } from 'react-toastify';

export const signup = createAsyncThunk('auth/signup', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await authService.signup(payload);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Signup failed');
  }
});

export const login = createAsyncThunk('auth/login', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await authService.login(payload);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Invalid email or password');
  }
});

export const googleLogin = createAsyncThunk('auth/googleLogin', async (credential, { rejectWithValue }) => {
  try {
    const { data } = await authService.googleLogin(credential);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Google sign-in failed');
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await authService.logout();
  } catch {
    // still clear local state below
  }
});

// IMPORTANT: apiClient's request interceptor reads the access token from the
// Redux store (via registerAuthHooks in services/apiClient.js), not from a
// local variable. A thunk's return value only reaches the store after the
// whole thunk resolves — so the follow-up /me call here would go out with a
// stale/missing token unless we dispatch tokenRefreshed immediately.
export const restoreSession = createAsyncThunk('auth/restoreSession', async (_, { rejectWithValue, dispatch }) => {
  try {
    const { data } = await authService.refreshToken();
    const accessToken = data.data.accessToken;
    dispatch(tokenRefreshed(accessToken));
    const me = await authService.me();
    return { accessToken, user: me.data.data.user };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const updateProfile = createAsyncThunk('auth/updateProfile', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await authService.updateProfile(payload);
    toast.success('Profile updated');
    return data.data.user;
  } catch (err) {
    const message = err.response?.data?.message || 'Could not update profile';
    toast.error(message);
    return rejectWithValue(message);
  }
});

export const updateLeetcodeSettings = createAsyncThunk('auth/updateLeetcodeSettings', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await authService.updateLeetcodeSettings(payload);
    toast.success('LeetCode reminder settings saved');
    return data.data.user;
  } catch (err) {
    const message = err.response?.data?.message || 'Could not save LeetCode settings';
    toast.error(message);
    return rejectWithValue(message);
  }
});

export const updateAccessToken = (token) => ({ type: 'auth/tokenRefreshed', payload: token });

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, accessToken: null, status: 'idle', bootstrapping: true, error: null },
  reducers: {
    tokenRefreshed: (state, action) => {
      state.accessToken = action.payload;
    },
    sessionCleared: (state) => {
      state.user = null;
      state.accessToken = null;
    },
    setUser: (state, action) => {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signup.pending, (state) => { state.status = 'loading'; state.error = null; })
      .addCase(signup.fulfilled, (state, action) => { state.status = 'succeeded'; state.user = action.payload.user; state.accessToken = action.payload.accessToken; })
      .addCase(signup.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; })
      .addCase(login.pending, (state) => { state.status = 'loading'; state.error = null; })
      .addCase(login.fulfilled, (state, action) => { state.status = 'succeeded'; state.user = action.payload.user; state.accessToken = action.payload.accessToken; })
      .addCase(login.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; })
      .addCase(googleLogin.pending, (state) => { state.status = 'loading'; state.error = null; })
      .addCase(googleLogin.fulfilled, (state, action) => { state.status = 'succeeded'; state.user = action.payload.user; state.accessToken = action.payload.accessToken; })
      .addCase(googleLogin.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; })
      .addCase(logout.fulfilled, (state) => { state.user = null; state.accessToken = null; })
      .addCase(restoreSession.pending, (state) => { state.bootstrapping = true; })
      .addCase(restoreSession.fulfilled, (state, action) => { state.bootstrapping = false; state.user = action.payload.user; state.accessToken = action.payload.accessToken; })
      .addCase(restoreSession.rejected, (state) => { state.bootstrapping = false; state.user = null; state.accessToken = null; })
      .addCase(updateProfile.fulfilled, (state, action) => { state.user = action.payload; })
      .addCase(updateLeetcodeSettings.fulfilled, (state, action) => { state.user = action.payload; });
  },
});

export const { tokenRefreshed, sessionCleared, setUser } = authSlice.actions;
export default authSlice.reducer;

export function notifyError(message) {
  toast.error(message);
}
