// File: frontend/src/components/Field.tsx
// Purpose: Form field with label, optional helper text, optional error
// and password show/hide toggle.
// Functionality: Wraps a controlled `<input>` and mirrors the mockup
// styling: small uppercase navy label, rounded border, brand orange focus
// ring, red border on error. The password variant exposes an eye icon to
// reveal the value.
// Role: Used by the Login, Register, and admin user create/edit forms.

import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string;
  helper?: string;
  error?: string;
  type?: 'text' | 'email' | 'password' | 'number';
};

export const Field = forwardRef<HTMLInputElement, Props>(function Field(
  { label, helper, error, type = 'text', className = '', ...inputProps },
  ref,
) {
  // Local state controls whether the password is shown. Reset on each render
  // is intentional: this is purely UI state, never persisted.
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const effectiveType = isPassword && show ? 'text' : type;

  return (
    <label className="block">
      <span className="block text-[11px] font-bold tracking-wider mb-1.5 uppercase text-brand-navy">
        {label}
      </span>
      <div className="relative">
        <input
          ref={ref}
          type={effectiveType}
          className={`w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition border bg-surface text-ink focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 ${
            error ? 'border-danger' : ''
          } ${className}`}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted"
            aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error ? (
        <span className="block mt-1 text-[11px] text-danger font-semibold">{error}</span>
      ) : (
        helper && <span className="block mt-1 text-[11px] text-muted">{helper}</span>
      )}
    </label>
  );
});
