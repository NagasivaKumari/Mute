import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Agent, AgentDocument } from '../schemas/agent.schema';
import { CreateAgentDto, UpdateAgentDto } from './dto/agent.dto';
import { toApiId, toApiDate } from '../common/utils/mapper.util';
import { ErrorCode } from '@sentinel/types';
import { apiError } from '../common/filters/http-exception.filter';

@Injectable()
export class AgentsService {
  constructor(
    @InjectModel(Agent.name) private readonly agentModel: Model<AgentDocument>,
  ) {}

  async create(orgId: string, dto: CreateAgentDto) {
    const agent = await this.agentModel.create({
      organizationId: orgId,
      projectId: dto.projectId,
      name: dto.name,
      provider: dto.provider ?? 'custom',
      agentType: dto.agentType,
      capabilities: dto.capabilities ?? [
        { name: 'READ_FILE', mode: 'approval_required' },
        { name: 'WRITE_FILE', mode: 'allow' },
        { name: 'EXEC_TERMINAL', mode: 'approval_required' },
        { name: 'READ_SECRET', mode: 'approval_required' },
      ],
      status: 'offline',
      registeredAt: new Date(),
    });
    return this.mapAgent(agent);
  }

  async list(orgId: string, projectId?: string) {
    const filter: Record<string, unknown> = { organizationId: orgId };
    if (projectId) filter.projectId = projectId;
    const agents = await this.agentModel.find(filter).sort({ registeredAt: -1 }).exec();
    return agents.map((a) => this.mapAgent(a));
  }

  async getById(orgId: string, id: string) {
    const agent = await this.agentModel.findOne({ _id: id, organizationId: orgId }).exec();
    if (!agent) apiError(404, ErrorCode.NOT_FOUND, 'Agent not found');
    return this.mapAgent(agent);
  }

  async update(orgId: string, id: string, dto: UpdateAgentDto) {
    const agent = await this.agentModel.findOne({ _id: id, organizationId: orgId }).exec();
    if (!agent) apiError(404, ErrorCode.NOT_FOUND, 'Agent not found');
    if (dto.name) agent.name = dto.name;
    if (dto.provider) agent.provider = dto.provider;
    if (dto.capabilities) agent.capabilities = dto.capabilities;
    if (dto.status) agent.status = dto.status;
    await agent.save();
    return this.mapAgent(agent);
  }

  async heartbeat(orgId: string, id: string) {
    const agent = await this.agentModel.findOne({ _id: id, organizationId: orgId }).exec();
    if (!agent) apiError(404, ErrorCode.NOT_FOUND, 'Agent not found');
    agent.lastSeen = new Date();
    agent.status = 'online';
    await agent.save();
    return this.mapAgent(agent);
  }

  private mapAgent(agent: AgentDocument) {
    return {
      id: toApiId(agent),
      organizationId: agent.organizationId.toString(),
      projectId: agent.projectId.toString(),
      name: agent.name,
      provider: agent.provider,
      agentType: agent.agentType,
      capabilities: agent.capabilities,
      status: agent.status,
      lastSeen: toApiDate(agent.lastSeen),
      registeredAt: toApiDate(agent.registeredAt)!,
    };
  }
}
