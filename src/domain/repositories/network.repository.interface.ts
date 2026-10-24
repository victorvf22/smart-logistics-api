import { GraphDefinition } from '../models/graph.model';

export interface INetworkRepository {
  save(graph: GraphDefinition): Promise<void>;
  findById(id: string): Promise<GraphDefinition | null>;
  findAll(): Promise<GraphDefinition[]>;
  delete(id: string): Promise<boolean>;
  count(): Promise<number>;
}
