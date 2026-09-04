// src/redux/uiSlice.js
import { createSlice } from '@reduxjs/toolkit';

function getInitialTheme() {
  const stored = window.localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const uiSlice = createSlice({
  name: 'ui',
  initialState: { theme: getInitialTheme(), mobileNavOpen: false },
  reducers: {
    toggleTheme: (state) => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      window.localStorage.setItem('theme', state.theme);
    },
    setMobileNavOpen: (state, action) => { state.mobileNavOpen = action.payload; },
  },
});

export const { toggleTheme, setMobileNavOpen } = uiSlice.actions;
export default uiSlice.reducer;
