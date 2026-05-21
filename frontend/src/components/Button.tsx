// File: frontend/src/components/Button.tsx
// Purpose: Branded button with `primary`, `secondary`, `ghost` and `danger`
// variants in two sizes.
// Functionality: Mirrors the mockup styling pixel-by-pixel. Adds a subtle
// scale on press and respects the `disabled` HTML attribute by dimming
// the button and showing a `not-allowed` cursor.
// Role: Used everywhere a CTA or button-style action is needed.

import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

// Class lookup tables — keep all styling decisions in one place so visual
// tweaks don't fight with the rest of the codebase.
const variantClasses: Record<Variant, string> = {
  primary: 'bg-brand-orange text-white hover:bg-brand-orange-dark',
  secondary: 'bg-surface text-brand-orange border-2 border-brand-orange',
  ghost: 'bg-transparent text-brand-navy',
  danger: 'bg-danger text-white',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  type = 'button',
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={`${variantClasses[variant]} ${sizeClasses[size]} ${
        fullWidth ? 'w-full' : ''
      } rounded-lg font-bold tracking-wide transition active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      {...rest}
    />
  );
}
