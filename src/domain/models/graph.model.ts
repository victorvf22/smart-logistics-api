export interface Edge {
  from: string;
  to: string;
  cost: number;
  maxWeight?: number;
  noHazardous?: boolean;
  trafficMultiplier?: number;
}

export interface Node {
  id: string;
}

export interface GraphDefinition {
  id: string;
  edges: Edge[];
  nodes: string[];
  createdAt: Date;
}

export interface VehicleProfile {
  type?: string;
  weight?: number;
  hazardous?: boolean;
}

export interface OptimizationRequest {
  graphId: string;
  originNodeId: string;
  destinationNodeId: string;
  waypoints?: string[];
  vehicleProfile?: VehicleProfile;
  departureTime?: string;
}

export interface RouteResult {
  graphId: string;
  totalCost: number;
  path: string[];
  durationMs: number;
}

export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface OptimizationJob {
  jobId: string;
  status: JobStatus;
  request: OptimizationRequest;
  result?: RouteResult;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}
