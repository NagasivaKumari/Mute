import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { SessionsService } from './sessions.service';
import { StartSessionDto } from './dto/session.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { ApiKeyAuth } from '../common/decorators/api-key-auth.decorator';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  async start(@Req() req: Request, @Body() dto: StartSessionDto) {
    const orgId =
      (req as Request & { user?: AuthUser }).user?.organizationId ??
      (req as Request & { apiKeyAuth?: { organizationId: string } }).apiKeyAuth
        ?.organizationId;
    const userId =
      (req as Request & { user?: AuthUser }).user?.userId ??
      (req as Request & { apiKeyAuth?: { organizationId: string } }).apiKeyAuth
        ?.organizationId;

    if (!orgId || !userId) {
      return { success: false, error: { code: 'AUTH_FAILED', message: 'Auth required' } };
    }

    const data = await this.sessionsService.start(orgId, userId, dto);
    return { success: true, data, message: 'Session started' };
  }

  @Post(':id/end')
  async end(@Req() req: Request, @Param('id') id: string) {
    const orgId =
      (req as Request & { user?: AuthUser }).user?.organizationId ??
      (req as Request & { apiKeyAuth?: { organizationId: string } }).apiKeyAuth
        ?.organizationId;
    if (!orgId) {
      return { success: false, error: { code: 'AUTH_FAILED', message: 'Auth required' } };
    }
    const data = await this.sessionsService.end(orgId, id);
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const data = await this.sessionsService.list(user.organizationId);
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.sessionsService.getById(user.organizationId, id);
    return { success: true, data };
  }
}
