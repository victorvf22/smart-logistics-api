import { v4 as uuidv4 } from 'uuid';
import { DijkstraRouter, RouteCalculationError } from '../../domain/algorithms/dijkstra';
import { OptimizationJob, OptimizationRequest } from '../../domain/models/graph.model';
import { IJobRepository } from '../../domain/repositories/job.repository.interface';
import { INetworkRepository } from '../../domain/repositories/network.repository.interface';
import { IJobQueue } from '../../infrastructure/queue/job-queue';
import {
  OptimizeRouteDto,
  OptimizeRouteResponseDto,
  RouteStatusResponseDto
} from '../dtos/route.dto';
import { NetworkNotFoundError } from './network.service';

export class JobNotFoundError extends Error {
  constructor(jobId: string) {
    super(`Optimization job with ID '${jobId}' was not found.`);
    this.name = 'JobNotFoundError';
  }
}

export class RouteOptimizationService {
  constructor(
    private readonly networkRepository: INetworkRepository,
    private readonly jobRepository: IJobRepository,
    private readonly jobQueue: IJobQueue,
    private readonly router: DijkstraRouter
  ) {}

  public async submitOptimizationJob(
    graphId: string,
    dto: OptimizeRouteDto
  ): Promise<OptimizeRouteResponseDto> {
    const graph = await this.networkRepository.findById(graphId);
    if (!graph) {
      throw new NetworkNotFoundError(graphId);
    }

    const jobId = `job-${uuidv4()}`;

    const request: OptimizationRequest = {
      graphId,
      originNodeId: dto.originNodeId,
      destinationNodeId: dto.destinationNodeId,
      waypoints: dto.waypoints,
      vehicleProfile: dto.vehicleProfile,
      departureTime: dto.departureTime
    };

    const job: OptimizationJob = {
      jobId,
      status: 'PENDING',
      request,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.jobRepository.save(job);

    await this.jobQueue.enqueue(job, async (enqueuedJob) => {
      await this.processJob(enqueuedJob);
    });

    return { jobId };
  }

  public async processJob(job: OptimizationJob): Promise<void> {
    try {
      await this.jobRepository.update(job.jobId, { status: 'PROCESSING' });

      const graph = await this.networkRepository.findById(job.request.graphId);
      if (!graph) {
        throw new NetworkNotFoundError(job.request.graphId);
      }

      const result = this.router.calculateRoute(graph, job.request);

      await this.jobRepository.update(job.jobId, {
        status: 'COMPLETED',
        result
      });
    } catch (error: any) {
      const errorMessage =
        error instanceof RouteCalculationError || error instanceof Error
          ? error.message
          : 'Unknown error occurred during route calculation.';

      await this.jobRepository.update(job.jobId, {
        status: 'FAILED',
        error: errorMessage
      });
    }
  }

  public async getJobStatus(jobId: string): Promise<RouteStatusResponseDto> {
    const job = await this.jobRepository.findById(jobId);
    if (!job) {
      throw new JobNotFoundError(jobId);
    }

    if (job.status === 'COMPLETED') {
      return {
        status: 'COMPLETED',
        result: job.result
      };
    }

    if (job.status === 'FAILED') {
      return {
        status: 'FAILED',
        error: job.error
      };
    }

    return {
      status: job.status,
      jobId: job.jobId
    };
  }
}
