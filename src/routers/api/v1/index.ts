import { Router } from 'express';
import type { SequelizeClient } from '~/lib/sequelize';
import { initUsersRouter } from './users';
import { initPostsRouter } from './posts';
const apiPath = '/api/v1/';
export default function initV1Router(sequelizeClient: SequelizeClient): Router{
	const router = Router({ mergeParams: true });
	router.use(apiPath + 'users', initUsersRouter(sequelizeClient));
	router.use(apiPath + 'posts', initPostsRouter(sequelizeClient));
	return router;
}