// src/redux/reminderSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { reminderService } from '../services/reminderService';
import { toast } from 'react-toastify';

export const fetchReminders = createAsyncThunk(
  'reminders/fetchForTask',
  async (taskId, { rejectWithValue }) => {
    try {
      const { data } = await reminderService.listForTask(taskId);
      return { taskId, reminders: data.data };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message);
    }
  }
);

export const createReminder = createAsyncThunk(
  'reminders/create',
  async ({ taskId, payload }, { rejectWithValue }) => {
    try {
      const { data } = await reminderService.create(taskId, payload);
      toast.success('Reminder scheduled');
      return { taskId, reminder: data.data };
    } catch (err) {
      const message = err.response?.data?.message || 'Could not create reminder';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateReminder = createAsyncThunk(
  'reminders/update',
  async ({ id, taskId, payload }, { rejectWithValue }) => {
    try {
      const { data } = await reminderService.update(id, payload);
      toast.success('Reminder updated');
      return { taskId, reminder: data.data };
    } catch (err) {
      const message = err.response?.data?.message || 'Could not update reminder';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const snoozeReminder = createAsyncThunk(
  'reminders/snooze',
  async ({ id, taskId, payload }, { rejectWithValue }) => {
    try {
      const { data } = await reminderService.snooze(id, payload);
      toast.success('Reminder snoozed');
      return { taskId, reminder: data.data };
    } catch (err) {
      const message = err.response?.data?.message || 'Could not snooze reminder';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const cancelReminder = createAsyncThunk(
  'reminders/cancel',
  async ({ id, taskId }, { rejectWithValue }) => {
    try {
      const { data } = await reminderService.cancel(id);
      toast.success('Reminder cancelled');
      return { taskId, reminder: data.data };
    } catch (err) {
      const message = err.response?.data?.message || 'Could not cancel reminder';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

const reminderSlice = createSlice({
  name: 'reminders',
  initialState: {
    byTaskId: {}, // { [taskId]: Reminder[] }
    status: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReminders.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchReminders.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.byTaskId[action.payload.taskId] = action.payload.reminders;
      })
      .addCase(fetchReminders.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(createReminder.fulfilled, (state, action) => {
        const { taskId, reminder } = action.payload;
        state.byTaskId[taskId] = [...(state.byTaskId[taskId] || []), reminder];
      })
      .addCase(updateReminder.fulfilled, (state, action) => {
        replaceReminder(state, action.payload);
      })
      .addCase(snoozeReminder.fulfilled, (state, action) => {
        replaceReminder(state, action.payload);
      })
      .addCase(cancelReminder.fulfilled, (state, action) => {
        replaceReminder(state, action.payload);
      });
  },
});

function replaceReminder(state, { taskId, reminder }) {
  const list = state.byTaskId[taskId];
  if (!list) return;
  const idx = list.findIndex((r) => r._id === reminder._id);
  if (idx !== -1) list[idx] = reminder;
}

export default reminderSlice.reducer;
