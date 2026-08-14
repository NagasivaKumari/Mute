import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiKeysService, CreateApiKeyDto } from './api-keys.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@Controller('api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateApiKeyDto) {
    const data = await this.apiKeysService.create(user.organizationId, dto);
    return { success: true, data, message: 'API key created — store it securely' };
  }

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const data = await this.apiKeysService.list(user.organizationId);
    return { success: true, data };
  }

  @Delete(':id')
  async revoke(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.apiKeysService.revoke(user.organizationId, id);
    return { success: true, data, message: 'API key revoked' };
  }
}
