import { Router } from 'express';
import { OptimizeRouteSchema } from '../../application/dtos/route.dto';
import { RouteController } from '../controllers/route.controller';
import { validateBody } from '../middlewares/validation.middleware';

export function createRouteRouter(routeController: RouteController): Router {
  const router = Router();

  router.post(
    '/optimize/:id',
    validateBody(OptimizeRouteSchema),
    routeController.optimize
  );

  router.get(
    '/status/:jobId',
    routeController.getStatus
  );

  return router;
}
