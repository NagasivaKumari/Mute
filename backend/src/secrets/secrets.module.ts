import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SecretsController } from './secrets.controller';
import { SecretsService } from './secrets.service';
import { SecretMaskingService } from './secret-masking.service';
import { Secret, SecretSchema } from '../schemas/secret.schema';
import { Policy, PolicySchema } from '../schemas/policy.schema';
import { Session, SessionSchema } from '../schemas/session.schema';
import { Agent, AgentSchema } from '../schemas/agent.schema';
import { Project, ProjectSchema } from '../schemas/project.schema';
import { FlareModule } from '../flare/flare.module';
import { PoliciesModule } from '../policies/policies.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Secret.name, schema: SecretSchema },
      { name: Policy.name, schema: PolicySchema },
      { name: Session.name, schema: SessionSchema },
      { name: Agent.name, schema: AgentSchema },
      { name: Project.name, schema: ProjectSchema },
    ]),
    forwardRef(() => FlareModule),
    forwardRef(() => PoliciesModule),
    AuditModule,
  ],
  controllers: [SecretsController],
  providers: [SecretsService, SecretMaskingService],
  exports: [SecretsService, SecretMaskingService],
})
export class SecretsModule {}
