import { Router, RequestHandler } from 'express';
import { Op } from 'sequelize';

import type { SequelizeClient } from '~/lib/sequelize';
import type { User } from '~/repositories/types';

import { BadRequestError, UnauthorizedError } from '~/errors';
import { hashPassword, generateToken, checkPassword, sanitizeUsername, sanitizeEmail, sanitizePassword } from '~/lib/security';
import { initTokenValidationRequestHandler, initAdminValidationRequestHandler, RequestAuth } from '~/middleware/security';
import { UserType } from '~/constants';

export function initUsersRouter(sequelizeClient: SequelizeClient): Router {
  const router = Router({ mergeParams: true });

  const tokenValidation = initTokenValidationRequestHandler(sequelizeClient);
  const adminValidation = initAdminValidationRequestHandler();
  router.route('/')
    .get(tokenValidation, initListUsersRequestHandler(sequelizeClient))
    .post(tokenValidation, adminValidation, initCreateUserRequestHandler(sequelizeClient));

  router.route('/login')
    .post(initLoginUserRequestHandler(sequelizeClient));
  router.route('/register')
    .post(initRegisterUserRequestHandler(sequelizeClient));
  return router;
}
function initListUsersRequestHandler(sequelizeClient: SequelizeClient): RequestHandler {
  return function listUsersRequestHandler(req, res, next): void {
    const { models } = sequelizeClient;
    const { auth: { user: { type: userType } } } = req as unknown as { auth: RequestAuth };

    const isAdmin = userType === UserType.ADMIN;

    models.users.findAll({
      attributes: isAdmin ? ['id', 'name', 'email'] : ['name', 'email'],
      ...!isAdmin && { where: { type: { [Op.ne]: UserType.ADMIN } } },
      raw: true,
    })
      .then((users) => {
        res.send(users);
      })
      .catch(next);
  };
}

function initCreateUserRequestHandler(sequelizeClient: SequelizeClient): RequestHandler {
  return function createUserRequestHandler(req, res, next): void {
    const { type, name, email, password } = req.body as CreateUserData;
    if (!sanitizeUsername(name)) {
      throw new BadRequestError('BAD_USERNAME');
    }
    if (!sanitizeEmail(email)) {
      throw new BadRequestError('BAD_EMAIL');
    }
    if (!sanitizePassword(password))
      throw new BadRequestError('BAD_PASSWORD');
    createUser({ type, name, email, password }, sequelizeClient)
      .then(() => {
        res.status(204).send();
      })
      .catch(next);
  };
}

function initLoginUserRequestHandler(sequelizeClient: SequelizeClient): RequestHandler {
  return function loginUserRequestHandler(req, res, next): void {
    const { models } = sequelizeClient;
    // NOTE(roman): missing validation and cleaning
    const { email, password } = req.body as { name: string; email: string; password: string };
    if (!sanitizeEmail(email)) {
      throw new BadRequestError('BAD_EMAIL');
    }
    if (!sanitizePassword(password))
      throw new BadRequestError('BAD_PASSWORD');
    models.users.findOne({
      attributes: ['id', 'passwordHash'],
      where: { email },
      raw: true,
    })
      .then(async (user: Pick<User, 'id' | 'passwordHash'> | null) => {
        if (user === null) {
          throw new UnauthorizedError('EMAIL_OR_PASSWORD_INCORRECT');
        }
        const isPasswordCorrect = await checkPassword(password, user.passwordHash);
        if (!isPasswordCorrect) {
          throw new UnauthorizedError('EMAIL_OR_PASSWORD_INCORRECT');
        }
        const token = generateToken({ id: user.id });
        res.status(200).send({ token });
      })
      .catch(next);
  };
}
function initRegisterUserRequestHandler(sequelizeClient: SequelizeClient): RequestHandler {
  return function createUserRequestHandler(req, res, next): void {
    const { name, email, password } = req.body as Omit<CreateUserData, 'type'>;
    if (!sanitizeUsername(name)) {
      throw new BadRequestError('BAD_USERNAME');
    }
    if (!sanitizeEmail(email)) {
      throw new BadRequestError('BAD_EMAIL');
    }
    if (!sanitizePassword(password))
      throw new BadRequestError('BAD_PASSWORD');
    createUser({ type: UserType.BLOGGER, name, email, password }, sequelizeClient)
      .then(() => {
        res.status(204).end();
      })
      .catch(next);
  };
}
function createUser(data: CreateUserData, sequelizeClient: SequelizeClient): Promise<void> {
  return new Promise((resolve, reject) => {
    const { type, name, email, password } = data;
    const { models } = sequelizeClient;
    models.users.findOne({
      attributes: ['id', 'name', 'email'],
      where: {
        [Op.or]: [
          { name },
          { email },
        ],
      },
      raw: true,
    })
      .then(async (similarUser: Pick<User, 'id' | 'name' | 'email'> | null) => {
        if (similarUser !== null) {
          if (similarUser.name === name) {
            reject(new BadRequestError('NAME_ALREADY_USED'));
          }
          if (similarUser.email === email) {
            reject(new BadRequestError('EMAIL_ALREADY_USED'));
          }
        }
        const passwordHash = await hashPassword(password);
        await models.users.create({ type, name, email, passwordHash });
        resolve();
      })
      .catch(reject);
  });
}

type CreateUserData = Pick<User, 'type' | 'name' | 'email'> & { password: User['passwordHash'] };