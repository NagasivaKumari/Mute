import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { IsOptional, IsString } from 'class-validator';

class UpdateOrgDto {
  @IsOptional()
  @IsString()
  name?: string;
}

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Get('me')
  async getMe(@CurrentUser() user: AuthUser) {
    const data = await this.orgsService.getById(user.organizationId);
    return { success: true, data };
  }

  @Patch('me')
  async updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateOrgDto) {
    const data = await this.orgsService.update(user.organizationId, dto);
    return { success: true, data };
  }
}
