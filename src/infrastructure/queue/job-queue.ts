import { OptimizationJob } from '../../domain/models/graph.model';

export type JobHandler = (job: OptimizationJob) => Promise<void>;

export interface IJobQueue {
  enqueue(job: OptimizationJob, handler: JobHandler): Promise<void>;
}

export class AsyncJobQueue implements IJobQueue {
  public async enqueue(job: OptimizationJob, handler: JobHandler): Promise<void> {
    setImmediate(async () => {
      try {
        await handler(job);
      } catch (error) {
        console.error(`[AsyncJobQueue] Error processing job ${job.jobId}:`, error);
      }
    });
  }
}
