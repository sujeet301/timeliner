// src/utils/categoryColors.js
//
// Assigns each category/tag name a consistent color from a small curated
// palette — the same name always maps to the same color (a simple string
// hash picks the index), so categories become visually distinguishable at a
// glance the way subway lines use color, without needing to store a color
// per category anywhere.

const PALETTE = [
  { bg: '#e6e6fd', fg: '#5b5bef' }, // indigo
  { bg: '#ffe4dc', fg: '#e65a3a' }, // flame
  { bg: '#d8f4e9', fg: '#0f9468' }, // emerald
  { bg: '#fbecd0', fg: '#c97d0a' }, // amber
  { bg: '#fde3e3', fg: '#dc3d3d' }, // red
  { bg: '#dbeafe', fg: '#2563eb' }, // blue
  { bg: '#fce7f6', fg: '#c0338a' }, // pink
  { bg: '#e0f2f1', fg: '#0f766e' }, // teal
];

const DARK_PALETTE = [
  { bg: '#2a2a54', fg: '#a5a6fa' },
  { bg: '#3a2318', fg: '#ff9a7a' },
  { bg: '#123227', fg: '#4ade95' },
  { bg: '#3c2e12', fg: '#f7b955' },
  { bg: '#3c1f22', fg: '#fa8686' },
  { bg: '#1e293b', fg: '#60a5fa' },
  { bg: '#3b1530', fg: '#ec7fc3' },
  { bg: '#122e2c', fg: '#4fd1c5' },
];

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // force 32-bit int
  }
  return Math.abs(hash);
}

/**
 * Returns { bg, fg } inline style colors for a category/tag label. Pass
 * `isDark` (from useTheme) so the palette stays legible in both themes —
 * these are deliberately plain hex values (not CSS variables) since each
 * label needs its own fixed hue rather than swapping with the site theme.
 */
export function getCategoryColor(label, isDark = false) {
  if (!label) return isDark ? DARK_PALETTE[0] : PALETTE[0];
  const palette = isDark ? DARK_PALETTE : PALETTE;
  const index = hashString(label.toLowerCase()) % palette.length;
  return palette[index];
}
