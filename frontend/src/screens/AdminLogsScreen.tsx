// File: frontend/src/screens/AdminLogsScreen.tsx
// Purpose: Admin panel for the login-audit log.
// Functionality: Lists login events 100 per page, newest first, with prev/
// next pagination. Each row shows the source IP, the user that logged in and
// the timestamp, so an admin can spot one IP used by multiple accounts.
// Role: Bound to /admin/logs behind AdminRoute.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Header } from '../components/Header';
import { TabBar } from '../components/TabBar';
import { Card } from '../components/Card';
import { AdminTabs } from '../components/AdminTabs';
import { useAdminLogins, type LoginEventRow } from '../hooks/useAdmin';
import { formatDateTime } from '../lib/dateFormat';

export function AdminLogsScreen() {
  const navigate = useNavigate();
  // 1-based page index. Pagination is server-side (100 rows per page).
  const [page, setPage] = useState(1);
  const logins = useAdminLogins(page);

  const data = logins.data;
  const events = data?.events ?? [];
  const totalPages = data?.totalPages ?? 1;
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-surface-alt">
      <Header title="Panel Admin" showBack onBack={() => navigate('/mas')} adminBadge />

      <AdminTabs active="logs" />

      <div className="px-4 mb-2 mt-2 shrink-0 flex items-center justify-between">
        <span className="text-[11px] font-bold tracking-wider text-muted">
          {data ? `${data.total} REGISTROS` : 'CARGANDO…'}
        </span>
        <span className="text-[11px] font-bold tracking-wider text-muted">
          PÁGINA {page} / {totalPages}
        </span>
      </div>

      <main className="flex-1 overflow-y-auto overscroll-y-contain px-4 pb-4">
        {logins.isLoading ? (
          <Card>
            <div className="px-4 py-8 text-center text-sm text-muted">Cargando…</div>
          </Card>
        ) : events.length === 0 ? (
          <Card>
            <div className="px-4 py-8 text-center text-sm text-muted">
              No hay registros de inicio de sesión.
            </div>
          </Card>
        ) : (
          <Card>
            {events.map((e, i) => (
              <LogRow key={e.id} event={e} isFirst={i === 0} />
            ))}
          </Card>
        )}
      </main>

      <div className="px-4 py-2 shrink-0">
        <div className="rounded-xl bg-surface px-3 py-2.5 flex items-center justify-between border">
          <button
            type="button"
            onClick={() => canPrev && setPage((p) => p - 1)}
            disabled={!canPrev}
            className="p-1 text-muted disabled:opacity-30"
            aria-label="Página anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="text-sm font-bold text-ink px-2">
            Página {page} de {totalPages}
          </div>
          <button
            type="button"
            onClick={() => canNext && setPage((p) => p + 1)}
            disabled={!canNext}
            className="p-1 text-brand-orange disabled:opacity-30"
            aria-label="Página siguiente"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <TabBar />
    </div>
  );
}

// ---------------------------------------------------------------------------
// One login-event row
// ---------------------------------------------------------------------------

function LogRow({ event, isFirst }: { event: LoginEventRow; isFirst: boolean }) {
  return (
    <div className={`px-3 py-3 ${isFirst ? '' : 'border-t'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-ink truncate">
            {event.user.nombre} {event.user.apellido}
          </div>
          <div className="text-[11px] text-muted truncate">{event.user.email}</div>
          {event.userAgent && (
            <div className="mt-1 text-[10px] text-muted truncate">{event.userAgent}</div>
          )}
        </div>
        <div className="flex flex-col items-end shrink-0">
          <span className="font-mono text-xs font-bold text-brand-navy">{event.ipAddress}</span>
          <span className="text-[10px] text-muted mt-0.5">{formatDateTime(event.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}
