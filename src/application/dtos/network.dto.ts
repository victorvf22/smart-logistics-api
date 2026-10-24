import { z } from 'zod';

export const EdgeSchema = z.object({
  from: z.string().trim().min(1, 'Origin node (from) is required.'),
  to: z.string().trim().min(1, 'Destination node (to) is required.'),
  cost: z.number().positive('Cost must be a positive number greater than 0.'),
  maxWeight: z.number().positive('Maximum weight (maxWeight) must be positive.').optional(),
  noHazardous: z.boolean().optional(),
  trafficMultiplier: z.number().min(0.1, 'Traffic multiplier must be at least 0.1.').optional()
});

export const UploadNetworkSchema = z.object({
  edges: z.array(EdgeSchema).min(1, 'At least one edge is required to define a graph.')
});

export type UploadNetworkDto = z.infer<typeof UploadNetworkSchema>;

export interface UploadNetworkResponseDto {
  graphId: string;
  nodeCount: number;
  edgeCount: number;
  nodes: string[];
}

export interface GetNetworkNodesResponseDto {
  graphId: string;
  nodes: string[];
}
