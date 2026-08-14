import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@Controller('verification')
@UseGuards(JwtAuthGuard)
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post('audit/:id')
  async verifyAudit(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    const data = await this.verificationService.verifyAuditEntry(
      user.organizationId,
      id,
    );
    return { success: true, data };
  }

  @Post('policy/:id')
  async verifyPolicy(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    const data = await this.verificationService.verifyPolicyRecord(
      user.organizationId,
      id,
    );
    return { success: true, data };
  }

  @Post('approval/:id')
  async verifyApproval(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    const data = await this.verificationService.verifyApprovalRecord(
      user.organizationId,
      id,
    );
    return { success: true, data };
  }

  @Post('organization')
  async verifyOrganization(@CurrentUser() user: AuthUser) {
    const data = await this.verificationService.verifyOrganizationRecord(
      user.organizationId,
    );
    return { success: true, data };
  }

  @Post('secret-resolution/:auditId')
  async verifySecretResolution(
    @CurrentUser() user: AuthUser,
    @Param('auditId') auditId: string,
  ) {
    const data = await this.verificationService.verifySecretResolution(
      user.organizationId,
      auditId,
    );
    return { success: true, data };
  }

  @Get('summary')
  async getSummary(@CurrentUser() user: AuthUser) {
    const data = await this.verificationService.getVerificationSummary(
      user.organizationId,
    );
    return { success: true, data };
  }
}
