import 'dotenv/config';
import 'reflect-metadata';
import {ApplicationConfig, BackAbdoApplication} from './application';

export * from './application';

export async function main(options: ApplicationConfig = {}) {
  const app = new BackAbdoApplication(options);
  await app.boot();
  await app.start();

  const url = app.restServer.url;
  console.log(`
🚀 ¡Servidor iniciado con éxito! 🚀
✨ URL: ${url}
💫 ¡Listo para recibir peticiones! 💫
  `);

  return app;
}

if (require.main === module) {
  // Run the application
  const config = {
    rest: {
      port: +(process.env.PORT ?? 3000),
      host: process.env.HOST ?? '127.0.0.1',
      gracePeriodForClose: 5000, // 5 seconds
      openApiSpec: {
        setServersFromRequest: true,
      },
    },
  };
  main(config).catch(err => {
    console.error('Cannot start the application.', err);
    process.exit(1);
  });
}
