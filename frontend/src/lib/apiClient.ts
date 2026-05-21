// File: frontend/src/lib/apiClient.ts
// Purpose: Thin fetch wrapper used by every data hook in the app.
// Functionality: Sends JSON requests under the `/api` prefix with cookies
// included, parses the backend's `{ error, message, field? }` envelope on
// failures and throws a typed `ApiError` carrying the Spanish message
// ready for display.
// Role: Single I/O boundary for the frontend; component tests can mock
// just this module to simulate backend responses.

// Custom error class so consumers can branch on status / field without
// parsing the message. The `message` is always the user-facing string from
// the backend (in Spanish-Argentina).
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly field?: string;

  constructor(message: string, status: number, code: string, field?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

// Same prefix as the Fastify router. Vite proxies `/api` to the backend
// during development; the production reverse proxy does the same.
const BASE_URL = '/api';

type RequestOpts = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
};

// Performs a JSON request and parses the typed response.
// Inputs: path under `/api`, options. Output: the parsed JSON body, or
// `undefined` for 204 responses.
// Throws: `ApiError` on non-2xx; raw fetch errors propagate as-is.
export async function apiFetch<T = unknown>(
  path: string,
  opts: RequestOpts = {},
): Promise<T> {
  const { method = 'GET', body, signal } = opts;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  // 204 means "success, no body" — common for DELETE.
  if (res.status === 204) return undefined as T;

  // Try to parse JSON even on error responses; fall back to a generic
  // payload if the server returned something unexpected.
  const json = (await res.json().catch(() => ({
    message: 'Error de red',
    error: 'NETWORK',
  }))) as { message?: string; error?: string; field?: string } & Record<string, unknown>;

  if (!res.ok) {
    throw new ApiError(
      json.message ?? 'Error desconocido',
      res.status,
      json.error ?? 'UNKNOWN',
      json.field,
    );
  }
  return json as T;
}
