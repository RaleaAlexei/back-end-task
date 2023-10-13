import 'dotenv/config';
import express from 'express';
import { initSequelizeClient } from '~/lib/sequelize';
import { initErrorRequestHandler, initNotFoundRequestHandler } from '~/middleware';
import initV1Router from '~/routers/api/v1';
const PORT = process.env.PORT || 3000;

async function main(): Promise<void> {
  const app = express();
  const sequelizeClient = await initSequelizeClient({
    dialect: 'postgres',
    host: process.env.POSTGRESS_HOST,
    port: parseInt(process.env.POSTGRESS_PORT ?? ''),
    username: process.env.POSTGRESS_USERNAME,
    password: process.env.POSTGRESS_PASSWORD,
    database: process.env.POSTGRESS_DATABASE_NAME,
  });

  app.use(express.json());
  app.use('/', initV1Router(sequelizeClient));
  app.use('/', initNotFoundRequestHandler());

  app.use(initErrorRequestHandler());

  return new Promise((resolve) => {
    app.listen(PORT, () => {
      console.info(`app listening on port: '${PORT}'`);

      resolve();
    });
  });
}

main().then(() => console.info('app started')).catch(console.error);