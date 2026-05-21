// File: frontend/src/components/Card.tsx
// Purpose: White rounded container with subtle border used across screens.
// Functionality: A minimal styled `<div>` that matches the mockup card
// look: `rounded-2xl`, `bg-surface`, the default border colour and
// `overflow-hidden` so child rows respect the rounded corners.
// Role: Used for leaderboard tables, match cards, group standings and
// the user/admin row sections.

import type { HTMLAttributes } from 'react';

export function Card({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl bg-surface border overflow-hidden ${className}`}
      {...rest}
    />
  );
}
