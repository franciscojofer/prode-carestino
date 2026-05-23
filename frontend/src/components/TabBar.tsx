// File: frontend/src/components/TabBar.tsx
// Purpose: Bottom navigation bar shown on every authenticated screen.
// Functionality: Renders five fixed tabs linking to the main app routes.
// The active tab is derived from the current URL so it stays in sync
// with browser back/forward and direct navigation.
// Role: Used inside `Layout`; not rendered on /login, /register or any
// admin sub-route (those keep the user in a focused flow).

import { NavLink, useLocation } from 'react-router-dom';
import { Trophy, BarChart3, Target, Calendar, MoreHorizontal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Tab = { to: string; label: string; Icon: LucideIcon };

const TABS: Tab[] = [
  { to: '/torneo', label: 'Torneo', Icon: Trophy },
  { to: '/estadisticas', label: 'Estadísticas', Icon: BarChart3 },
  { to: '/predicciones', label: 'Predicciones', Icon: Target },
  { to: '/fixture', label: 'Fixture', Icon: Calendar },
  { to: '/mas', label: 'Más', Icon: MoreHorizontal },
];

export function TabBar() {
  const { pathname } = useLocation();

  return (
    <nav className="grid grid-cols-5 border-t bg-surface">
      {TABS.map(({ to, label, Icon }) => {
        // `startsWith` so that `/mas/reglas` keeps the "Más" tab highlighted.
        // Admin sub-routes belong conceptually to the "Más" tab (they are
        // reached only through the Panel Admin entry), so any /admin/*
        // path also highlights the "Más" tab.
        const isActive =
          pathname === to ||
          pathname.startsWith(`${to}/`) ||
          (to === '/mas' && pathname.startsWith('/admin/'));
        return (
          <NavLink
            key={to}
            to={to}
            className={`flex flex-col items-center gap-1 py-2.5 transition-all duration-150 active:scale-95 ${
              isActive ? 'text-brand-orange' : 'text-muted'
            }`}
          >
            <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
            <span className="text-[10px] font-semibold tracking-wide">{label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
