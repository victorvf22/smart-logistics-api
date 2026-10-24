import { DijkstraRouter, RouteCalculationError } from '../../src/domain/algorithms/dijkstra';
import { GraphDefinition } from '../../src/domain/models/graph.model';

describe('DijkstraRouter Algorithm Service', () => {
    let router: DijkstraRouter;
    let testGraph: GraphDefinition;

    beforeEach(() => {
        router = new DijkstraRouter();

        // Official validation test graph specified in README.md
        testGraph = {
            id: 'test-graph-1',
            nodes: ['A', 'B', 'C', 'D', 'E'],
            edges: [
                {
                    from: 'A',
                    to: 'B',
                    cost: 10,
                    maxWeight: 10000,
                    noHazardous: false,
                    trafficMultiplier: 1.0
                },
                {
                    from: 'A',
                    to: 'C',
                    cost: 15,
                    maxWeight: 5000,
                    noHazardous: true,
                    trafficMultiplier: 1.5
                },
                {
                    from: 'B',
                    to: 'D',
                    cost: 12,
                    maxWeight: 10000,
                    noHazardous: false,
                    trafficMultiplier: 2.0
                },
                {
                    from: 'C',
                    to: 'D',
                    cost: 5,
                    maxWeight: 5000,
                    noHazardous: true,
                    trafficMultiplier: 1.0
                },
                {
                    from: 'D',
                    to: 'E',
                    cost: 10,
                    maxWeight: 8000,
                    noHazardous: false,
                    trafficMultiplier: 1.2
                }
            ],
            createdAt: new Date()
        };
    });

    describe('Official README Validation Test Cases', () => {
        it('Case 1 (Standard Path): light, non-hazardous vehicle selects optimal path A -> C -> D -> E', () => {
            const result = router.calculateRoute(testGraph, {
                graphId: testGraph.id,
                originNodeId: 'A',
                destinationNodeId: 'E',
                vehicleProfile: {
                    type: 'van',
                    weight: 3000,
                    hazardous: false
                },
                departureTime: '12:00'
            });

            expect(result.path).toEqual(['A', 'C', 'D', 'E']);
            expect(result.totalCost).toBe(30); // 15 (A->C) + 5 (C->D) + 10 (D->E) = 30
            expect(result.durationMs).toBeGreaterThanOrEqual(0);
        });

        it('Case 2 (Weight Constraint): heavy 6000kg truck avoids A->C and C->D, routing via A -> B -> D -> E', () => {
            const result = router.calculateRoute(testGraph, {
                graphId: testGraph.id,
                originNodeId: 'A',
                destinationNodeId: 'E',
                vehicleProfile: {
                    type: 'truck',
                    weight: 6000,
                    hazardous: false
                },
                departureTime: '12:00'
            });

            expect(result.path).toEqual(['A', 'B', 'D', 'E']);
            expect(result.totalCost).toBe(32); // 10 (A->B) + 12 (B->D) + 10 (D->E) = 32
        });

        it('Case 3 (Hazardous Constraint): hazardous truck avoids A->C and C->D due to noHazardous: true', () => {
            const result = router.calculateRoute(testGraph, {
                graphId: testGraph.id,
                originNodeId: 'A',
                destinationNodeId: 'E',
                vehicleProfile: {
                    type: 'truck',
                    weight: 3000,
                    hazardous: true
                },
                departureTime: '12:00'
            });

            expect(result.path).toEqual(['A', 'B', 'D', 'E']);
            expect(result.totalCost).toBe(32);
        });
    });

    describe('Traffic Conditions and Peak Hours (Time-Dependent Edge Weights)', () => {
        it('should correctly identify peak hours (07:00-09:00 and 17:00-19:00)', () => {
            expect(router.isPeakHour('07:00')).toBe(true);
            expect(router.isPeakHour('08:00')).toBe(true);
            expect(router.isPeakHour('09:00')).toBe(true);
            expect(router.isPeakHour('17:00')).toBe(true);
            expect(router.isPeakHour('18:30')).toBe(true);
            expect(router.isPeakHour('19:00')).toBe(true);

            expect(router.isPeakHour('06:59')).toBe(false);
            expect(router.isPeakHour('09:01')).toBe(false);
            expect(router.isPeakHour('12:00')).toBe(false);
            expect(router.isPeakHour('22:00')).toBe(false);
            expect(router.isPeakHour(undefined)).toBe(false);
        });

        it('should apply edge traffic multiplier during peak hours at 08:00', () => {
            const result = router.calculateRoute(testGraph, {
                graphId: testGraph.id,
                originNodeId: 'A',
                destinationNodeId: 'E',
                vehicleProfile: {
                    type: 'van',
                    weight: 3000,
                    hazardous: false
                },
                departureTime: '08:00'
            });

            // During peak hours:
            // A->C: 15 * 1.5 = 22.5
            // C->D: 5 * 1.0 = 5.0
            // D->E: 10 * 1.2 = 12.0
            // Total A->C->D->E: 22.5 + 5 + 12 = 39.5
            //
            // Via B:
            // A->B: 10 * 1.0 = 10.0
            // B->D: 12 * 2.0 = 24.0
            // D->E: 10 * 1.2 = 12.0
            // Total A->B->D->E: 10 + 24 + 12 = 46.0
            expect(result.path).toEqual(['A', 'C', 'D', 'E']);
            expect(result.totalCost).toBe(39.5);
        });

        it('should dynamically switch optimal route if peak traffic makes default route more expensive', () => {
            const trafficGraph: GraphDefinition = {
                id: 'traffic-graph',
                nodes: ['X', 'Y1', 'Y2', 'Z'],
                edges: [
                    // Route 1: cheaper off-peak (cost 10), but highly congested in peak hours (cost 30)
                    { from: 'X', to: 'Y1', cost: 5, trafficMultiplier: 3.0 },
                    { from: 'Y1', to: 'Z', cost: 5, trafficMultiplier: 3.0 },
                    // Route 2: consistent cost 14 with no congestion
                    { from: 'X', to: 'Y2', cost: 7, trafficMultiplier: 1.0 },
                    { from: 'Y2', to: 'Z', cost: 7, trafficMultiplier: 1.0 }
                ],
                createdAt: new Date()
            };

            // Off-peak: chooses Route 1 (cost 10 < 14)
            const offPeak = router.calculateRoute(trafficGraph, {
                graphId: trafficGraph.id,
                originNodeId: 'X',
                destinationNodeId: 'Z',
                departureTime: '12:00'
            });
            expect(offPeak.path).toEqual(['X', 'Y1', 'Z']);
            expect(offPeak.totalCost).toBe(10);

            // Peak hour: chooses Route 2 (cost 14 < 30)
            const peak = router.calculateRoute(trafficGraph, {
                graphId: trafficGraph.id,
                originNodeId: 'X',
                destinationNodeId: 'Z',
                departureTime: '08:30'
            });
            expect(peak.path).toEqual(['X', 'Y2', 'Z']);
            expect(peak.totalCost).toBe(14);
        });
    });

    describe('Sequential Multi-Stop Routing with Waypoints', () => {
        it('should sequentially traverse waypoints in specified order', () => {
            // Force visit through node B as waypoint
            const result = router.calculateRoute(testGraph, {
                graphId: testGraph.id,
                originNodeId: 'A',
                destinationNodeId: 'E',
                waypoints: ['B'],
                vehicleProfile: {
                    type: 'van',
                    weight: 3000,
                    hazardous: false
                },
                departureTime: '12:00'
            });

            expect(result.path).toEqual(['A', 'B', 'D', 'E']);
            expect(result.totalCost).toBe(32);
        });

        it('should handle multiple waypoints chained sequentially', () => {
            const chainGraph: GraphDefinition = {
                id: 'chain-graph',
                nodes: ['1', '2', '3', '4', '5'],
                edges: [
                    { from: '1', to: '2', cost: 2 },
                    { from: '2', to: '3', cost: 3 },
                    { from: '3', to: '4', cost: 4 },
                    { from: '4', to: '5', cost: 5 },
                    { from: '1', to: '5', cost: 100 }
                ],
                createdAt: new Date()
            };

            const result = router.calculateRoute(chainGraph, {
                graphId: chainGraph.id,
                originNodeId: '1',
                destinationNodeId: '5',
                waypoints: ['2', '4']
            });

            expect(result.path).toEqual(['1', '2', '3', '4', '5']);
            expect(result.totalCost).toBe(14);
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should return cost 0 and single-node path when origin equals destination', () => {
            const result = router.calculateRoute(testGraph, {
                graphId: testGraph.id,
                originNodeId: 'A',
                destinationNodeId: 'A'
            });

            expect(result.path).toEqual(['A']);
            expect(result.totalCost).toBe(0);
        });

        it('should throw RouteCalculationError with NODE_NOT_FOUND when origin does not exist', () => {
            expect(() =>
                router.calculateRoute(testGraph, {
                    graphId: testGraph.id,
                    originNodeId: 'Z_NON_EXISTENT',
                    destinationNodeId: 'E'
                })
            ).toThrow(RouteCalculationError);

            try {
                router.calculateRoute(testGraph, {
                    graphId: testGraph.id,
                    originNodeId: 'Z_NON_EXISTENT',
                    destinationNodeId: 'E'
                });
            } catch (err: any) {
                expect(err.code).toBe('NODE_NOT_FOUND');
            }
        });

        it('should throw RouteCalculationError with NODE_NOT_FOUND when destination does not exist', () => {
            try {
                router.calculateRoute(testGraph, {
                    graphId: testGraph.id,
                    originNodeId: 'A',
                    destinationNodeId: 'UNKNOWN'
                });
            } catch (err: any) {
                expect(err.code).toBe('NODE_NOT_FOUND');
            }
        });

        it('should throw RouteCalculationError with NODE_NOT_FOUND when a waypoint does not exist', () => {
            try {
                router.calculateRoute(testGraph, {
                    graphId: testGraph.id,
                    originNodeId: 'A',
                    destinationNodeId: 'E',
                    waypoints: ['MISSING_WP']
                });
            } catch (err: any) {
                expect(err.code).toBe('NODE_NOT_FOUND');
            }
        });

        it('should throw RouteCalculationError with UNREACHABLE_PATH when vehicle constraints prevent reaching destination', () => {
            try {
                router.calculateRoute(testGraph, {
                    graphId: testGraph.id,
                    originNodeId: 'A',
                    destinationNodeId: 'E',
                    vehicleProfile: {
                        weight: 15000
                    }
                });
            } catch (err: any) {
                expect(err.code).toBe('UNREACHABLE_PATH');
            }
        });

        it('should throw UNREACHABLE_PATH if no path exists in a disconnected graph', () => {
            const disconnectedGraph: GraphDefinition = {
                id: 'disc-graph',
                nodes: ['A', 'B', 'C'],
                edges: [{ from: 'A', to: 'B', cost: 10 }],
                createdAt: new Date()
            };

            try {
                router.calculateRoute(disconnectedGraph, {
                    graphId: disconnectedGraph.id,
                    originNodeId: 'A',
                    destinationNodeId: 'C'
                });
            } catch (err: any) {
                expect(err.code).toBe('UNREACHABLE_PATH');
            }
        });
    });
});
