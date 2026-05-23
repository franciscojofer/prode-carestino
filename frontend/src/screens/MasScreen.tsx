// File: frontend/src/screens/MasScreen.tsx
// Purpose: "Más" tab — profile chip and a small menu (Reglas, Panel
// Admin, Cerrar sesión).
// Functionality: Reads the current user from `useAuth`. The Panel Admin
// row is only shown for admins. Logout calls the mutation, clears the
// React Query cache (handled inside useAuth) and navigates back to /login.
// Role: Bound to /mas behind ProtectedRoute.

import { useNavigate } from 'react-router-dom';
import { ChevronRight, FileText, LogOut, Settings } from 'lucide-react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { useAuth } from '../hooks/useAuth';

// Initials shown inside the orange avatar chip — same helper used by the
// Torneo card but specialised for the larger size and identical logic.
function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function MasScreen() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;
  const fullName = `${user.nombre} ${user.apellido}`;

  async function handleLogout() {
    await logout.mutateAsync();
    navigate('/login', { replace: true });
  }

  return (
    <Layout title="Más">
      <div className="px-4 -mt-3 mb-4">
        <Card className="px-4 py-3 flex items-center gap-3">
          <div className="rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg bg-brand-orange-soft text-brand-orange">
            {getInitials(fullName) || '—'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-ink truncate">{fullName}</div>
            <div className="text-xs text-muted truncate">{user.email}</div>
          </div>
        </Card>
      </div>

      <div className="px-4">
        <Card>
          <MenuItem
            icon={<FileText size={20} className="text-brand-orange" />}
            label="Reglas"
            onClick={() => navigate('/mas/reglas')}
            chevron
          />
          {user.isAdmin && (
            <>
              <Divider />
              <MenuItem
                icon={<Settings size={20} className="text-brand-orange" />}
                label="Panel Admin"
                onClick={() => navigate('/admin/usuarios')}
                badge="ADMIN"
              />
            </>
          )}
          <Divider />
          <MenuItem
            icon={<LogOut size={20} className="text-danger" />}
            label="Cerrar sesión"
            onClick={handleLogout}
            destructive
          />
        </Card>
      </div>
    </Layout>
  );
}

type MenuItemProps = {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  chevron?: boolean;
  badge?: string;
  destructive?: boolean;
};

function MenuItem({ icon, label, onClick, chevron, badge, destructive }: MenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-surface-alt"
    >
      {icon}
      <span
        className={`flex-1 text-sm font-semibold ${
          destructive ? 'text-danger' : 'text-ink'
        }`}
      >
        {label}
      </span>
      {badge && (
        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider bg-brand-orange-soft text-brand-orange">
          {badge}
        </span>
      )}
      {chevron && <ChevronRight size={18} className="text-muted" />}
    </button>
  );
}

function Divider() {
  return <div className="border-t" />;
}
