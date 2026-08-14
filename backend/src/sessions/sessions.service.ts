import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Session, SessionDocument } from '../schemas/session.schema';
import { StartSessionDto } from './dto/session.dto';
import { toApiId, toApiDate } from '../common/utils/mapper.util';
import { ErrorCode } from '@sentinel/types';
import { apiError } from '../common/filters/http-exception.filter';

@Injectable()
export class SessionsService {
  constructor(
    @InjectModel(Session.name) private readonly sessionModel: Model<SessionDocument>,
  ) {}

  async start(orgId: string, userId: string, dto: StartSessionDto) {
    const session = await this.sessionModel.create({
      organizationId: orgId,
      projectId: dto.projectId,
      agentId: dto.agentId,
      userId,
      status: 'active',
      startedAt: new Date(),
    });
    return this.mapSession(session);
  }

  async end(orgId: string, id: string) {
    const session = await this.sessionModel
      .findOne({ _id: id, organizationId: orgId })
      .exec();
    if (!session) apiError(404, ErrorCode.NOT_FOUND, 'Session not found');
    session.status = 'closed';
    session.endedAt = new Date();
    await session.save();
    return this.mapSession(session);
  }

  async list(orgId: string) {
    const sessions = await this.sessionModel
      .find({ organizationId: orgId })
      .sort({ startedAt: -1 })
      .limit(50)
      .exec();
    return sessions.map((s) => this.mapSession(s));
  }

  async getById(orgId: string, id: string) {
    const session = await this.sessionModel
      .findOne({ _id: id, organizationId: orgId })
      .exec();
    if (!session) apiError(404, ErrorCode.NOT_FOUND, 'Session not found');
    return this.mapSession(session);
  }

  async getActive(orgId: string, id: string) {
    const session = await this.sessionModel
      .findOne({ _id: id, organizationId: orgId, status: 'active' })
      .exec();
    if (!session) apiError(401, ErrorCode.SESSION_EXPIRED, 'Session not active');
    return session;
  }

  private mapSession(session: SessionDocument) {
    return {
      id: toApiId(session),
      organizationId: session.organizationId.toString(),
      projectId: session.projectId.toString(),
      agentId: session.agentId.toString(),
      userId: session.userId.toString(),
      status: session.status,
      policyVersion: session.policyVersion,
      startedAt: toApiDate(session.startedAt)!,
      endedAt: toApiDate(session.endedAt),
    };
  }
}
