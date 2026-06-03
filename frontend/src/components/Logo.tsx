// File: frontend/src/components/Logo.tsx
// Purpose: Brand logo (Carestino "C") used across the app.
// Functionality: Renders the white "C" isotype PNG at a configurable square
// size, so the same component fits the small header variant and the bigger
// login splash.
// Role: Imported by `Header` and `LoginScreen`.

type Props = { size?: number };

export function Logo({ size = 37 }: Props) {
  return (
    <img
      src="/logo-c.png"
      alt="Carestino"
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: 'contain' }}
    />
  );
}
