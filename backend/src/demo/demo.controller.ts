import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SecretDetector } from '@sentinel/shared';
import { AuditService } from '../audit/audit.service';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

function sampleEnv(): string {
  return `# Application Configuration
PORT=3001
NODE_ENV=production

# Database
DATABASE_URL=
MONGODB_URI=

# Authentication
JWT_SECRET=
API_KEY=

# AI Providers
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Flare
FLARE_PRIVATE_KEY=
PRIVATE_KEY=

# Other
LOG_LEVEL=debug
REDIS_URL=`;
}

@Controller('demo')
@UseGuards(JwtAuthGuard)
export class DemoController {
  constructor(private readonly auditService: AuditService) {}

  @Post('run')
  async run(@CurrentUser() user: AuthUser) {
    const content = sampleEnv();
    const result = SecretDetector.maskContent(content);

    await this.auditService.create({
      organizationId: user.organizationId,
      action: 'FILE_READ',
      resource: 'sample.env (demo)',
      decision: 'SANITIZED_RETURN',
      event: 'FILE_READ',
      secretsFound: result.found,
      secretsMasked: result.maskedCount,
      secretsExposed: result.found - result.maskedCount,
      agentName: 'Demo',
    });

    return {
      success: true,
      data: {
        secretsFound: result.found,
        secretsMasked: result.maskedCount,
        maskedKeys: result.detected,
        original: content,
        sanitized: result.masked,
      },
    };
  }
}
