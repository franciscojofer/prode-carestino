// File: frontend/src/routes/ProtectedRoute.tsx
// Purpose: Route guard for authenticated-only pages.
// Functionality: Reads `useAuth().user`. Shows a centred loading state
// while the `/auth/me` query is in flight; redirects to /login (storing
// the original location for a future redirect-back) if no session exists.
// Role: Wraps every page under /torneo, /estadisticas, /predicciones, etc.

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted text-sm">
        Cargando…
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <Outlet />;
}
