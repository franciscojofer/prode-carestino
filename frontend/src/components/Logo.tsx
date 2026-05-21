// File: frontend/src/components/Logo.tsx
// Purpose: Brand circular logo used across the app.
// Functionality: Renders an orange filled circle with a centred white "C"
// (Carestino). Size is configurable so the same component fits the small
// header variant (32px) and the bigger login splash (56px).
// Role: Imported by `Header` and `LoginScreen`.

type Props = { size?: number };

export function Logo({ size = 28 }: Props) {
  return (
    <div
      className="flex items-center justify-center rounded-full bg-brand-orange font-extrabold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.55,
        letterSpacing: '-0.02em',
      }}
      aria-hidden
    >
      C
    </div>
  );
}
