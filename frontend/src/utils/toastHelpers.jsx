// src/utils/toastHelpers.jsx
import { toast } from 'react-toastify';

export function showUndoToast(message, onUndo) {
  toast(
    ({ closeToast }) => (
      <div className="flex items-center justify-between gap-4">
        <span>{message}</span>
        <button
          onClick={() => { onUndo(); closeToast(); }}
          className="shrink-0 rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-white hover:bg-primary-hover"
        >
          Undo
        </button>
      </div>
    ),
    { autoClose: 6000 }
  );
}
