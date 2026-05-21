// File: frontend/src/routes/AdminRoute.tsx
// Purpose: Route guard for admin-only pages.
// Functionality: Same flow as `ProtectedRoute` but additionally checks
// `isAdmin`. Non-admin users are redirected to /torneo without an error
// page — admin links are simply hidden from non-admins in the UI, so
// landing on /admin/* directly is treated as a navigation accident.
// Role: Wraps /admin/usuarios and /admin/resultados.

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function AdminRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted text-sm">
        Cargando…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!user.isAdmin) return <Navigate to="/torneo" replace />;
  return <Outlet />;
}
