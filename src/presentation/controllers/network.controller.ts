import { Request, Response, NextFunction } from 'express';
import { NetworkService } from '../../application/services/network.service';

export class NetworkController {
  constructor(private readonly networkService: NetworkService) {}

  public upload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const response = await this.networkService.uploadGraph(req.body);
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  public getNodes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const response = await this.networkService.getNodes(id);
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
