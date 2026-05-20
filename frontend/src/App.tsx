// File: frontend/src/App.tsx
// Purpose: Top-level React component.
// Functionality: Placeholder splash that confirms the design tokens and
// fonts are wired up correctly. Real routing is added in block 6.
// Role: Replaced once the screens (Login, Torneo, Predicciones, etc.) land.

export default function App() {
  return (
    <div className="min-h-screen bg-surface-alt flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-brand-orange flex items-center justify-center text-white text-2xl font-extrabold">
          P
        </div>
        <h1 className="text-2xl font-extrabold text-ink">Prode Carestino</h1>
        <p className="text-sm text-muted mt-1">Mundial 2026</p>
        <p className="text-xs text-muted mt-6">
          Setup inicial completo. Las pantallas se implementan en los bloques 6–9.
        </p>
      </div>
    </div>
  );
}
