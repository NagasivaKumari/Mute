import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { SecretsService } from './secrets.service';
import {
  RegisterSecretDto,
  RequestSecretDto,
  ValidateEnvDto,
  AddEnvVariableDto,
  RenameEnvVariableDto,
  RemoveEnvVariableDto,
} from './dto/secret.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@Controller('secrets')
export class SecretsController {
  constructor(private readonly secretsService: SecretsService) {}

  private getOrgId(req: Request): string | undefined {
    return (
      (req as Request & { user?: AuthUser }).user?.organizationId ??
      (req as Request & { apiKeyAuth?: { organizationId: string } }).apiKeyAuth
        ?.organizationId
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async register(@CurrentUser() user: AuthUser, @Body() dto: RegisterSecretDto) {
    const data = await this.secretsService.register(user.organizationId, dto);
    return { success: true, data, message: 'Secret metadata registered' };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query('projectId') projectId?: string,
  ) {
    const data = await this.secretsService.list(user.organizationId, projectId);
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Get('env/:projectId')
  async getEnvReferences(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
  ) {
    const data = await this.secretsService.getEnvReferences(
      user.organizationId,
      projectId,
    );
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Post('env/validate')
  async validateEnv(@CurrentUser() user: AuthUser, @Body() dto: ValidateEnvDto) {
    const data = await this.secretsService.validateEnv(user.organizationId, dto);
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Post('env/variables')
  async addVariable(@CurrentUser() user: AuthUser, @Body() dto: AddEnvVariableDto) {
    const data = await this.secretsService.addEnvVariable(user.organizationId, dto);
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Post('env/variables/rename')
  async renameVariable(
    @CurrentUser() user: AuthUser,
    @Body() dto: RenameEnvVariableDto,
  ) {
    const data = await this.secretsService.renameEnvVariable(user.organizationId, dto);
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Post('env/variables/remove')
  async removeVariable(
    @CurrentUser() user: AuthUser,
    @Body() dto: RemoveEnvVariableDto,
  ) {
    const data = await this.secretsService.removeEnvVariable(user.organizationId, dto);
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.secretsService.getById(user.organizationId, id);
    return { success: true, data };
  }

  @Post('request')
  async requestAccess(@Req() req: Request, @Body() dto: RequestSecretDto) {
    const orgId = this.getOrgId(req);
    if (!orgId) {
      return { success: false, error: { code: 'AUTH_FAILED', message: 'Auth required' } };
    }
    const data = await this.secretsService.requestAccess(orgId, dto);
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async revoke(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.secretsService.revoke(user.organizationId, id);
    return { success: true, data, message: 'Secret revoked' };
  }
}
