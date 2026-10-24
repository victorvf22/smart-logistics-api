import { Edge, GraphDefinition, OptimizationRequest, RouteResult } from '../models/graph.model';
import { PriorityQueue } from './priority-queue';

export interface RouteErrorDetails {
    code: 'NODE_NOT_FOUND' | 'UNREACHABLE_PATH' | 'INVALID_INPUT';
    message: string;
}

export class RouteCalculationError extends Error {
    public readonly code: string;

    constructor(details: RouteErrorDetails) {
        super(details.message);
        this.name = 'RouteCalculationError';
        this.code = details.code;
    }
}

export class DijkstraRouter {
    public isPeakHour(timeStr?: string): boolean {
        if (!timeStr) {
            return false;
        }

        const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
        if (!match) {
            return false;
        }

        const hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
            return false;
        }

        const totalMinutes = hours * 60 + minutes;
        const morningPeak = totalMinutes >= 7 * 60 && totalMinutes <= 9 * 60;
        const eveningPeak = totalMinutes >= 17 * 60 && totalMinutes <= 19 * 60;

        return morningPeak || eveningPeak;
    }

    public isEdgeTraversable(edge: Edge, vehicle?: OptimizationRequest['vehicleProfile']): boolean {
        if (!vehicle) {
            return true;
        }

        if (vehicle.weight !== undefined && edge.maxWeight !== undefined) {
            if (vehicle.weight > edge.maxWeight) {
                return false;
            }
        }

        if (vehicle.hazardous === true && edge.noHazardous === true) {
            return false;
        }

        return true;
    }

    public calculateEdgeCost(edge: Edge, isPeak: boolean): number {
        if (isPeak && edge.trafficMultiplier !== undefined) {
            return edge.cost * edge.trafficMultiplier;
        }
        return edge.cost;
    }

    private buildAdjacencyList(edges: Edge[]): Map<string, Edge[]> {
        const adj = new Map<string, Edge[]>();
        for (const edge of edges) {
            if (!adj.has(edge.from)) {
                adj.set(edge.from, []);
            }
            adj.get(edge.from)!.push(edge);
        }
        return adj;
    }

    public findShortestLeg(
        graph: GraphDefinition,
        origin: string,
        destination: string,
        vehicle?: OptimizationRequest['vehicleProfile'],
        isPeak: boolean = false
    ): { path: string[]; cost: number } {
        if (origin === destination) {
            return { path: [origin], cost: 0 };
        }

        const adjacency = this.buildAdjacencyList(graph.edges);
        const distances = new Map<string, number>();
        const previous = new Map<string, string | null>();
        const pq = new PriorityQueue<string>();

        for (const node of graph.nodes) {
            distances.set(node, Infinity);
            previous.set(node, null);
        }

        distances.set(origin, 0);
        pq.enqueue(origin, 0);

        const visited = new Set<string>();

        while (!pq.isEmpty()) {
            const current = pq.dequeue();
            if (!current) break;

            if (current === destination) {
                break;
            }

            if (visited.has(current)) {
                continue;
            }
            visited.add(current);

            const neighbors = adjacency.get(current) || [];
            const currentDistance = distances.get(current) ?? Infinity;

            for (const edge of neighbors) {
                if (!this.isEdgeTraversable(edge, vehicle)) {
                    continue;
                }

                const edgeCost = this.calculateEdgeCost(edge, isPeak);
                const tentativeDistance = currentDistance + edgeCost;
                const neighborDistance = distances.get(edge.to) ?? Infinity;

                if (tentativeDistance < neighborDistance) {
                    distances.set(edge.to, tentativeDistance);
                    previous.set(edge.to, current);
                    pq.enqueue(edge.to, tentativeDistance);
                }
            }
        }

        const destinationDistance = distances.get(destination);
        if (destinationDistance === undefined || destinationDistance === Infinity) {
            throw new RouteCalculationError({
                code: 'UNREACHABLE_PATH',
                message: `No reachable path between '${origin}' and '${destination}' with the given vehicle constraints and traffic conditions.`
            });
        }

        const path: string[] = [];
        let curr: string | null = destination;
        while (curr !== null) {
            path.unshift(curr);
            curr = previous.get(curr) ?? null;
        }

        return { path, cost: destinationDistance };
    }

    public calculateRoute(graph: GraphDefinition, request: OptimizationRequest): RouteResult {
        const startTime = performance.now();
        const nodeSet = new Set(graph.nodes);

        if (!nodeSet.has(request.originNodeId)) {
            throw new RouteCalculationError({
                code: 'NODE_NOT_FOUND',
                message: `Origin node '${request.originNodeId}' does not exist in graph '${graph.id}'.`
            });
        }

        if (!nodeSet.has(request.destinationNodeId)) {
            throw new RouteCalculationError({
                code: 'NODE_NOT_FOUND',
                message: `Destination node '${request.destinationNodeId}' does not exist in graph '${graph.id}'.`
            });
        }

        const waypoints = request.waypoints || [];
        for (const wp of waypoints) {
            if (!nodeSet.has(wp)) {
                throw new RouteCalculationError({
                    code: 'NODE_NOT_FOUND',
                    message: `Waypoint node '${wp}' does not exist in graph '${graph.id}'.`
                });
            }
        }

        const isPeak = this.isPeakHour(request.departureTime);
        const stops = [request.originNodeId, ...waypoints, request.destinationNodeId];

        let totalCost = 0;
        const fullPath: string[] = [];

        for (let i = 0; i < stops.length - 1; i++) {
            const fromNode = stops[i];
            const toNode = stops[i + 1];

            const leg = this.findShortestLeg(
                graph,
                fromNode,
                toNode,
                request.vehicleProfile,
                isPeak
            );

            totalCost += leg.cost;

            if (i === 0) {
                fullPath.push(...leg.path);
            } else {
                fullPath.push(...leg.path.slice(1));
            }
        }

        const endTime = performance.now();
        const durationMs = Math.round((endTime - startTime) * 100) / 100;

        return {
            graphId: graph.id,
            totalCost: Math.round(totalCost * 100) / 100,
            path: fullPath,
            durationMs
        };
    }
}
