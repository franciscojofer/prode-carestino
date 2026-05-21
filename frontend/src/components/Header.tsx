// File: frontend/src/components/Header.tsx
// Purpose: Orange branded page header used on every authenticated screen.
// Functionality: Renders the logo (or a back button) on the left, the
// "PRODE CARESTINO" eyebrow plus the page title in the middle, and an
// optional ADMIN badge on the right.
// Role: Used directly by every screen wrapped in `Layout`, and stand-alone
// for sub-pages that need a back button (e.g. /mas/reglas).

import { ArrowLeft } from 'lucide-react';
import { Logo } from './Logo';

type Props = {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  adminBadge?: boolean;
};

export function Header({ title, showBack, onBack, adminBadge }: Props) {
  return (
    <header className="px-4 pt-3 pb-4 flex items-center gap-3 bg-brand-orange text-white">
      {showBack ? (
        <button
          type="button"
          onClick={onBack}
          className="p-1 -ml-1"
          aria-label="Volver"
        >
          <ArrowLeft size={22} />
        </button>
      ) : (
        <Logo size={32} />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[10px] tracking-[0.18em] opacity-80 font-semibold">
          PRODE CARESTINO
        </div>
        <h1 className="text-base font-extrabold tracking-tight truncate">{title}</h1>
      </div>
      {adminBadge && (
        <span
          className="text-[10px] px-2 py-1 rounded-full font-bold"
          style={{ background: 'rgba(255,255,255,0.18)', letterSpacing: '0.15em' }}
        >
          ADMIN
        </span>
      )}
    </header>
  );
}
