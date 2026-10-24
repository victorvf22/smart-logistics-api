import { GraphDefinition } from '../../domain/models/graph.model';
import { INetworkRepository } from '../../domain/repositories/network.repository.interface';

export class InMemoryNetworkRepository implements INetworkRepository {
  private readonly maxCapacity: number;
  private readonly storage: Map<string, GraphDefinition> = new Map();
  private readonly insertionOrder: string[] = [];

  constructor(maxCapacity: number = 5) {
    this.maxCapacity = maxCapacity;
  }

  public async save(graph: GraphDefinition): Promise<void> {
    if (this.storage.has(graph.id)) {
      this.storage.set(graph.id, graph);
      return;
    }

    if (this.insertionOrder.length >= this.maxCapacity) {
      const oldestId = this.insertionOrder.shift();
      if (oldestId) {
        this.storage.delete(oldestId);
      }
    }

    this.storage.set(graph.id, graph);
    this.insertionOrder.push(graph.id);
  }

  public async findById(id: string): Promise<GraphDefinition | null> {
    return this.storage.get(id) || null;
  }

  public async findAll(): Promise<GraphDefinition[]> {
    return Array.from(this.storage.values());
  }

  public async delete(id: string): Promise<boolean> {
    const deleted = this.storage.delete(id);
    if (deleted) {
      const index = this.insertionOrder.indexOf(id);
      if (index !== -1) {
        this.insertionOrder.splice(index, 1);
      }
    }
    return deleted;
  }

  public async count(): Promise<number> {
    return this.storage.size;
  }

  public clear(): void {
    this.storage.clear();
    this.insertionOrder.length = 0;
  }
}
