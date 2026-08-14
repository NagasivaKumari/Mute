import { Controller, Get, Post, Body, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { RuntimeService } from './runtime.service';
import { EvaluateDto, ResolveSecretDto, AuthorizeDangerousDto } from './dto/runtime.dto';
import { AuthUser } from '../common/decorators/current-user.decorator';

@Controller('runtime')
export class RuntimeController {
  constructor(private readonly runtimeService: RuntimeService) {}

  private getAuth(req: Request): { orgId: string; userId: string } | null {
    const user = (req as Request & { user?: AuthUser }).user;
    const apiKey = (req as Request & { apiKeyAuth?: { organizationId: string } })
      .apiKeyAuth;
    const orgId = user?.organizationId ?? apiKey?.organizationId;
    const userId = user?.userId ?? apiKey?.organizationId;
    if (!orgId || !userId) return null;
    return { orgId, userId };
  }

  @Post('evaluate')
  async evaluate(@Req() req: Request, @Body() dto: EvaluateDto) {
    const auth = this.getAuth(req);
    if (!auth) {
      return { success: false, error: { code: 'AUTH_FAILED', message: 'Auth required' } };
    }
    const data = await this.runtimeService.evaluate(auth.orgId, auth.userId, dto);
    return { success: true, data };
  }

  @Post('resolve-secret')
  async resolveSecret(@Req() req: Request, @Body() dto: ResolveSecretDto) {
    const auth = this.getAuth(req);
    if (!auth) {
      return { success: false, error: { code: 'AUTH_FAILED', message: 'Auth required' } };
    }
    const data = await this.runtimeService.resolveSecret(auth.orgId, auth.userId, dto);
    return { success: true, data };
  }

  @Get('policies')
  async policies(@Req() req: Request, @Query('projectId') projectId?: string) {
    const auth = this.getAuth(req);
    if (!auth) {
      return { success: false, error: { code: 'AUTH_FAILED', message: 'Auth required' } };
    }
    const data = await this.runtimeService.getPolicies(auth.orgId, projectId);
    return { success: true, data };
  }

  @Get('vault-nonce')
  async vaultNonce(@Req() req: Request) {
    const auth = this.getAuth(req);
    if (!auth) {
      return { success: false, error: { code: 'AUTH_FAILED', message: 'Auth required' } };
    }
    const data = await this.runtimeService.getVaultNonce(auth.orgId);
    return { success: true, data };
  }

  @Post('authorize-dangerous')
  async authorizeDangerous(@Req() req: Request, @Body() dto: AuthorizeDangerousDto) {
    const auth = this.getAuth(req);
    if (!auth) {
      return { success: false, error: { code: 'AUTH_FAILED', message: 'Auth required' } };
    }
    const data = await this.runtimeService.authorizeDangerous(
      auth.orgId, dto.operationId, dto.operationType, dto.resource, dto.requestHash,
    );
    return { success: true, data };
  }
}
