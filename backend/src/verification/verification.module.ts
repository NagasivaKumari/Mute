import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import { Policy, PolicySchema } from '../schemas/policy.schema';
import { AuditLog, AuditLogSchema } from '../schemas/audit-log.schema';
import { Approval, ApprovalSchema } from '../schemas/approval.schema';
import { Organization, OrganizationSchema } from '../schemas/organization.schema';
import { FlareModule } from '../flare/flare.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Policy.name, schema: PolicySchema },
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: Approval.name, schema: ApprovalSchema },
      { name: Organization.name, schema: OrganizationSchema },
    ]),
    forwardRef(() => FlareModule),
  ],
  controllers: [VerificationController],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
