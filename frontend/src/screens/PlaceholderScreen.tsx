// File: frontend/src/screens/PlaceholderScreen.tsx
// Purpose: Stub screen used by the routes that haven't been implemented yet.
// Functionality: Renders the standard layout with a centred "Próximamente"
// message so the navigation skeleton can be exercised end-to-end before
// the real screens land in blocks 7-9.
// Role: Temporary; every concrete screen replaces this when its block ships.

import { Layout } from '../components/Layout';

type Props = { title: string; block: string };

export function PlaceholderScreen({ title, block }: Props) {
  return (
    <Layout title={title}>
      <div className="p-6">
        <div className="rounded-2xl bg-surface border p-6 text-center">
          <div className="text-sm font-bold text-brand-navy">{title}</div>
          <div className="mt-2 text-xs text-muted">
            Pantalla pendiente — se implementa en el bloque {block}.
          </div>
        </div>
      </div>
    </Layout>
  );
}
