/**
 * Complete OpenAPI 3.0 specification for Smart Logistics Routing API.
 * Accurately documents all endpoint contracts, schemas, and examples.
 */
export const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Smart Logistics Routing API',
    version: '1.0.0',
    description:
      'High-performance RESTful API for optimal pathfinding on transportation networks (Graphs), implementing Dijkstra algorithm with Binary Min-Heap priority queue, non-blocking asynchronous processing, sequential multi-stop waypoints, vehicle constraints, and dynamic peak-hour traffic multipliers.'
  },
  servers: [
    {
      url: '/',
      description: 'Local / Production Server'
    }
  ],
  tags: [
    {
      name: 'Network Management',
      description: 'Operations for graph network definition and topology inspection.'
    },
    {
      name: 'Route Optimization',
      description: 'Operations for asynchronous route optimization dispatch and status polling.'
    }
  ],
  paths: {
    '/network/upload': {
      post: {
        tags: ['Network Management'],
        summary: 'Uploads a new graph definition',
        description:
          'Accepts an array of edges with costs and constraints (maxWeight, noHazardous, and trafficMultiplier) and returns the generated graphId.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UploadNetworkPayload'
              },
              example: {
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
                ]
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Network graph created successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UploadNetworkResponse'
                },
                example: {
                  graphId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                  nodeCount: 5,
                  edgeCount: 5,
                  nodes: ['A', 'B', 'C', 'D', 'E']
                }
              }
            }
          },
          '400': {
            description: 'Invalid input payload',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },
    '/network/nodes/{id}': {
      get: {
        tags: ['Network Management'],
        summary: 'Retrieves all defined nodes from a graph',
        description: 'Returns the list of node identifiers belonging to the specified network by ID.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Unique graph identifier (graphId)',
            schema: {
              type: 'string',
              format: 'uuid'
            }
          }
        ],
        responses: {
          '200': {
            description: 'List of defined nodes retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/GetNetworkNodesResponse'
                },
                example: {
                  graphId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                  nodes: ['A', 'B', 'C', 'D', 'E']
                }
              }
            }
          },
          '404': {
            description: 'Graph not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },
    '/route/optimize/{id}': {
      post: {
        tags: ['Route Optimization'],
        summary: 'Submits an asynchronous route calculation job',
        description:
          'Initiates an asynchronous, non-blocking pathfinding computation evaluating vehicle restrictions, peak traffic multipliers, and sequential waypoints. Returns HTTP 202 Accepted with a jobId for polling.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Target graph identifier for pathfinding',
            schema: {
              type: 'string'
            }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/OptimizeRoutePayload'
              },
              example: {
                originNodeId: 'A',
                destinationNodeId: 'E',
                waypoints: ['C'],
                vehicleProfile: {
                  type: 'truck',
                  weight: 4000,
                  hazardous: false
                },
                departureTime: '08:00'
              }
            }
          }
        },
        responses: {
          '202': {
            description: 'Job accepted and processing in background',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/OptimizeRouteResponse'
                },
                example: {
                  jobId: 'job-987'
                }
              }
            }
          },
          '400': {
            description: 'Bad request or validation error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          '404': {
            description: 'Graph not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },
    '/route/status/{jobId}': {
      get: {
        tags: ['Route Optimization'],
        summary: 'Polls status or retrieves results of an optimization job',
        description:
          'Allows clients to poll the computation status and obtain the computed route (totalCost, path, and durationMs) once completed.',
        parameters: [
          {
            name: 'jobId',
            in: 'path',
            required: true,
            description: 'Job identifier returned previously by /route/optimize',
            schema: {
              type: 'string'
            }
          }
        ],
        responses: {
          '200': {
            description: 'Current job status and calculation result',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/RouteStatusResponse'
                },
                examples: {
                  Completed: {
                    summary: 'Job completed with optimal path calculated',
                    value: {
                      status: 'COMPLETED',
                      result: {
                        graphId: 'uuid-123',
                        totalCost: 25.5,
                        path: ['A', 'C', 'D', 'E'],
                        durationMs: 4.2
                      }
                    }
                  },
                  Processing: {
                    summary: 'Job still in progress',
                    value: {
                      status: 'PROCESSING',
                      jobId: 'job-987'
                    }
                  },
                  Failed: {
                    summary: 'Job failed (e.g. unreachable destination)',
                    value: {
                      status: 'FAILED',
                      error: 'No reachable path between A and E matching constraints'
                    }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Job not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Edge: {
        type: 'object',
        required: ['from', 'to', 'cost'],
        properties: {
          from: {
            type: 'string',
            description: 'Origin node identifier',
            example: 'A'
          },
          to: {
            type: 'string',
            description: 'Destination node identifier',
            example: 'B'
          },
          cost: {
            type: 'number',
            description: 'Base edge cost or distance',
            example: 10
          },
          maxWeight: {
            type: 'number',
            description: 'Maximum allowable vehicle gross weight in kg',
            example: 5000
          },
          noHazardous: {
            type: 'boolean',
            description: 'Restricts transit for hazardous material cargo',
            example: true
          },
          trafficMultiplier: {
            type: 'number',
            description: 'Congestion multiplier penalty applied during peak hours',
            example: 1.5
          }
        }
      },
      UploadNetworkPayload: {
        type: 'object',
        required: ['edges'],
        properties: {
          edges: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Edge'
            }
          }
        }
      },
      UploadNetworkResponse: {
        type: 'object',
        properties: {
          graphId: {
            type: 'string',
            format: 'uuid',
            example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
          },
          nodeCount: {
            type: 'integer',
            example: 5
          },
          edgeCount: {
            type: 'integer',
            example: 5
          },
          nodes: {
            type: 'array',
            items: {
              type: 'string'
            },
            example: ['A', 'B', 'C', 'D', 'E']
          }
        }
      },
      GetNetworkNodesResponse: {
        type: 'object',
        properties: {
          graphId: {
            type: 'string',
            example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
          },
          nodes: {
            type: 'array',
            items: {
              type: 'string'
            },
            example: ['A', 'B', 'C', 'D', 'E']
          }
        }
      },
      VehicleProfile: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: 'Vehicle type category',
            example: 'truck'
          },
          weight: {
            type: 'number',
            description: 'Gross vehicle weight in kg',
            example: 4000
          },
          hazardous: {
            type: 'boolean',
            description: 'Whether vehicle carries hazardous cargo',
            example: false
          }
        }
      },
      OptimizeRoutePayload: {
        type: 'object',
        required: ['originNodeId', 'destinationNodeId'],
        properties: {
          originNodeId: {
            type: 'string',
            description: 'Starting node identifier',
            example: 'A'
          },
          destinationNodeId: {
            type: 'string',
            description: 'Destination node identifier',
            example: 'E'
          },
          waypoints: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Ordered list of mandatory intermediate stops',
            example: ['C']
          },
          vehicleProfile: {
            $ref: '#/components/schemas/VehicleProfile'
          },
          departureTime: {
            type: 'string',
            pattern: '^([01]\\d|2[0-3]):([0-5]\\d)$',
            description: 'Departure time in HH:mm format',
            example: '08:00'
          }
        }
      },
      OptimizeRouteResponse: {
        type: 'object',
        properties: {
          jobId: {
            type: 'string',
            example: 'job-987'
          }
        }
      },
      RouteResult: {
        type: 'object',
        properties: {
          graphId: {
            type: 'string',
            example: 'uuid-123'
          },
          totalCost: {
            type: 'number',
            example: 25.5
          },
          path: {
            type: 'array',
            items: {
              type: 'string'
            },
            example: ['A', 'C', 'D', 'E']
          },
          durationMs: {
            type: 'number',
            example: 4.2
          }
        }
      },
      RouteStatusResponse: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
            example: 'COMPLETED'
          },
          jobId: {
            type: 'string',
            example: 'job-987'
          },
          result: {
            $ref: '#/components/schemas/RouteResult'
          },
          error: {
            type: 'string',
            example: 'No reachable path between A and E'
          }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          statusCode: {
            type: 'integer',
            example: 400
          },
          error: {
            type: 'string',
            example: 'Bad Request'
          },
          message: {
            type: 'string',
            example: 'Descriptive error message'
          },
          details: {
            type: 'array',
            items: {
              type: 'object'
            }
          }
        }
      }
    }
  }
};
