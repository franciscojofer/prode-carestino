// File: frontend/src/screens/LoginScreen.tsx
// Purpose: Placeholder login screen for block 6.
// Functionality: Renders the orange splash header from the mockup with the
// logo and brand text so the visual setup can be verified. The real form
// (with react-hook-form, zod and error handling) is implemented in block 7.
// Role: Bound to /login.

import { Logo } from '../components/Logo';

export function LoginScreen() {
  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <div className="pt-12 pb-10 px-6 flex flex-col items-center bg-brand-orange text-white">
        <Logo size={56} />
        <div className="mt-3 text-[10px] tracking-[0.22em] opacity-90 font-semibold">
          PRODE CARESTINO
        </div>
        <div className="mt-1 text-2xl font-extrabold tracking-tight">Mundial 2026</div>
      </div>
      <div className="flex-1 px-6 py-8 flex flex-col items-center justify-center text-center">
        <div className="text-sm text-muted">Login se implementa en el bloque 7.</div>
      </div>
      <div className="px-6 py-4 text-center text-[10px] tracking-wider text-muted">
        CARESTINO · BEBÉS FELICES
      </div>
    </div>
  );
}
