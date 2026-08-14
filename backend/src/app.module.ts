import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ProjectsModule } from './projects/projects.module';
import { AgentsModule } from './agents/agents.module';
import { SessionsModule } from './sessions/sessions.module';
import { PoliciesModule } from './policies/policies.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { AuditModule } from './audit/audit.module';
import { SecretsModule } from './secrets/secrets.module';
import { RuntimeModule } from './runtime-module/runtime.module';
import { FlareModule } from './flare/flare.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { WebSocketModule } from './websocket/websocket.module';
import { VerificationModule } from './verification/verification.module';
import { FilesModule } from './files/files.module';
import { OrganizationWalletModule } from './organization-wallet/organization-wallet.module';
import { DemoModule } from './demo/demo.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
    OrganizationsModule,
    ProjectsModule,
    AgentsModule,
    SessionsModule,
    PoliciesModule,
    ApprovalsModule,
    AuditModule,
    SecretsModule,
    RuntimeModule,
    FlareModule,
    ApiKeysModule,
    WebSocketModule,
    VerificationModule,
    FilesModule,
    OrganizationWalletModule,
    DemoModule,
  ],
})
export class AppModule {}
