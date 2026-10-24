import { OptimizationJob } from '../../domain/models/graph.model';
import { IJobRepository } from '../../domain/repositories/job.repository.interface';

export class InMemoryJobRepository implements IJobRepository {
  private readonly storage: Map<string, OptimizationJob> = new Map();

  public async save(job: OptimizationJob): Promise<void> {
    this.storage.set(job.jobId, { ...job });
  }

  public async findById(jobId: string): Promise<OptimizationJob | null> {
    const job = this.storage.get(jobId);
    return job ? { ...job } : null;
  }

  public async update(
    jobId: string,
    partial: Partial<OptimizationJob>
  ): Promise<OptimizationJob | null> {
    const existing = this.storage.get(jobId);
    if (!existing) {
      return null;
    }
    const updated: OptimizationJob = {
      ...existing,
      ...partial,
      updatedAt: new Date()
    };
    this.storage.set(jobId, updated);
    return { ...updated };
  }

  public clear(): void {
    this.storage.clear();
  }
}
