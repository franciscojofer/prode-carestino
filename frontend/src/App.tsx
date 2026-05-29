// File: frontend/src/App.tsx
// Purpose: Top-level component that defines every application route.
// Functionality: Public login route plus authenticated routes wrapped in
// ProtectedRoute and admin-only routes wrapped in AdminRoute. Public
// self-registration was removed — users are seeded from the payroll CSV
// and managed exclusively from the admin panel.
// Role: Mounted by main.tsx inside the Router and QueryClient providers.

import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AdminRoute } from './routes/AdminRoute';
import { LoginScreen } from './screens/LoginScreen';
import { TorneoScreen } from './screens/TorneoScreen';
import { EstadisticasScreen } from './screens/EstadisticasScreen';
import { PrediccionesScreen } from './screens/PrediccionesScreen';
import { FixtureScreen } from './screens/FixtureScreen';
import { MasScreen } from './screens/MasScreen';
import { ReglasScreen } from './screens/ReglasScreen';
import { AdminUsuariosScreen } from './screens/AdminUsuariosScreen';
import { AdminResultadosScreen } from './screens/AdminResultadosScreen';

export default function App() {
  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login" element={<LoginScreen />} />

      {/* Authenticated routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Navigate to="/torneo" replace />} />
        <Route path="/torneo" element={<TorneoScreen />} />
        <Route path="/estadisticas" element={<EstadisticasScreen />} />
        <Route path="/predicciones" element={<PrediccionesScreen />} />
        <Route path="/fixture" element={<FixtureScreen />} />
        <Route path="/mas" element={<MasScreen />} />
        <Route path="/mas/reglas" element={<ReglasScreen />} />

        {/* Admin-only routes (hidden from non-admins in the UI) */}
        <Route element={<AdminRoute />}>
          <Route path="/admin/usuarios" element={<AdminUsuariosScreen />} />
          <Route path="/admin/resultados" element={<AdminResultadosScreen />} />
        </Route>
      </Route>

      {/* Catch-all: redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
