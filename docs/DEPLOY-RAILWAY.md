# Despliegue en Railway

Esta guía describe el camino más corto para tener `prode-carestino`
corriendo en [Railway](https://railway.app/) con persistencia en
SQLite. Railway detecta el `Dockerfile` del repo y lo usa
automáticamente — no hace falta cambiar nada de código.

> Plan recomendado: **Developer ($5/mes)** para producción seria, o
> el **plan gratuito Trial** para verificar antes de pagar. Con 100
> usuarios durante 1 mes, el consumo cabe holgadamente.

---

## 1. Preparativos

- Necesitás una cuenta de Railway con un proyecto vacío.
- Hacé `git push` del repo a un GitHub/GitLab que Railway pueda leer
  (la integración pide acceso a la organización al primer deploy).
- Confirmá que el `Dockerfile` y los CSV de `docs/` estén versionados
  (lo están en este repo).

---

## 2. Crear el servicio

1. En el dashboard de Railway: **New Project → Deploy from GitHub repo**
   y elegí el repo `prode-carestino`.
2. Railway crea un servicio y detecta el `Dockerfile` en la raíz. En el
   panel **Settings → Build & Deploy** vas a ver:
   - **Builder**: Dockerfile (auto-detectado)
   - **Root Directory**: `/` (dejá vacío)
   - **Start Command**: vacío (lo provee el CMD del Dockerfile)
3. Apretá **Deploy** una primera vez. El build falla porque faltan
   variables; está bien, lo arreglamos en el próximo paso.

---

## 3. Variables de entorno

En la pestaña **Variables** del servicio, agregá:

| Variable | Valor sugerido |
|---|---|
| `JWT_SECRET` | `openssl rand -base64 48` (corrélo en tu terminal y pegalo) |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `COOKIE_SECURE` | `true` |
| `DATABASE_URL` | `file:/data/prode.db` |
| `ADMIN_EMAIL` | `admin` (o el handle que quieras) |
| `ADMIN_PASSWORD` | (algo robusto que **vas a cambiar** después del primer login) |

Importante: `DATABASE_URL` apunta a `/data/prode.db` — coincide con el
volumen que montamos en el próximo paso.

Guardá y volvé a deployar.

---

## 4. Volumen persistente (SQLite)

Sin un volumen, la base se borra en cada redeploy. Railway lo resuelve
con su feature **Volumes**.

1. **Settings → Volumes → Create Volume**.
2. **Mount Path**: `/data`
3. **Size**: 1 GB alcanza y sobra para 100 usuarios + un mes.

El siguiente redeploy ya escribe `prode.db` en el volumen y sobrevive
a futuros builds.

---

## 5. Migraciones y seed

El `CMD` del Dockerfile ejecuta `npx prisma migrate deploy` antes de
arrancar la app, así que las migraciones se aplican solas en el primer
deploy. Lo que sí hay que correr una vez es el seed con el fixture
real.

Opción A — desde tu máquina, con la Railway CLI:

```bash
# Una sola vez:
npm i -g @railway/cli
railway login
railway link        # elegí el proyecto/servicio

# Cada vez que necesites correr algo dentro del entorno productivo:
railway run npm run seed --service prode-carestino
```

Opción B — desde el dashboard: **Service → Settings → … → Run command**
y pegá `npx prisma migrate deploy && npm run seed`.

Verificá los logs (**Deployments → Logs**); deberías ver:

```
Seed completo.
  Admin: admin
  Rondas: 9
  Equipos: 48
  Partidos creados: 104
```

---

## 6. Dominio

Por defecto Railway genera algo como `prode-carestino-production.up.railway.app`,
con HTTPS administrado por ellos.

Para usar un dominio propio (`prode.carestino.com`):

1. **Settings → Networking → Custom Domain → Add Domain**.
2. Copiá el CNAME que Railway te da y configuralo en tu DNS.
3. Esperá ~5 minutos a que la propagación se complete. Railway emite el
   certificado automáticamente; no hace falta certbot ni nada manual.

Una vez activo, el endpoint `/health` devuelve `{"status":"ok"}`.

---

## 7. Backups

La forma más simple es exportar el archivo periódicamente con la CLI:

```bash
# Copia el SQLite del volumen a tu máquina.
railway run --service prode-carestino \
  sh -c 'cat /data/prode.db' > prode-backup-$(date +%F).db
```

Y/o usar `sqlite3 .backup` para un volcado consistente bajo carga:

```bash
railway run --service prode-carestino \
  sh -c 'sqlite3 /data/prode.db ".backup /tmp/backup.db" && cat /tmp/backup.db' \
  > prode-backup-$(date +%F).db
```

Para automatizar, programá un GitHub Action diario que corra el comando
anterior y suba el archivo a S3 / Drive.

---

## 8. Troubleshooting

- **"Error: P1003: Database not found"**: el volumen no está montado
  donde el `DATABASE_URL` apunta. Verificá que el mount sea exactamente
  `/data` y `DATABASE_URL=file:/data/prode.db`.
- **Login devuelve 401 pese a las credenciales correctas**: chequeá que
  `JWT_SECRET` esté definida y tenga al menos 16 caracteres. Sin esa
  variable el contenedor termina con código 1 al arrancar.
- **El frontend carga pero `/api/auth/me` da 401 desde el navegador**:
  asegurate de que `COOKIE_SECURE=true` y que el dominio responde por
  HTTPS (las cookies `Secure` no viajan sobre HTTP).
- **Quiero resetear todo**: borrá el volumen desde la UI y redesployá.
  El siguiente arranque crea un `prode.db` nuevo y `prisma migrate deploy`
  vuelve a aplicar todas las migraciones; el seed lo corrés a mano.

---

## 9. Costos estimados

Para esta app (1 contenedor + 1 GB de volumen, tráfico bajo):

- **Trial ($5 de crédito)**: alcanza para correr el mes que dura el
  torneo. Cuando se consume el crédito, el servicio entra en pausa
  hasta el próximo período.
- **Developer ($5/mes)**: cubre 8 GB de RAM·hora y 100 GB de tráfico, lo
  cual sobra ampliamente. Es la opción recomendada si vas a depender
  del servicio durante todo el mes.

Si después del Mundial la app deja de usarse, **suspende el servicio**
desde la UI de Railway en lugar de borrarlo, así conservás el volumen
para el siguiente Mundial 😀.
