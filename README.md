# Prode Carestino — Mundial 2026

Aplicación de prode (pool de predicciones) para el Mundial de Fútbol 2026.
Dimensionada para ~100 empleados durante el mes que dura el torneo y luego
se apaga.

## Estructura del repo

```
prode-carestino/
├── backend/          API Fastify + Prisma + SQLite (TypeScript estricto)
├── frontend/         SPA React + Vite + Tailwind
├── docs/             Mockup, guías de despliegue, CSVs del fixture
├── nginx/            Config del reverse proxy (Let's Encrypt)
├── Dockerfile        Multi-stage build (backend + frontend en una imagen)
├── docker-compose.yml  Stack productivo (app + nginx + certbot)
└── .env.example      Variables de entorno para producción
```

## Stack

- **Backend**: Node.js 20 LTS, Fastify 4, Prisma 5, SQLite, bcrypt, JWT en
  cookie httpOnly, Zod.
- **Frontend**: React 18, Vite 5, Tailwind CSS, TanStack Query,
  react-hook-form + Zod, lucide-react. Fuente Montserrat.
- **Despliegue**: Docker + Nginx + Let's Encrypt sobre cualquier VPS,
  o bien Railway (ver [docs/DEPLOY-RAILWAY.md](docs/DEPLOY-RAILWAY.md)).

---

## Desarrollo local

Requisitos: Node 20+, npm 10+.

```bash
# 1. Backend (terminal 1)
cd backend
npm install
cp .env.example .env
npx prisma migrate dev          # crea prisma/prode.db
npm run seed                    # carga rondas / grupos / 48 equipos / 104 partidos
npm run dev                     # API en http://localhost:3000

# 2. Frontend (terminal 2)
cd frontend
npm install
npm run dev                     # SPA en http://localhost:5173
```

Vite proxea `/api/*` al backend, así que apuntá el navegador a
`http://localhost:5173`. El admin por defecto es **`admin` /
`SSGG_admin_2410`** (sobre-escribibles en `backend/.env`).

### Comandos útiles

| Comando | Hace |
|---|---|
| `npm run dev` (backend) | API con hot reload (tsx watch) |
| `npm run dev` (frontend) | Vite dev server |
| `npm run seed` (backend) | Carga el fixture real desde `docs/teams.csv` y `docs/matches.csv` |
| `npm run seed:dev` (backend) | Fixture mínimo para tests rápidos (4 equipos, 3 matches) |
| `npm run test` (backend) | Unit tests (Vitest): scoring, lockout, guards, standings |
| `npm run typecheck` (cada paquete) | `tsc --noEmit` |
| `npm run lint` (cada paquete) | ESLint |
| `npx prisma studio` (backend) | UI web para inspeccionar la DB |

### Tests

```bash
cd backend
npm test
# 29 tests pasando: scoring engine, predictions guards, standings ranks
```

---

## Despliegue con Docker Compose (genérico, VPS propio)

Si tenés un servidor con dominio apuntando a su IP y Docker + Docker
Compose instalados, este es el flujo. Ejemplo concreto para AWS
Lightsail más abajo.

### 1. Clonar y configurar

```bash
git clone https://github.com/<tu-usuario>/prode-carestino.git
cd prode-carestino
cp .env.example .env

# Editar .env y reemplazar:
#  - JWT_SECRET           openssl rand -base64 48
#  - ADMIN_PASSWORD       contraseña fuerte
#  - LETSENCRYPT_EMAIL    tu email
nano .env
```

### 2. Bootstrap del certificado HTTPS

Antes de levantar el stack final hay que pedirle a Let's Encrypt el
certificado, pero el nginx final lo necesita pre-existente. La danza
estándar:

```bash
# 2.1 Levantá sólo nginx con la config "bootstrap" (sólo HTTP).
mkdir -p nginx/certbot/conf nginx/certbot/www
cp nginx/nginx.bootstrap.conf nginx/nginx.conf.deploy
# Editá temporalmente docker-compose.yml para que nginx monte
# nginx.bootstrap.conf en lugar de nginx.conf, o lanzá nginx a mano:
docker run --rm -d --name nginx-bootstrap -p 80:80 \
  -v $PWD/nginx/nginx.bootstrap.conf:/etc/nginx/nginx.conf:ro \
  -v $PWD/nginx/certbot/www:/var/www/certbot \
  nginx:1.27-alpine

# 2.2 Pedí el cert (reemplazá el dominio y el mail).
docker compose run --rm certbot certonly \
  --webroot --webroot-path /var/www/certbot \
  --email $(grep LETSENCRYPT_EMAIL .env | cut -d= -f2) \
  --agree-tos --no-eff-email \
  -d prode.carestino.com

# 2.3 Bajá el nginx bootstrap.
docker stop nginx-bootstrap
```

Si Certbot terminó con `Successfully received certificate`, los archivos
quedaron en `nginx/certbot/conf/live/prode.carestino.com/`.

### 3. Levantar el stack completo

```bash
docker compose up -d --build
docker compose logs -f app          # mirá que arrancó bien
```

### 4. Cargar el seed (sólo la primera vez)

```bash
docker compose exec app npm run seed
```

A partir de acá la app responde en `https://prode.carestino.com`.

### 5. Renovación del certificado

Let's Encrypt vence cada 90 días. Una opción simple: cron en el host.

```bash
# /etc/cron.d/prode-cert
0 3 * * * cd /home/ubuntu/prode-carestino && docker compose run --rm certbot renew && docker compose exec nginx nginx -s reload
```

---

## Despliegue en AWS Lightsail

Cuando tenés un VPS recién creado (Ubuntu 22.04 LTS), los pasos paso a
paso son:

1. **Crear la instancia**. Plan más chico alcanza para 100 usuarios:
   1 GB RAM, 2 vCPU. Apuntá el dominio `prode.carestino.com` (A record)
   a la IP pública estática que asignás en Lightsail.

2. **Abrir los puertos** en el firewall de Lightsail: 22 (SSH), 80, 443.

3. **Conectar y preparar el host**:

   ```bash
   ssh ubuntu@<ip>
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y docker.io docker-compose-plugin git
   sudo usermod -aG docker ubuntu
   logout       # entrá de nuevo para que el grupo tome efecto
   ssh ubuntu@<ip>
   ```

4. **Clonar y desplegar** siguiendo la sección anterior ("Despliegue con
   Docker Compose").

5. **(Opcional)** Habilitar el firewall del propio servidor:

   ```bash
   sudo ufw allow ssh
   sudo ufw allow http
   sudo ufw allow https
   sudo ufw enable
   ```

6. **Snapshot inicial** desde la UI de Lightsail una vez que la app
   responda. Esto te deja un punto de restauración por si algo se rompe
   más adelante.

---

## Despliegue en Railway

Está documentado en detalle en [docs/DEPLOY-RAILWAY.md](docs/DEPLOY-RAILWAY.md).

Tl;dr:

1. Conectar el repo a un proyecto Railway nuevo.
2. Railway detecta el `Dockerfile` automáticamente.
3. Crear un volumen persistente montado en `/data`.
4. Setear las variables `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
   `COOKIE_SECURE=true` y `DATABASE_URL=file:/data/prode.db`.
5. Asignar un dominio (Railway puede emitir `*.up.railway.app` o
   asociar uno propio con su propio TLS).
6. Correr el seed con `railway run npm run seed` después del primer deploy.

---

## Backups

La base es un único archivo SQLite, así que el backup es trivial:

```bash
# Manual (en el host)
docker compose exec app sh -c 'sqlite3 /data/prode.db ".backup /data/backup.db"' \
  && docker cp prode-app:/data/backup.db ./prode-backup-$(date +%F).db
```

Y/o más simple, copiar el archivo completo (el contenedor monta el volumen
`prode-data`):

```bash
# Sólo se garantiza consistencia si la app no está escribiendo.
# Para 100 usuarios cargando un puñado de predicciones por día, este
# riesgo es despreciable; aun así, el .backup de arriba es la opción
# segura si querés ser estricto.
sudo cp /var/lib/docker/volumes/prode-carestino_prode-data/_data/prode.db \
       ~/prode-backup-$(date +%F).db
```

Restaurar: copiar el archivo de vuelta sobre el volumen, reiniciar el
contenedor.

---

## Variables de entorno

| Variable | Dónde se usa | Default | Notas |
|---|---|---|---|
| `JWT_SECRET` | backend | (obligatorio) | `openssl rand -base64 48`. Cambiarla invalida sesiones existentes. |
| `DATABASE_URL` | backend | `file:./prode.db` | En Docker queda como `file:/data/prode.db`. |
| `NODE_ENV` | backend | `development` | En producción se setea a `production` desde el Dockerfile. |
| `PORT` | backend | `3000` | Cambiar sólo si nginx upstream también cambia. |
| `COOKIE_SECURE` | backend | `false` | **Debe ser `true` en producción** (Set-Cookie con `Secure`). |
| `ADMIN_EMAIL` | seed | `admin` | Email/handle del admin inicial. |
| `ADMIN_PASSWORD` | seed | `SSGG_admin_2410` | Cambiarlo antes del primer `seed`. |
| `LETSENCRYPT_EMAIL` | certbot | — | Email para alertas de expiración del cert. |

---

## Filosofía y "lo que NO está"

Pensada deliberadamente simple para que sea **fácil de mantener** y
**rápida de desplegar**: una sola imagen Docker, SQLite, sin colas, sin
Redis, sin microservicios. No tiene notificaciones push, ni dark mode,
ni analytics, ni recuperación de password por email. El admin gestiona
todo desde el panel.

Si querés extenderla, los lugares lógicos son:

- Nuevos endpoints: `backend/src/modules/<feature>/{schemas,service,routes}.ts`.
- Nuevas pantallas: `frontend/src/screens/<Pantalla>.tsx` + ruta en `App.tsx`.
- Nuevas tablas: editar `backend/prisma/schema.prisma` y correr
  `npx prisma migrate dev --name <descripcion>`.

Más detalles arquitecturales en
[docs/Guia_Estructura_Proyecto_Prode.pdf](docs/Guia_Estructura_Proyecto_Prode.pdf).
