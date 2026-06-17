// File: frontend/src/components/AdminTabs.tsx
// Purpose: Shared tab switcher for the admin panel screens.
// Functionality: Renders the Usuarios / Resultados / Logs segmented control
// and navigates to the matching route when a tab other than the active one
// is tapped. Centralised here so every admin screen shows the same tabs.
// Role: Used by AdminUsuarios, AdminResultados and AdminLogs screens.

import { useNavigate } from 'react-router-dom';
import { ClipboardList, History, Users } from 'lucide-react';
import { SegmentedControl } from './SegmentedControl';

// Identifies which admin screen is currently shown so the right tab is lit.
export type AdminTab = 'users' | 'results' | 'logs';

// Route each tab points to.
const ROUTES: Record<AdminTab, string> = {
  users: '/admin/usuarios',
  results: '/admin/resultados',
  logs: '/admin/logs',
};

export function AdminTabs({ active }: { active: AdminTab }) {
  const navigate = useNavigate();

  return (
    <div className="px-4 pt-3 pb-2 shrink-0">
      <SegmentedControl<AdminTab>
        value={active}
        onChange={(v) => {
          if (v !== active) navigate(ROUTES[v]);
        }}
        options={[
          {
            value: 'users',
            label: (
              <>
                <Users size={14} className="inline mr-1.5 -mt-0.5" />
                USUARIOS
              </>
            ),
          },
          {
            value: 'results',
            label: (
              <>
                <ClipboardList size={14} className="inline mr-1.5 -mt-0.5" />
                RESULTADOS
              </>
            ),
          },
          {
            value: 'logs',
            label: (
              <>
                <History size={14} className="inline mr-1.5 -mt-0.5" />
                LOGS
              </>
            ),
          },
        ]}
      />
    </div>
  );
}
