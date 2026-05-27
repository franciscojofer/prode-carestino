# Despliegue en AWS

Esta guía cubre el camino recomendado para correr `prode-carestino` en
AWS, **con justificación de cada servicio elegido y las alternativas
descartadas**. Una versión resumida ya vive en el [README](../README.md);
este documento es la versión larga, pensada para entender el porqué.

> **TL;DR.** Se recomienda **AWS Lightsail Instance ($5/mes)** con la
> SQLite en el disco local y nginx + Let's Encrypt dentro del mismo
> docker-compose. Hace falta una segunda pieza: **snapshots automáticos
> de Lightsail ($0.05/GB·mes)** para tener backups. Total: ~$5-6/mes
> durante el mes de uso intenso, $1-2/mes en standby.

---

## 1. Restricciones del proyecto

Antes de elegir servicios, conviene anclar las restricciones reales —
muchas decisiones de AWS se vuelven evidentes cuando uno las pone en
papel.

| Restricción | Valor / consecuencia |
|---|---|
| Usuarios concurrentes | ~100 empleados, picos los días de partido |
| Duración del uso intenso | Un mes (11/06/2026 → 19/07/2026) |
| Resto del año | Idle o apagado |
| Persistencia | SQLite en archivo (`/data/prode.db`) — necesita disco que sobreviva al rebuild del container |
| Build | Imagen única (Dockerfile multi-stage) que sirve API + SPA |
| TLS | Obligatorio (cookies `Secure`) |
| Dominio | Propio (`prode.carestino.com`) |
| Region preferida | `sa-east-1` (São Paulo) — latencia mínima desde Argentina |
| Presupuesto | Lo más bajo posible sin sacrificar confiabilidad razonable |

Lo importante: **no es una app de alto tráfico, no necesita autoscaling,
no necesita alta disponibilidad multi-AZ**. Sobre-dimensionar AWS para
esto es un error frecuente y caro.

---

## 2. Servicios AWS evaluados

### Compute (dónde corre el container)

| Opción | Pros | Contras | Veredicto |
|---|---|---|---|
| **Lightsail Instance** | Precio fijo predecible, IP estática y bandwidth incluidos, snapshots integrados, UX simple | Menos integrado con servicios "core" AWS (IAM granular, VPC peering) | ✅ **Elegido** |
| **EC2 t4g.small** | Más control, mejor pricing si tomás Reserved/Savings Plan | Sumar EBS, Elastic IP, data transfer y backups da más caro que Lightsail para este tamaño | ❌ Descartado |
| **ECS Fargate** | Serverless, no gestionás host | Mínimo ~$13/mes solo por la task corriendo + ALB obligatorio ($16/mes) | ❌ Caro y complejo de más |
| **App Runner** | PaaS estilo Heroku, deploy desde repo | ~$15-25/mes mínimo, sin volumen persistente real (necesita RDS o EFS aparte) | ❌ No soporta el patrón SQLite-en-disco |
| **Elastic Beanstalk** | PaaS clásico para apps Docker | Mucha ceremonia para tan poco; EB está en mantenimiento histórico | ❌ Descartado |
| **EKS** | Kubernetes managed | Overkill brutal, ~$73/mes solo el control plane | ❌ Ni considerado |
| **Lambda + API Gateway** | Pay-per-request, cero idle cost | Fastify no encaja naturalmente, SQLite imposible (filesystem efímero), latencia de cold start | ❌ Arquitectura incompatible |

**Por qué Lightsail gana**: la app es un **container monolítico con
estado en disco**. Lightsail Instance es literalmente eso —
una VPS con Docker — pero con la facturación predecible de un servicio
managed, snapshots integrados y bandwidth ya incluido (2 TB/mes en el
plan de $5, sobra para 100 usuarios). EC2 ofrece más flexibilidad que
acá no se aprovecha.

### Storage para la SQLite

| Opción | Pros | Contras | Veredicto |
|---|---|---|---|
| **Disco local de Lightsail** | Incluido en el precio de la instancia, baja latencia | Vive con la instancia (si la borrás, perdés datos sin snapshot) | ✅ **Elegido** |
| **Lightsail Block Storage** | Disco adicional adjuntable, sobrevive a la instancia | Para 1 GB es overhead innecesario; el disco de la instancia ya alcanza | ❌ No suma |
| **EBS** (si fuera EC2) | Snapshots, encrypt at rest, redimensionable | No aplica con Lightsail | — |
| **EFS** | NFS compartido entre instancias | SQLite y NFS no son amigos (locking poco confiable, latencia alta) | ❌ Mala fit |
| **RDS (Postgres / MySQL)** | DB managed real, backups y patching automáticos | Costo mínimo ~$15/mes; reescribir Prisma de SQLite a Postgres es un cambio innecesario para 100 users | ❌ Sobredimensionado |
| **DynamoDB** | Pay-per-request, escala infinita | Reescritura completa de la capa de datos | ❌ Cambio injustificado |

**Por qué disco local + snapshots**: SQLite está diseñada para vivir
en un archivo local. Sumar EFS o RDS es resolver un problema que no
existe. La única preocupación legítima — "si la instancia desaparece
pierdo todo" — se resuelve con snapshots diarios de Lightsail (ver §5).

### TLS y reverse proxy

| Opción | Pros | Contras | Veredicto |
|---|---|---|---|
| **Nginx + Certbot en el mismo container stack** | Lo que ya está armado en `docker-compose.yml`, cero costo extra | Hay que renovar el cert (cron) | ✅ **Elegido** |
| **Application Load Balancer + ACM** | TLS managed, certificado renovado solo | $16/mes mínimo solo por el ALB | ❌ Triplica el costo total |
| **Lightsail Load Balancer** | Más simple que ALB | $18/mes; el caso de uso no justifica un LB | ❌ Caro |
| **CloudFront** | CDN global, cache de assets estáticos | El frontend ya se sirve desde el mismo Fastify y son pocos KB; CloudFront solo suma costos y complejidad de cache invalidation | ❌ No aporta para 100 users |

**Por qué nginx + Let's Encrypt**: el stack ya lo trae armado y
funciona desde el día 1. ACM/ALB tienen sentido cuando hay >1 instancia
detrás, salud-checks complejos, o sticky sessions; nada de eso aplica.

### DNS

| Opción | Pros | Contras | Veredicto |
|---|---|---|---|
| **Route 53** | Hosted zone $0.50/mes + queries baratas, integración con ACM | Pago mínimo aunque sea poco | ✅ **Elegido si querés todo en AWS** |
| **DNS de Carestino** | Cero costo extra, si ya tienen registrar/DNS provider externo | Hay que coordinar con quien administre `carestino.com` | ✅ También válido |

**Recomendación**: si `carestino.com` ya está en otro registrar (GoDaddy,
Cloudflare, Nic.ar), creá ahí un registro **A** que apunte
`prode.carestino.com` a la IP estática de Lightsail. No hace falta
mover el dominio a Route 53. Si querés todo concentrado en AWS,
Route 53 es la opción natural.

### Secrets / configuración

| Opción | Pros | Contras | Veredicto |
|---|---|---|---|
| **Archivo `.env` en la instancia** | Cero costo, simple | Si alguien accede al host ve las credenciales en claro | ✅ **Elegido** (riesgo bajo, una sola instancia) |
| **SSM Parameter Store** | Gratis (tier estándar), versionado | Requiere IAM role, más piezas | ⚠️ Mejor si crece el equipo |
| **Secrets Manager** | Rotación automática | $0.40/secret/mes + $0.05 por 10k API calls | ❌ Innecesario para 3 secrets |

### Monitoring / logs

| Opción | Pros | Contras | Veredicto |
|---|---|---|---|
| **`docker compose logs`** | Suficiente para ~100 usuarios | Sin retención automática, hay que conectarse | ✅ **Elegido al inicio** |
| **CloudWatch Logs** | Centralizado, búsqueda | ~$0.50/GB ingest + $0.03/GB stored | ⚠️ Sumar si surge la necesidad |
| **CloudWatch Alarms** | Avisos por CPU/disk | Gratis hasta 10 alarmas | ✅ **Recomendado un alarm en CPU >80% por 10 min** |

---

## 3. Arquitectura final recomendada

```
                Internet
                   │
                   ▼
        ┌──────────────────────────────┐
        │  Lightsail Instance ($5/mo)  │
        │  Ubuntu 22.04 + Docker       │
        │                              │
        │  ┌────────────────────────┐  │
        │  │ docker-compose         │  │
        │  │  ├─ nginx (80, 443)    │  │
        │  │  ├─ app (Fastify+SPA)  │  │
        │  │  └─ certbot (cron)     │  │
        │  └────────────────────────┘  │
        │                              │
        │  /data/prode.db (SQLite)     │
        └──────────────────────────────┘
                   │
                   ▼
        ┌──────────────────────────────┐
        │  Lightsail Snapshots         │
        │  (diarios, retention 7 días) │
        └──────────────────────────────┘
```

- **1 instancia Lightsail** en `sa-east-1` (São Paulo).
- **IP pública estática** asignada por Lightsail (gratis mientras esté
  vinculada a la instancia).
- **Snapshot automático diario** a las 03:00 ART, retention 7 días.
- **Dominio**: `prode.carestino.com` → A record a la IP estática.

---

## 4. Paso a paso del despliegue

> Asume que ya tenés cuenta AWS y AWS CLI configurada (opcional pero
> útil). Todo se puede hacer 100% desde la UI de Lightsail.

### 4.1 Crear la instancia

1. Lightsail console → **Create instance**.
2. **Region**: `São Paulo (sa-east-1)`.
3. **Platform**: Linux/Unix → **OS Only** → **Ubuntu 22.04 LTS**.
4. **Plan**: **$5/mes** (1 GB RAM, 2 vCPU, 40 GB SSD, 2 TB transfer).
5. **Instance name**: `prode-carestino`.
6. **Create instance**.

### 4.2 Asignar IP estática

1. Lightsail → tab **Networking** → **Create static IP**.
2. Adjuntala a `prode-carestino`. Costo: $0 mientras esté vinculada.

### 4.3 Abrir puertos en el firewall

Lightsail → instancia → tab **Networking** → **IPv4 Firewall**:

| Aplicación | Protocolo | Puerto |
|---|---|---|
| SSH | TCP | 22 |
| HTTP | TCP | 80 |
| HTTPS | TCP | 443 |

### 4.4 Apuntar el dominio

En el DNS de `carestino.com`:

| Tipo | Nombre | Valor |
|---|---|---|
| A | `prode` | `<IP estática de Lightsail>` |
| TTL | 300 (durante setup, después subí a 3600) | |

Esperá 5-10 minutos a que propague (`dig prode.carestino.com`).

### 4.5 Preparar el host

```bash
ssh ubuntu@<ip>

sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-plugin git
sudo usermod -aG docker ubuntu
exit
ssh ubuntu@<ip>      # reentrar para que el grupo tome efecto
```

### 4.6 Clonar y configurar `.env`

```bash
git clone https://github.com/<tu-org>/prode-carestino.git
cd prode-carestino
cp .env.example .env

# Generar y pegar:
openssl rand -base64 48        # → JWT_SECRET
# Definir ADMIN_PASSWORD (fuerte, cambiable después)
# Confirmar LETSENCRYPT_EMAIL
nano .env
```

### 4.7 Bootstrap del certificado HTTPS

Seguí el [bloque del README](../README.md#2-bootstrap-del-certificado-https):
levantar nginx en modo bootstrap → pedir cert → bajarlo → levantar el
stack final.

### 4.8 Levantar el stack y cargar el seed

```bash
docker compose up -d --build
docker compose exec app npm run seed
```

La app debería responder en `https://prode.carestino.com`.

### 4.9 Snapshot automático

Lightsail → instancia → tab **Snapshots** → **Enable automatic snapshots**.

- Hora: **06:00 UTC** (=03:00 ART).
- Retention: **7 días**.

Costo: $0.05/GB·mes × ~5 GB efectivos = ~$0.25/mes.

### 4.10 Renovación del certificado

Cron en el host:

```bash
sudo tee /etc/cron.d/prode-cert <<'EOF'
0 3 * * * ubuntu cd /home/ubuntu/prode-carestino && docker compose run --rm certbot renew && docker compose exec nginx nginx -s reload
EOF
```

### 4.11 (Opcional) Alarma de CPU

CloudWatch → Alarms → Create alarm → métrica `AWS/Lightsail · CPUUtilization`
del Resource `prode-carestino`. Umbral: >80% por 10 minutos → notificar
SNS topic con tu email.

---

## 5. Backups y restore

### Estrategia

1. **Snapshots automáticos diarios** (paso 4.9) → cobertura para
   "se rompió la instancia".
2. **Backup adicional del archivo SQLite a S3** (opcional pero recomendado
   en pleno torneo) → cobertura para "se corrompió la DB sin que nadie
   se diera cuenta".

Para el #2:

```bash
# En el host, una vez:
aws configure                          # access key con permisos S3 write
aws s3 mb s3://prode-carestino-backups --region sa-east-1

# Cron diario:
sudo tee /etc/cron.d/prode-db-backup <<'EOF'
30 3 * * * ubuntu docker compose -f /home/ubuntu/prode-carestino/docker-compose.yml exec -T app sqlite3 /data/prode.db ".backup /tmp/backup.db" && docker compose -f /home/ubuntu/prode-carestino/docker-compose.yml exec -T app cat /tmp/backup.db | aws s3 cp - s3://prode-carestino-backups/$(date +\%F).db
EOF
```

S3 Standard en `sa-east-1`: ~$0.023/GB·mes. La DB pesa <50 MB → costo
despreciable. Activá una **Lifecycle Rule** que mueva a S3 Glacier
Deep Archive después de 30 días.

### Restore

Snapshots: Lightsail → Snapshots → **Create new instance from snapshot**.
Te crea una instancia nueva idéntica. Reapuntá la IP estática.

S3: descargá el `.db` deseado y reemplazá `/data/prode.db` dentro del
volumen.

---

## 6. Costos estimados

### Mes intenso (junio-julio 2026)

| Concepto | Costo |
|---|---|
| Lightsail Instance $5/mes | $5.00 |
| Snapshots automáticos (~5 GB × 7) | $0.25 |
| S3 backups DB (opcional, <1 GB) | $0.02 |
| Data transfer (incluido en plan) | $0.00 |
| Route 53 hosted zone (si lo usás) | $0.50 |
| **Total mes intenso** | **~$5.75 (sin Route 53) / $6.25** |

### Resto del año (instancia apagada)

Lightsail factura igual aunque la instancia esté detenida (el disco
sigue ocupando espacio). Alternativas:

| Estrategia | Costo |
|---|---|
| Dejar la instancia detenida | $5/mes (cargo completo) |
| **Borrar la instancia + conservar el snapshot** | ~$0.25/mes |
| Snapshot + borrar instancia + restaurar antes del Mundial 2030 | ~$0.25/mes |

**Recomendado**: apenas termine el Mundial, hacé un snapshot final
manual, exportá los datos de interés (CSV de ganadores, leaderboard
final) y borrá la instancia. Pagás solo el snapshot durante 4 años hasta
el próximo Mundial.

### Comparación con alternativas

| Stack | Costo/mes uso intenso | Esfuerzo de setup |
|---|---|---|
| **Lightsail (recomendado)** | $5-6 | Bajo (1-2 hs) |
| EC2 t4g.small + EBS + Elastic IP | $12-15 | Medio (3-4 hs) |
| ECS Fargate + EFS + ALB | $35-45 | Alto (1-2 días, sin contar aprender Fargate) |
| App Runner + RDS db.t4g.micro | $35-50 | Medio (refactor de Prisma a Postgres) |
| Railway Developer | $5 | Muy bajo (15 min, ya documentado) |

Si después de ver esto preferís Railway porque ya está andando, es
una decisión válida — el ahorro de tiempo justifica los pocos dólares
de diferencia. AWS gana cuando hay políticas corporativas que exigen
mantener todo dentro de AWS, o cuando se planea reutilizar la cuenta
para otros proyectos.

---

## 7. Cuándo migrar a una arquitectura más AWS-native

Las decisiones de arriba están pensadas para **100 usuarios y un mes
de uso intenso**. Si el caso de uso crece — por ejemplo, una versión
permanente que sume torneos locales, copa libertadores, etc. — habría
que reconsiderar:

| Trigger | Migración recomendada |
|---|---|
| >500 usuarios concurrentes | Migrar SQLite → **RDS Postgres db.t4g.micro** ($13/mes) |
| Necesidad de zero-downtime deploys | Pasar a **ECS Fargate + ALB**, 2 tasks |
| Múltiples ambientes (staging) | Separar cuentas AWS + Organizations |
| Caching pesado del frontend | Sumar **CloudFront** delante del ALB |
| Sesiones distribuidas | JWT in-cookie ya escala (no requiere sticky sessions) — no hace falta cambiar |

Mientras tanto, sobre-diseñar es un costo neto.

---

## 8. Riesgos conocidos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| La instancia muere durante el partido | Snapshot diario + DNS bajo (TTL 300) durante el torneo permiten levantar otra en <15 min |
| Disco lleno (logs) | `docker compose logs` con `--max-size=10m` y `--max-file=3` en el compose |
| Cert vencido sin que nadie note | Cron de renovación (4.10) + alarma CloudWatch sobre el endpoint `/health` con `https` |
| Bug en el seed que corrompe la DB | Backup S3 diario (sección 5) — siempre se puede volver 24 hs |
| Vulnerabilidad zero-day en Fastify/Prisma | `npm audit` + actualización trimestral cuando la app está idle |

---

## 9. Checklist final

Antes de declarar el deploy "production-ready":

- [ ] HTTPS funcionando con cert de Let's Encrypt válido
- [ ] `/health` devuelve `{"status":"ok"}` desde el dominio público
- [ ] Login con admin funciona, el dashboard carga
- [ ] Snapshots automáticos activos
- [ ] Cron de renovación de cert instalado
- [ ] (Opcional) Backup diario a S3
- [ ] (Opcional) Alarma CloudWatch de CPU
- [ ] Documentado: IP estática, dominio, dónde están los snapshots
- [ ] Password admin cambiada del default
