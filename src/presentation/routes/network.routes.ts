import { Router } from 'express';
import { UploadNetworkSchema } from '../../application/dtos/network.dto';
import { NetworkController } from '../controllers/network.controller';
import { validateBody } from '../middlewares/validation.middleware';

export function createNetworkRouter(networkController: NetworkController): Router {
  const router = Router();

  router.post(
    '/upload',
    validateBody(UploadNetworkSchema),
    networkController.upload
  );

  router.get(
    '/nodes/:id',
    networkController.getNodes
  );

  return router;
}
