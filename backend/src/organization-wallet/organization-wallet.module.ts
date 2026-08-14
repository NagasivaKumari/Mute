import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrganizationWalletController } from './organization-wallet.controller';
import { OrganizationWalletService } from './organization-wallet.service';
import { Organization, OrganizationSchema } from '../schemas/organization.schema';
import { Policy, PolicySchema } from '../schemas/policy.schema';
import { Approval, ApprovalSchema } from '../schemas/approval.schema';
import { AuditLog, AuditLogSchema } from '../schemas/audit-log.schema';
import { FlareModule } from '../flare/flare.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
      { name: Policy.name, schema: PolicySchema },
      { name: Approval.name, schema: ApprovalSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
    FlareModule,
  ],
  controllers: [OrganizationWalletController],
  providers: [OrganizationWalletService],
})
export class OrganizationWalletModule {}
