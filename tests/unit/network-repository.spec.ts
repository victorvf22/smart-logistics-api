import { InMemoryNetworkRepository } from '../../src/infrastructure/repositories/in-memory-network.repository';
import { GraphDefinition } from '../../src/domain/models/graph.model';

describe('InMemoryNetworkRepository (Last 5 Networks Constraint)', () => {
  let repository: InMemoryNetworkRepository;

  beforeEach(() => {
    repository = new InMemoryNetworkRepository(5);
  });

  const createDummyGraph = (id: string): GraphDefinition => ({
    id,
    nodes: ['A', 'B'],
    edges: [{ from: 'A', to: 'B', cost: 10 }],
    createdAt: new Date()
  });

  it('should store up to 5 networks simultaneously', async () => {
    for (let i = 1; i <= 5; i++) {
      await repository.save(createDummyGraph(`graph-${i}`));
    }

    expect(await repository.count()).toBe(5);
    for (let i = 1; i <= 5; i++) {
      const graph = await repository.findById(`graph-${i}`);
      expect(graph).not.toBeNull();
      expect(graph?.id).toBe(`graph-${i}`);
    }
  });

  it('should evict the oldest network (FIFO) when saving a 6th network', async () => {
    // Insert graphs 1 through 5
    for (let i = 1; i <= 5; i++) {
      await repository.save(createDummyGraph(`graph-${i}`));
    }

    // Insert 6th graph
    await repository.save(createDummyGraph('graph-6'));

    expect(await repository.count()).toBe(5);
    // graph-1 should have been evicted
    expect(await repository.findById('graph-1')).toBeNull();
    // graph-2 through graph-6 must remain available
    expect(await repository.findById('graph-2')).not.toBeNull();
    expect(await repository.findById('graph-6')).not.toBeNull();
  });

  it('should allow deleting a network and update count correctly', async () => {
    await repository.save(createDummyGraph('g-1'));
    await repository.save(createDummyGraph('g-2'));

    const deleted = await repository.delete('g-1');
    expect(deleted).toBe(true);
    expect(await repository.count()).toBe(1);
    expect(await repository.findById('g-1')).toBeNull();
  });
});
