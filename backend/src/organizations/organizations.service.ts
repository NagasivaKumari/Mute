import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Organization, OrganizationDocument } from '../schemas/organization.schema';
import { toApiId, toApiDate } from '../common/utils/mapper.util';
import { ErrorCode } from '@sentinel/types';
import { apiError } from '../common/filters/http-exception.filter';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectModel(Organization.name)
    private readonly orgModel: Model<OrganizationDocument>,
  ) {}

  async getById(orgId: string) {
    const org = await this.orgModel.findById(orgId).exec();
    if (!org) apiError(404, ErrorCode.NOT_FOUND, 'Organization not found');
    return this.mapOrg(org);
  }

  async update(orgId: string, updates: { name?: string }) {
    const org = await this.orgModel.findById(orgId).exec();
    if (!org) apiError(404, ErrorCode.NOT_FOUND, 'Organization not found');
    if (updates.name) org.name = updates.name;
    await org.save();
    return this.mapOrg(org);
  }

  private mapOrg(org: OrganizationDocument) {
    return {
      id: toApiId(org),
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      status: org.status,
      ownerId: org.ownerId!.toString(),
      flareOrgId: org.flareOrgId,
      walletAddress: org.walletAddress,
      walletConnected: Boolean(org.walletConnected),
      walletVerified: Boolean(org.walletVerified),
      walletNetwork: org.walletNetwork,
      walletConnectedAt: org.walletConnectedAt?.toISOString() ?? null,
      walletLastVerified: org.walletLastVerified?.toISOString() ?? null,
      createdAt: toApiDate(org.createdAt)!,
      updatedAt: toApiDate(org.updatedAt)!,
    };
  }
}
