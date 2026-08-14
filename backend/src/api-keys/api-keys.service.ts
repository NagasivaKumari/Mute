import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'node:crypto';
import { ApiKey, ApiKeyDocument } from '../schemas/api-key.schema';
import { generateApiKeyPrefix } from '@sentinel/shared';
import { toApiId, toApiDate } from '../common/utils/mapper.util';
import { ErrorCode } from '@sentinel/types';
import { apiError } from '../common/filters/http-exception.filter';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  expiresAt?: string;
}

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectModel(ApiKey.name) private readonly apiKeyModel: Model<ApiKeyDocument>,
  ) {}

  async create(orgId: string, dto: CreateApiKeyDto) {
    const prefix = generateApiKeyPrefix();
    const secret = crypto.randomBytes(24).toString('hex');
    const rawKey = `${prefix}${secret}`;
    const keyHash = await bcrypt.hash(rawKey, 12);

    const apiKey = await this.apiKeyModel.create({
      organizationId: orgId,
      name: dto.name,
      keyHash,
      keyPrefix: prefix,
      permissions: ['runtime'],
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      createdAt: new Date(),
    });

    return {
      id: toApiId(apiKey),
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      key: rawKey,
      permissions: apiKey.permissions,
      expiresAt: toApiDate(apiKey.expiresAt),
      createdAt: toApiDate(apiKey.createdAt)!,
    };
  }

  async list(orgId: string) {
    const keys = await this.apiKeyModel
      .find({ organizationId: orgId, revoked: false })
      .sort({ createdAt: -1 })
      .exec();
    return keys.map((k) => ({
      id: toApiId(k),
      name: k.name,
      keyPrefix: k.keyPrefix,
      permissions: k.permissions,
      expiresAt: toApiDate(k.expiresAt),
      lastUsedAt: toApiDate(k.lastUsedAt),
      createdAt: toApiDate(k.createdAt)!,
    }));
  }

  async revoke(orgId: string, id: string) {
    const key = await this.apiKeyModel
      .findOne({ _id: id, organizationId: orgId })
      .exec();
    if (!key) apiError(404, ErrorCode.NOT_FOUND, 'API key not found');
    key.revoked = true;
    await key.save();
    return { id, revoked: true };
  }
}
