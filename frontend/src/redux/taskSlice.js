// src/redux/taskSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { taskService } from '../services/taskService';
import { toast } from 'react-toastify';

const initialFilters = { search: '', status: '', priority: '', category: '', tag: '', sortBy: 'createdAt', order: 'desc', page: 1, limit: 20 };

export const fetchTasks = createAsyncThunk('tasks/fetchAll', async (filters, { rejectWithValue }) => {
  try {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
    const { data } = await taskService.list(params);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Could not load tasks');
  }
});

export const fetchTrash = createAsyncThunk('tasks/fetchTrash', async (_, { rejectWithValue }) => {
  try {
    const { data } = await taskService.trash();
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const createTask = createAsyncThunk('tasks/create', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await taskService.create(payload);
    toast.success(`"${data.data.title}" added`);
    return data.data;
  } catch (err) {
    const message = err.response?.data?.message || 'Could not create task';
    toast.error(message);
    return rejectWithValue(message);
  }
});

export const updateTask = createAsyncThunk('tasks/update', async ({ id, payload }, { rejectWithValue }) => {
  try {
    const { data } = await taskService.update(id, payload);
    toast.success('Task updated');
    return data.data;
  } catch (err) {
    const message = err.response?.data?.message || 'Could not update task';
    toast.error(message);
    return rejectWithValue(message);
  }
});

export const updateTaskStatus = createAsyncThunk('tasks/updateStatus', async ({ id, status }, { rejectWithValue }) => {
  try {
    const { data } = await taskService.updateStatus(id, status);
    return data.data;
  } catch (err) {
    const message = err.response?.data?.message || 'Could not update status';
    toast.error(message);
    return rejectWithValue(message);
  }
});

export const updateSubtask = createAsyncThunk('tasks/updateSubtask', async ({ taskId, subtaskId, payload }, { rejectWithValue }) => {
  try {
    const { data } = await taskService.updateSubtask(taskId, subtaskId, payload);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const softDeleteTask = createAsyncThunk('tasks/softDelete', async (id, { rejectWithValue }) => {
  try {
    await taskService.softDelete(id);
    return id;
  } catch (err) {
    const message = err.response?.data?.message || 'Could not delete task';
    toast.error(message);
    return rejectWithValue(message);
  }
});

export const restoreTask = createAsyncThunk('tasks/restore', async (id, { rejectWithValue }) => {
  try {
    const { data } = await taskService.restore(id);
    toast.success('Task restored');
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const permanentlyDeleteTask = createAsyncThunk('tasks/permanentDelete', async (id, { rejectWithValue }) => {
  try {
    await taskService.permanentDelete(id);
    toast.success('Task permanently deleted');
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

const taskSlice = createSlice({
  name: 'tasks',
  initialState: { items: [], trash: [], status: 'idle', error: null, pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }, filters: initialFilters },
  reducers: {
    setFilters: (state, action) => { state.filters = { ...state.filters, ...action.payload, page: action.payload.page || 1 }; },
    resetFilters: (state) => { state.filters = initialFilters; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchTasks.fulfilled, (state, action) => { state.status = 'succeeded'; state.items = action.payload.data; state.pagination = action.payload.pagination; })
      .addCase(fetchTasks.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; })
      .addCase(fetchTrash.fulfilled, (state, action) => { state.trash = action.payload; })
      .addCase(createTask.fulfilled, (state, action) => { state.items.unshift(action.payload); state.pagination.total += 1; })
      .addCase(updateTask.fulfilled, (state, action) => { const idx = state.items.findIndex((t) => t._id === action.payload._id); if (idx !== -1) state.items[idx] = action.payload; })
      .addCase(updateTaskStatus.fulfilled, (state, action) => { const idx = state.items.findIndex((t) => t._id === action.payload._id); if (idx !== -1) state.items[idx] = action.payload; })
      .addCase(updateSubtask.fulfilled, (state, action) => { const idx = state.items.findIndex((t) => t._id === action.payload._id); if (idx !== -1) state.items[idx] = action.payload; })
      .addCase(softDeleteTask.fulfilled, (state, action) => { state.items = state.items.filter((t) => t._id !== action.payload); })
      .addCase(restoreTask.fulfilled, (state, action) => { state.trash = state.trash.filter((t) => t._id !== action.payload._id); })
      .addCase(permanentlyDeleteTask.fulfilled, (state, action) => { state.trash = state.trash.filter((t) => t._id !== action.payload); });
  },
});

export const { setFilters, resetFilters } = taskSlice.actions;
export default taskSlice.reducer;
