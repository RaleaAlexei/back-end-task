import { Router, RequestHandler } from 'express';

import type { SequelizeClient } from '~/lib/sequelize';
import type { Post } from '~/repositories/types';

import { UnauthorizedError, NotFoundError } from '~/errors';
import { initTokenValidationRequestHandler, RequestAuth } from '~/middleware/security';
import { UserType } from '~/constants';

export function initPostsRouter(sequelizeClient: SequelizeClient): Router {
  const router = Router({ mergeParams: true });

  const tokenValidation = initTokenValidationRequestHandler(sequelizeClient);
  router.route('/')
    .get(tokenValidation, initGetPostRequestHandler(sequelizeClient))
    .post(tokenValidation, initCreatePostRequestHandler(sequelizeClient))
    .delete(tokenValidation, initDeletePostRequestHandler(sequelizeClient))
    .put(tokenValidation, initUpdatePostRequestHandler(sequelizeClient));

  return router;
}

function initGetPostRequestHandler(sequelizeClient: SequelizeClient): RequestHandler {
  return function getPostRequestHandler(req, res, next): void {
    const { models } = sequelizeClient;
    const { method, path } = req;
    const { id } = req.query;
    const { auth } = req as unknown as { auth: RequestAuth };
    models.posts.findOne({
      attributes: ['id', 'title', 'authorId', 'content', 'isHidden', 'createdAt'],
      where: { id },
      raw: true,
    })
      .then((post: Pick<Post, 'id' | 'title' | 'authorId' | 'content' | 'isHidden' | 'createdAt'> | null) => {
        if (typeof post === null) {
          throw new NotFoundError('POST_NOT_FOUND', method, path);
        }
        if (post?.isHidden && post?.authorId !== auth.user.id) {
          throw new UnauthorizedError('PRIVATE_POST');
        }
        res.status(200).send(post);
      })
      .catch(next);
  };
}
function initCreatePostRequestHandler(sequelizeClient: SequelizeClient): RequestHandler {
  return function createPostRequestHandler(req, res, next): void {
    const { auth } = req as unknown as { auth: RequestAuth };
    const { title, content, isHidden } = req.body as Omit<CreatePostData, 'type'>;

    createPost({ authorId: auth.user.id, title, content, isHidden }, sequelizeClient)
      .then((postId: number) => {
        console.log({id: postId});
        res.status(200).send({id: postId});
      })
      .catch(next);
  };
}
function initDeletePostRequestHandler(sequelizeClient: SequelizeClient): RequestHandler {
  return function deletePostRequestHandler(req, res, next): void {
    console.log('Delete started');
    const { models } = sequelizeClient;
    const { method, path } = req;
    const { id } = req.body as { id: number; };
    const { auth } = req as unknown as { auth: RequestAuth };
    models.posts.findOne({
      attributes: ['authorId', 'isHidden'],
      where: { id },
      raw: true,
    })
      .then(async (post: Pick<Post, 'authorId' | 'isHidden'> | null) => {
        if (post === null) {
          throw new NotFoundError('POST_NOT_FOUND', method, path);
        }
        if (post.authorId !== auth.user.id && auth.user.type !== UserType.ADMIN) {
          throw new UnauthorizedError('UNAUTHORIZED');
        }
        if(auth.user.type === UserType.ADMIN){
          if(post.isHidden)
            throw new UnauthorizedError('UNAUTHORIZED');
        }
        await models.posts.destroy({
          where: { id },
        });
        res.status(204).end();
      })
      .catch(next);
  };
}
function initUpdatePostRequestHandler(sequelizeClient: SequelizeClient): RequestHandler {
  return function updatePostRequestHandler(req, res, next): void {
    const { models } = sequelizeClient;
    const { method, path } = req;
    const { id, title, content, isHidden } = req.body as { id: number; title: string; content: string; isHidden: boolean };
    const { auth } = req as unknown as { auth: RequestAuth };
    models.posts.findOne({
      attributes: ['id', 'authorId'],
      where: { id },
      raw: true,
    })
      .then(async (post: Pick<Post, 'id' | 'authorId'> | null) => {
        if(post === null){
          throw new NotFoundError('POST_NOT_FOUND', method, path);
        }
        if (post.authorId !== auth.user.id) {
          throw new UnauthorizedError('UNAUTHORIZED');
        }
        await models.posts.update({title, content, isHidden, updatedAt: Date.now()}, {
          where: { id },
        });
        res.status(204).end();
      })
      .catch(next);
  };
}
function createPost(data: CreatePostData, sequelizeClient: SequelizeClient): Promise<number | any> {
  return new Promise((resolve, reject) => {
    const { authorId, title, content, isHidden } = data;
    const { models } = sequelizeClient;
    models.posts.create({ authorId, title, content, isHidden })
      .then((user) => resolve(user.id))
      .catch(reject);
  });
}

type CreatePostData = Pick<Post, 'authorId' | 'title' | 'content' | 'isHidden'>;