// File: frontend/src/components/SegmentedControl.tsx
// Purpose: Multi-option pill toggle used at the top of the admin screens
// to switch between Usuarios, Resultados and Logs.
// Functionality: Generic over the value type. Renders side-by-side buttons
// with the brand orange fill on the active side and muted text on the
// other. Column count adapts to the number of options.
// Role: Used by the admin screens; kept generic in case the pattern needs
// to come back elsewhere.

import type { ReactNode } from 'react';

type Option<T extends string> = {
  value: T;
  label: ReactNode;
};

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (next: T) => void;
};

// Static Tailwind classes keyed by option count so the grid track count is
// known at build time (dynamic class names would be purged otherwise).
const GRID_COLS: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
};

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <div className={`grid ${GRID_COLS[options.length] ?? 'grid-cols-2'} rounded-xl p-1 bg-surface border`}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`py-2 text-xs font-bold rounded-lg transition-colors ${
              active ? 'bg-brand-orange text-white' : 'text-muted'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
