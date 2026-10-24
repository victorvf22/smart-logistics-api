import { z } from 'zod';
import { RouteResult, JobStatus } from '../../domain/models/graph.model';

export const VehicleProfileSchema = z.object({
  type: z.string().trim().optional(),
  weight: z.number().positive('Vehicle weight must be greater than 0.').optional(),
  hazardous: z.boolean().optional()
});

export const OptimizeRouteSchema = z.object({
  originNodeId: z.string().trim().min(1, 'Origin node is required.'),
  destinationNodeId: z.string().trim().min(1, 'Destination node is required.'),
  waypoints: z.array(z.string().trim().min(1)).optional(),
  vehicleProfile: VehicleProfileSchema.optional(),
  departureTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Departure time must be formatted as HH:mm (e.g. 08:00 or 17:30).')
    .optional()
});

export type OptimizeRouteDto = z.infer<typeof OptimizeRouteSchema>;

export interface OptimizeRouteResponseDto {
  jobId: string;
}

export interface RouteStatusResponseDto {
  status: JobStatus;
  jobId?: string;
  result?: RouteResult;
  error?: string;
}
