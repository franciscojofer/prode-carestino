# Prode Carestino — Mundial 2026

Aplicación de prode (pool de predicciones) para el Mundial de Fútbol 2026.
Pensada para ~100 empleados durante el mes que dura el torneo.

## Estructura

- [backend/](backend/) — API Fastify + Prisma + SQLite
- [frontend/](frontend/) — SPA React + Vite + Tailwind
- [docs/](docs/) — Mockup visual y documentación

## Documentación

Las instrucciones detalladas de instalación, despliegue y backup se completan
en el bloque 10 de implementación. Por ahora, los pasos básicos:

```bash
# Backend
cd backend
npm install
cp .env.example .env
npx prisma migrate dev
npm run seed
npm run dev

# Frontend (en otra terminal)
cd frontend
npm install
npm run dev
```

- API: http://localhost:3000
- Frontend dev: http://localhost:5173
