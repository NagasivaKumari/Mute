import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PoliciesService } from './policies.service';
import { CreatePolicyDto, UpdatePolicyDto } from './dto/policy.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@Controller('policies')
@UseGuards(JwtAuthGuard)
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreatePolicyDto) {
    const data = await this.policiesService.create(
      user.organizationId,
      user.userId,
      dto,
    );
    return { success: true, data, message: 'Policy created' };
  }

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query('projectId') projectId?: string, @Query('category') category?: string) {
    const data = await this.policiesService.list(user.organizationId, projectId, undefined, category);
    return { success: true, data };
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.policiesService.getById(user.organizationId, id);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePolicyDto,
  ) {
    const data = await this.policiesService.update(user.organizationId, id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  async disable(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.policiesService.disable(user.organizationId, id);
    return { success: true, data, message: 'Policy disabled' };
  }

  @Post(':id/clone')
  async clone(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.policiesService.clone(user.organizationId, user.userId, id);
    return { success: true, data, message: 'Policy cloned' };
  }
}
