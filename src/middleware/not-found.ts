import type { RequestHandler } from 'express';

import { NotFoundError } from '~/errors';

export function initNotFoundRequestHandler(): RequestHandler {
  return function notFoundRequestHandler(req, res, next) {
    const { method, path } = req;

    return next(new NotFoundError('ENDPOINT_NOT_FOUND', method, path));
  };
}
