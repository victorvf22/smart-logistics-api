import { OptimizationJob } from '../models/graph.model';

export interface IJobRepository {
  save(job: OptimizationJob): Promise<void>;
  findById(jobId: string): Promise<OptimizationJob | null>;
  update(jobId: string, partial: Partial<OptimizationJob>): Promise<OptimizationJob | null>;
}
