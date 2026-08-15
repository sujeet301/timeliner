// src/utils/toastHelpers.js
import { toast } from 'react-toastify';

/**
 * Shows a toast with an inline "Undo" action — used after soft-deleting a
 * task so the user has a beat to reverse it instead of hunting through Trash.
 */
export function showUndoToast(message, onUndo) {
  toast(
    ({ closeToast }) => (
      <div className="flex items-center justify-between gap-4">
        <span>{message}</span>
        <button
          onClick={() => {
            onUndo();
            closeToast();
          }}
          className="shrink-0 rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-white hover:bg-primary-hover"
        >
          Undo
        </button>
      </div>
    ),
    { autoClose: 6000 }
  );
}
