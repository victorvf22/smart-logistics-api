import { v4 as uuidv4 } from 'uuid';
import { GraphDefinition } from '../../domain/models/graph.model';
import { INetworkRepository } from '../../domain/repositories/network.repository.interface';
import {
  UploadNetworkDto,
  UploadNetworkResponseDto,
  GetNetworkNodesResponseDto
} from '../dtos/network.dto';

export class NetworkNotFoundError extends Error {
  constructor(id: string) {
    super(`Graph with ID '${id}' was not found.`);
    this.name = 'NetworkNotFoundError';
  }
}

export class NetworkService {
  constructor(private readonly networkRepository: INetworkRepository) {}

  public async uploadGraph(dto: UploadNetworkDto): Promise<UploadNetworkResponseDto> {
    const nodeSet = new Set<string>();
    for (const edge of dto.edges) {
      nodeSet.add(edge.from);
      nodeSet.add(edge.to);
    }

    const nodes = Array.from(nodeSet).sort();
    const graphId = uuidv4();

    const graph: GraphDefinition = {
      id: graphId,
      edges: dto.edges,
      nodes,
      createdAt: new Date()
    };

    await this.networkRepository.save(graph);

    return {
      graphId,
      nodeCount: nodes.length,
      edgeCount: dto.edges.length,
      nodes
    };
  }

  public async getNodes(graphId: string): Promise<GetNetworkNodesResponseDto> {
    const graph = await this.networkRepository.findById(graphId);
    if (!graph) {
      throw new NetworkNotFoundError(graphId);
    }

    return {
      graphId: graph.id,
      nodes: graph.nodes
    };
  }

  public async getGraph(graphId: string): Promise<GraphDefinition> {
    const graph = await this.networkRepository.findById(graphId);
    if (!graph) {
      throw new NetworkNotFoundError(graphId);
    }
    return graph;
  }
}
