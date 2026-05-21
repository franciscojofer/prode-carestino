// File: frontend/src/components/Modal.tsx
// Purpose: Lightweight modal dialog used by the admin user create / edit
// forms.
// Functionality: Renders a fixed-position overlay with a rounded card
// centred horizontally and pinned to the bottom of the viewport on mobile.
// Closes on the X button, the backdrop, or pressing Escape. Body scroll
// is locked while open.
// Role: Used by AdminUsuariosScreen.

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

export function Modal({ open, onClose, title, children }: Props) {
  // Disable background scroll while the modal is on screen and listen for
  // Escape to dismiss. Cleanup restores both.
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40"
      onMouseDown={(e) => {
        // Close only when the click originated on the backdrop, not on
        // the card itself.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-card max-h-[92vh] flex flex-col">
        <header className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="text-sm font-extrabold text-brand-navy">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-muted"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </header>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
