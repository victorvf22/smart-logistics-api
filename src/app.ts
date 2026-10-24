import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { DijkstraRouter } from './domain/algorithms/dijkstra';
import { InMemoryNetworkRepository } from './infrastructure/repositories/in-memory-network.repository';
import { InMemoryJobRepository } from './infrastructure/repositories/in-memory-job.repository';
import { AsyncJobQueue } from './infrastructure/queue/job-queue';
import { NetworkService } from './application/services/network.service';
import { RouteOptimizationService } from './application/services/route.service';
import { NetworkController } from './presentation/controllers/network.controller';
import { RouteController } from './presentation/controllers/route.controller';
import { createNetworkRouter } from './presentation/routes/network.routes';
import { createRouteRouter } from './presentation/routes/route.routes';
import { errorHandler } from './presentation/middlewares/error.middleware';
import { swaggerDocument } from './infrastructure/docs/swagger.config';

export interface AppDependencies {
  networkRepository?: InMemoryNetworkRepository;
  jobRepository?: InMemoryJobRepository;
  jobQueue?: AsyncJobQueue;
  routerAlgorithm?: DijkstraRouter;
}

export function createApp(deps: AppDependencies = {}): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  const networkRepository = deps.networkRepository || new InMemoryNetworkRepository(5);
  const jobRepository = deps.jobRepository || new InMemoryJobRepository();
  const jobQueue = deps.jobQueue || new AsyncJobQueue();
  const routerAlgorithm = deps.routerAlgorithm || new DijkstraRouter();

  const networkService = new NetworkService(networkRepository);
  const routeService = new RouteOptimizationService(
    networkRepository,
    jobRepository,
    jobQueue,
    routerAlgorithm
  );

  const networkController = new NetworkController(networkService);
  const routeController = new RouteController(routeService);

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  app.get('/docs-json', (_req: Request, res: Response) => {
    res.json(swaggerDocument);
  });

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
  });

  app.use('/network', createNetworkRouter(networkController));
  app.use('/route', createRouteRouter(routeController));

  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      statusCode: 404,
      error: 'Not Found',
      message: 'The requested endpoint was not found on this server.'
    });
  });

  app.use(errorHandler);

  return app;
}

export const app = createApp();
