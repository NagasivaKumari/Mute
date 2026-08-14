import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RuntimeController } from './runtime.controller';
import { RuntimeService } from './runtime.service';
import { SessionsModule } from '../sessions/sessions.module';
import { PoliciesModule } from '../policies/policies.module';
import { ApprovalsModule } from '../approvals/approvals.module';
import { AgentsModule } from '../agents/agents.module';
import { AuditModule } from '../audit/audit.module';
import { Policy, PolicySchema } from '../schemas/policy.schema';
import { Project, ProjectSchema } from '../schemas/project.schema';
import { Secret, SecretSchema } from '../schemas/secret.schema';
import { Organization, OrganizationSchema } from '../schemas/organization.schema';
import { FlareModule } from '../flare/flare.module';
import { FceModule } from '../fce/fce.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Policy.name, schema: PolicySchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Secret.name, schema: SecretSchema },
      { name: Organization.name, schema: OrganizationSchema },
    ]),
    SessionsModule,
    PoliciesModule,
    ApprovalsModule,
    AgentsModule,
    AuditModule,
    forwardRef(() => FlareModule),
    FceModule,
  ],
  controllers: [RuntimeController],
  providers: [RuntimeService],
  exports: [RuntimeService],
})
export class RuntimeModule {}
