import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@Controller('approvals')
@UseGuards(JwtAuthGuard)
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
  ) {
    const data = await this.approvalsService.list(user.organizationId, status);
    return { success: true, data };
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.approvalsService.getById(user.organizationId, id);
    return { success: true, data };
  }

  @Post(':id/approve')
  async approve(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.approvalsService.approve(
      user.organizationId,
      id,
      user.userId,
    );
    return { success: true, data, message: 'Approval granted' };
  }

  @Post(':id/reject')
  async reject(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.approvalsService.reject(
      user.organizationId,
      id,
      user.userId,
    );
    return { success: true, data, message: 'Approval rejected' };
  }
}
