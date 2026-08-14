import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { ApiKey, ApiKeyDocument } from '../../schemas/api-key.schema';
import { IS_PUBLIC_KEY, API_KEY_AUTH } from '../decorators/public.decorator';
import { ErrorCode } from '@sentinel/types';
import { apiError } from '../filters/http-exception.filter';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectModel(ApiKey.name) private readonly apiKeyModel: Model<ApiKeyDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    if (request.user) return true;

    const apiKeyHeader = request.headers['x-api-key'] as string | undefined;
    const requiresApiKey = this.reflector.getAllAndOverride<boolean>(API_KEY_AUTH, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!apiKeyHeader) {
      if (requiresApiKey) {
        apiError(401, ErrorCode.AUTH_FAILED, 'API key required');
      }
      return true;
    }

    const prefix = apiKeyHeader.slice(0, 11);
    const candidates = await this.apiKeyModel.find({ keyPrefix: prefix }).exec();

    for (const candidate of candidates) {
      const match = await bcrypt.compare(apiKeyHeader, candidate.keyHash);
      if (match) {
        if (candidate.expiresAt && candidate.expiresAt < new Date()) {
          apiError(401, ErrorCode.AUTH_FAILED, 'API key expired');
        }
        candidate.lastUsedAt = new Date();
        await candidate.save();
        request.apiKeyAuth = {
          organizationId: candidate.organizationId.toString(),
          apiKeyId: candidate._id.toString(),
          permissions: candidate.permissions,
        };
        return true;
      }
    }

    apiError(401, ErrorCode.AUTH_FAILED, 'Invalid API key');
  }
}
