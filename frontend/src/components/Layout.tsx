// File: frontend/src/components/Layout.tsx
// Purpose: Shared screen scaffold for tabbed pages.
// Functionality: Composes `Header` on top, an optional sticky region just
// below it (used by Predicciones / Fixture for the round selector), the
// scrollable content area in the middle and `TabBar` at the bottom. The
// container is locked to the viewport height (`h-dvh`) so only the main
// content scrolls — the header, sticky region and tab bar remain fixed.
// Role: Wraps the Torneo, Estadísticas, Predicciones, Fixture and Más
// screens.

import type { ReactNode } from 'react';
import { Header } from './Header';
import { TabBar } from './TabBar';

type Props = {
  title: string;
  adminBadge?: boolean;
  children: ReactNode;
  // Page background — most screens use the slightly tinted alt surface;
  // a few (the Reglas sub-page) use the plain white surface.
  bg?: 'surface' | 'surface-alt';
  // Optional element pinned between the header and the scrollable area
  // (e.g. the round selector + progress bar on Predicciones / Fixture).
  stickyContent?: ReactNode;
};

export function Layout({ title, adminBadge, children, bg = 'surface-alt', stickyContent }: Props) {
  return (
    <div
      className={`flex flex-col h-dvh overflow-hidden ${
        bg === 'surface' ? 'bg-surface' : 'bg-surface-alt'
      }`}
    >
      <Header title={title} adminBadge={adminBadge} />
      {stickyContent && (
        <div className="shrink-0 animate-fade-slide-in">{stickyContent}</div>
      )}
      <main className="flex-1 overflow-y-auto overscroll-y-contain animate-fade-slide-in">
        {children}
      </main>
      <TabBar />
    </div>
  );
}
