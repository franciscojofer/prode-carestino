// File: backend/src/plugins/cookies.ts
// Purpose: Register cookie parsing for the Fastify app.
// Functionality: Thin wrapper around `@fastify/cookie` so the auth plugin can
// rely on `req.cookies` and `reply.setCookie()` being available.
// Role: Loaded before the auth plugin in `src/index.ts`.

import fp from 'fastify-plugin';
import cookie from '@fastify/cookie';

export default fp(async function cookiesPlugin(app) {
  await app.register(cookie);
});
