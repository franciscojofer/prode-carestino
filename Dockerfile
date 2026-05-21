# File: Dockerfile
# Purpose: Multi-stage build that produces a single image serving both the
# Fastify backend and the compiled React frontend.
# Functionality:
#   1. `frontend-build` compiles the React app with Vite into /frontend/dist.
#   2. `backend-deps` installs the backend dependencies and runs `prisma
#      generate` so the generated client is part of the image.
#   3. `runtime` is the slim final image that copies the backend code, the
#      compiled frontend, and the CSV fixture files, then starts tsx after
#      applying pending Prisma migrations.
# Role: Used by docker-compose, by Railway (via the Dockerfile builder)
# and by any "docker run" deployment.

# ---------------------------------------------------------------------------
# Stage 1: frontend bundle
# ---------------------------------------------------------------------------
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY frontend/ ./
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2: backend dependencies (with generated Prisma client)
# ---------------------------------------------------------------------------
FROM node:20-alpine AS backend-deps

WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --no-audit --no-fund

# Generating the Prisma client at build time keeps cold-starts fast and
# lets us copy the resulting `node_modules/.prisma` into the slim final
# image without re-running `prisma generate` at runtime.
COPY backend/prisma ./prisma
RUN npx prisma generate

COPY backend/ ./

# ---------------------------------------------------------------------------
# Stage 3: runtime image
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runtime

# OpenSSL is required by the Prisma engines bundled with the client.
RUN apk add --no-cache openssl

WORKDIR /app

# Backend code + dependencies (including the generated client).
COPY --from=backend-deps /app/backend ./backend

# Compiled frontend served by Fastify in production.
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# CSV fixture used by the seed script (referenced via `../docs` from
# inside backend/). Optional at runtime if the seed has already been run.
COPY docs/ ./docs/

# Persistent data directory. Mount a volume here in production so the
# SQLite database survives container restarts and image rebuilds.
RUN mkdir -p /data && chown -R node:node /data /app
USER node

WORKDIR /app/backend
ENV NODE_ENV=production
EXPOSE 3000

# Apply pending migrations, then start the server. `prisma migrate deploy`
# is idempotent — it only runs migrations that haven't been applied yet.
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
