// File: frontend/src/components/Layout.tsx
// Purpose: Shared screen scaffold for tabbed pages.
// Functionality: Composes `Header` on top, the scrollable content area in
// the middle and `TabBar` at the bottom. The mobile-first layout fills
// the viewport vertically so the tab bar always sits at the bottom.
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
};

export function Layout({ title, adminBadge, children, bg = 'surface-alt' }: Props) {
  return (
    <div
      className={`flex flex-col min-h-screen ${
        bg === 'surface' ? 'bg-surface' : 'bg-surface-alt'
      }`}
    >
      <Header title={title} adminBadge={adminBadge} />
      <main className="flex-1 overflow-y-auto">{children}</main>
      <TabBar />
    </div>
  );
}
