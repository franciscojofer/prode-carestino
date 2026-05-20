import Fastify from 'fastify';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = '0.0.0.0';
const isDev = process.env.NODE_ENV !== 'production';

async function buildServer() {
  const app = Fastify({
    logger: isDev
      ? {
          transport: {
            target: 'pino-pretty',
            options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
          },
        }
      : true,
  });

  app.get('/health', async () => ({ status: 'ok' }));

  return app;
}

async function main() {
  const app = await buildServer();
  try {
    await app.listen({ port: PORT, host: HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
