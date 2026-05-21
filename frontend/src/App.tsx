// File: frontend/src/App.tsx
// Purpose: Top-level component that defines every application route.
// Functionality: Public routes (/login, /register) plus authenticated
// routes wrapped in ProtectedRoute and admin-only routes wrapped in
// AdminRoute. Most screens are placeholders that will be replaced in
// blocks 7-9.
// Role: Mounted by main.tsx inside the Router and QueryClient providers.

import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AdminRoute } from './routes/AdminRoute';
import { LoginScreen } from './screens/LoginScreen';
import { RegisterScreen } from './screens/RegisterScreen';
import { TorneoScreen } from './screens/TorneoScreen';
import { EstadisticasScreen } from './screens/EstadisticasScreen';
import { PlaceholderScreen } from './screens/PlaceholderScreen';

export default function App() {
  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/register" element={<RegisterScreen />} />

      {/* Authenticated routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Navigate to="/torneo" replace />} />
        <Route path="/torneo" element={<TorneoScreen />} />
        <Route path="/estadisticas" element={<EstadisticasScreen />} />
        <Route
          path="/predicciones"
          element={<PlaceholderScreen title="Predicciones" block="8" />}
        />
        <Route path="/fixture" element={<PlaceholderScreen title="Fixture" block="8" />} />
        <Route path="/mas" element={<PlaceholderScreen title="Más" block="8" />} />
        <Route
          path="/mas/reglas"
          element={<PlaceholderScreen title="Reglas del torneo" block="8" />}
        />

        {/* Admin-only routes (hidden from non-admins in the UI) */}
        <Route element={<AdminRoute />}>
          <Route
            path="/admin/usuarios"
            element={<PlaceholderScreen title="Panel Admin · Usuarios" block="9" />}
          />
          <Route
            path="/admin/resultados"
            element={<PlaceholderScreen title="Panel Admin · Resultados" block="9" />}
          />
        </Route>
      </Route>

      {/* Catch-all: redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
