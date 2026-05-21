// File: frontend/src/components/Toggle.tsx
// Purpose: Compact on/off switch used by the admin to toggle the `isAdmin`
// and `isActive` flags on a user row.
// Functionality: Pure controlled component. Background switches between
// brand orange (on) and the border colour (off); the white knob slides
// across via inline left offset.
// Role: Used by the admin Usuarios screen — both inline on the user row
// and inside the edit modal.

type Props = {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
};

export function Toggle({ checked, onChange, disabled, label }: Props) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`relative w-9 h-5 rounded-full transition-colors ${
        checked ? 'bg-brand-orange' : 'bg-surface-alt border'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm"
        style={{ left: checked ? 18 : 2 }}
      />
    </button>
  );
}
