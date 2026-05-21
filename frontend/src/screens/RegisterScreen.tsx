// File: frontend/src/screens/RegisterScreen.tsx
// Purpose: Placeholder registration screen for block 6.
// Functionality: Renders the page chrome (Header with back button) so the
// route is wired up; the real form (with validation and mutation) is
// implemented in block 7.
// Role: Bound to /register.

import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';

export function RegisterScreen() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <Header title="Crear cuenta" showBack onBack={() => navigate('/login')} />
      <main className="flex-1 px-5 py-6">
        <div className="text-sm text-muted text-center">
          Formulario de registro pendiente — se implementa en el bloque 7.
        </div>
      </main>
    </div>
  );
}
