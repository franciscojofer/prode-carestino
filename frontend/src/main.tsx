// File: frontend/src/main.tsx
// Purpose: React entry point.
// Functionality: Wraps the app with TanStack Query, React Router and a
// strict-mode guard, then mounts it into `#root`.
// Role: First module loaded by Vite; gathers all top-level providers so the
// rest of the app can assume they are available.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

// Shared QueryClient. Defaults are tuned for this app:
//  - refetchOnWindowFocus disabled because a one-month tournament does not
//    need that kind of background activity.
//  - retry once on failure so transient network blips don't break the UI.
//  - 30 s staleTime to coalesce repeated calls from neighbouring components.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('No se encontró el elemento #root');

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
