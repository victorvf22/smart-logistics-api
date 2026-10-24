import request from 'supertest';
import { createApp } from '../../src/app';

describe('Smart Logistics Routing API Integration Tests', () => {
  let app: any;
  let sampleEdges: any[];

  beforeEach(() => {
    app = createApp();
    sampleEdges = [
      { from: 'A', to: 'B', cost: 10, maxWeight: 10000, noHazardous: false, trafficMultiplier: 1.0 },
      { from: 'A', to: 'C', cost: 15, maxWeight: 5000, noHazardous: true, trafficMultiplier: 1.5 },
      { from: 'B', to: 'D', cost: 12, maxWeight: 10000, noHazardous: false, trafficMultiplier: 2.0 },
      { from: 'C', to: 'D', cost: 5, maxWeight: 5000, noHazardous: true, trafficMultiplier: 1.0 },
      { from: 'D', to: 'E', cost: 10, maxWeight: 8000, noHazardous: false, trafficMultiplier: 1.2 }
    ];
  });

  // Polling helper to await background job completion
  const pollJobStatus = async (jobId: string, maxAttempts = 20, delayMs = 50) => {
    for (let i = 0; i < maxAttempts; i++) {
      const res = await request(app).get(`/route/status/${jobId}`);
      if (res.body.status === 'COMPLETED' || res.body.status === 'FAILED') {
        return res;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    return await request(app).get(`/route/status/${jobId}`);
  };

  describe('Health Check and Swagger UI Documentation', () => {
    it('GET /health should respond 200 with status UP', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
    });

    it('GET /docs should respond 200 and serve Swagger UI HTML', async () => {
      const res = await request(app).get('/docs/');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Swagger UI');
    });

    it('GET /docs-json should return OpenAPI 3.0 specification with all documented paths', async () => {
      const res = await request(app).get('/docs-json');
      expect(res.status).toBe(200);
      expect(res.body.openapi).toBe('3.0.3');
      expect(res.body.paths).toHaveProperty('/network/upload');
      expect(res.body.paths).toHaveProperty('/network/nodes/{id}');
      expect(res.body.paths).toHaveProperty('/route/optimize/{id}');
      expect(res.body.paths).toHaveProperty('/route/status/{jobId}');
    });
  });

  describe('Network Management Endpoints', () => {
    it('POST /network/upload should persist a new graph and return graphId with extracted nodes', async () => {
      const res = await request(app)
        .post('/network/upload')
        .send({ edges: sampleEdges });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('graphId');
      expect(res.body.nodeCount).toBe(5);
      expect(res.body.edgeCount).toBe(5);
      expect(res.body.nodes).toEqual(['A', 'B', 'C', 'D', 'E']);
    });

    it('POST /network/upload should fail with 400 when payload is invalid', async () => {
      const res = await request(app)
        .post('/network/upload')
        .send({ edges: [] });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Bad Request');
    });

    it('GET /network/nodes/:id should return defined nodes for an existing graph', async () => {
      const uploadRes = await request(app)
        .post('/network/upload')
        .send({ edges: sampleEdges });
      const graphId = uploadRes.body.graphId;

      const res = await request(app).get(`/network/nodes/${graphId}`);
      expect(res.status).toBe(200);
      expect(res.body.graphId).toBe(graphId);
      expect(res.body.nodes).toEqual(['A', 'B', 'C', 'D', 'E']);
    });

    it('GET /network/nodes/:id should return 404 if graph does not exist', async () => {
      const res = await request(app).get('/network/nodes/inexistent-uuid-1234');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Not Found');
    });
  });

  describe('Route Optimization Endpoints (Asynchronous Flow)', () => {
    let graphId: string;

    beforeEach(async () => {
      const uploadRes = await request(app)
        .post('/network/upload')
        .send({ edges: sampleEdges });
      graphId = uploadRes.body.graphId;
    });

    it('Flow Case 1: light vehicle calculates path A -> C -> D -> E with cost 30', async () => {
      // 1. Submit async calculation job
      const postRes = await request(app)
        .post(`/route/optimize/${graphId}`)
        .send({
          originNodeId: 'A',
          destinationNodeId: 'E',
          vehicleProfile: { type: 'van', weight: 3000, hazardous: false },
          departureTime: '12:00'
        });

      expect(postRes.status).toBe(202);
      expect(postRes.body).toHaveProperty('jobId');

      // 2. Poll job status until completed
      const statusRes = await pollJobStatus(postRes.body.jobId);

      expect(statusRes.status).toBe(200);
      expect(statusRes.body.status).toBe('COMPLETED');
      expect(statusRes.body.result).toBeDefined();
      expect(statusRes.body.result.path).toEqual(['A', 'C', 'D', 'E']);
      expect(statusRes.body.result.totalCost).toBe(30);
      expect(statusRes.body.result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('Flow Case 2 (Weight Restriction): 6000kg truck reroutes via A -> B -> D -> E with cost 32', async () => {
      const postRes = await request(app)
        .post(`/route/optimize/${graphId}`)
        .send({
          originNodeId: 'A',
          destinationNodeId: 'E',
          vehicleProfile: { type: 'truck', weight: 6000, hazardous: false },
          departureTime: '12:00'
        });

      expect(postRes.status).toBe(202);
      const statusRes = await pollJobStatus(postRes.body.jobId);

      expect(statusRes.status).toBe(200);
      expect(statusRes.body.status).toBe('COMPLETED');
      expect(statusRes.body.result.path).toEqual(['A', 'B', 'D', 'E']);
      expect(statusRes.body.result.totalCost).toBe(32);
    });

    it('Flow Case 3 (Hazardous Constraint): hazardous truck reroutes via A -> B -> D -> E with cost 32', async () => {
      const postRes = await request(app)
        .post(`/route/optimize/${graphId}`)
        .send({
          originNodeId: 'A',
          destinationNodeId: 'E',
          vehicleProfile: { type: 'truck', weight: 3000, hazardous: true },
          departureTime: '12:00'
        });

      expect(postRes.status).toBe(202);
      const statusRes = await pollJobStatus(postRes.body.jobId);

      expect(statusRes.status).toBe(200);
      expect(statusRes.body.status).toBe('COMPLETED');
      expect(statusRes.body.result.path).toEqual(['A', 'B', 'D', 'E']);
      expect(statusRes.body.result.totalCost).toBe(32);
    });

    it('Flow with Multi-Stop Waypoints: forces route through node B', async () => {
      const postRes = await request(app)
        .post(`/route/optimize/${graphId}`)
        .send({
          originNodeId: 'A',
          destinationNodeId: 'E',
          waypoints: ['B'],
          departureTime: '12:00'
        });

      expect(postRes.status).toBe(202);
      const statusRes = await pollJobStatus(postRes.body.jobId);

      expect(statusRes.status).toBe(200);
      expect(statusRes.body.status).toBe('COMPLETED');
      expect(statusRes.body.result.path).toEqual(['A', 'B', 'D', 'E']);
    });

    it('Unreachable Destination Handling: job reports FAILED status', async () => {
      const postRes = await request(app)
        .post(`/route/optimize/${graphId}`)
        .send({
          originNodeId: 'A',
          destinationNodeId: 'E',
          vehicleProfile: { weight: 50000 } // Exceeds all edge weight limits
        });

      expect(postRes.status).toBe(202);
      const statusRes = await pollJobStatus(postRes.body.jobId);

      expect(statusRes.status).toBe(200);
      expect(statusRes.body.status).toBe('FAILED');
      expect(statusRes.body.error).toContain('No reachable path');
    });

    it('POST /route/optimize/:id should return 404 when graphId does not exist', async () => {
      const res = await request(app)
        .post('/route/optimize/non-existent-graph')
        .send({
          originNodeId: 'A',
          destinationNodeId: 'E'
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Not Found');
    });

    it('GET /route/status/:jobId should return 404 when jobId does not exist', async () => {
      const res = await request(app).get('/route/status/non-existent-job-999');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Not Found');
    });
  });
});
