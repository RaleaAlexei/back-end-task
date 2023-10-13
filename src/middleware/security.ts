import { RequestHandler } from 'express';

import type { SequelizeClient } from '~/lib/sequelize';
import type { User } from '~/repositories/types';

import { UnauthorizedError, ForbiddenError, HttpError } from '~/errors';
import { isValidToken, extraDataFromToken } from '~/lib/security';
import { UserType } from '~/constants';
async function getUserFromTokenHeader(sequelizeClient: SequelizeClient, tokenHeader: string | any): Promise<RequestAuth> {
  const { models } = sequelizeClient;
  if (typeof tokenHeader !== 'string') {
    throw new UnauthorizedError('AUTH_MISSING');
  }
  const [type, token] = tokenHeader.split(' ');
  if (type?.toLowerCase() !== 'bearer') {
    throw new UnauthorizedError('AUTH_WRONG_TYPE');
  }
  if (!token) {
    throw new UnauthorizedError('AUTH_TOKEN_MISSING');
  }
  const tokenValidity = await isValidToken(token);
  if (!tokenValidity) {
    throw new UnauthorizedError('AUTH_TOKEN_INVALID');
  }
  const { id } = await extraDataFromToken(token);
  const userModel = await models.users.findByPk(id);
  if (!userModel) {
    throw new UnauthorizedError('AUTH_TOKEN_INVALID');
  }
  return { token, user: userModel.toJSON() };
}
export function initTokenValidationRequestHandler(sequelizeClient: SequelizeClient): RequestHandler {
  return function tokenValidationRequestHandler(req, res, next): void {
    const authorizationHeaderValue = req.header('authorization');
    getUserFromTokenHeader(sequelizeClient, authorizationHeaderValue)
      .then((reqAuth) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (req as any).auth = reqAuth;
        next();
      })
      .catch((error: HttpError) => {
        if(!error.httpCode)
          throw error;
        res.status(error.httpCode).send(error.message);
      });
  };
}

// NOTE(roman): assuming that `tokenValidationRequestHandler` is placed before
export function initAdminValidationRequestHandler(): RequestHandler {
  return function adminValidationRequestHandler(req, res, next): void {
    const { auth } = req as unknown as { auth: RequestAuth };
    if(!auth)
      throw new ForbiddenError('UNAUTHORIZED');
    if (auth.user.type !== UserType.ADMIN) {
      throw new ForbiddenError('UNAUTHORIZED');
    }
    next();
  };
}

export interface RequestAuth {
  token: string;
  user: User;
}