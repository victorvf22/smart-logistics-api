import { Request, Response, NextFunction } from 'express';
import { RouteOptimizationService } from '../../application/services/route.service';

export class RouteController {
  constructor(private readonly routeService: RouteOptimizationService) {}

  public optimize = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const response = await this.routeService.submitOptimizationJob(id, req.body);
      res.status(202).json(response);
    } catch (error) {
      next(error);
    }
  };

  public getStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
      const response = await this.routeService.getJobStatus(jobId);
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
