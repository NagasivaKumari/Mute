import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AgentsService } from './agents.service';
import { CreateAgentDto, UpdateAgentDto } from './dto/agent.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@Controller('agents')
@UseGuards(JwtAuthGuard)
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateAgentDto) {
    const data = await this.agentsService.create(user.organizationId, dto);
    return { success: true, data, message: 'Agent registered' };
  }

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query('projectId') projectId?: string) {
    const data = await this.agentsService.list(user.organizationId, projectId);
    return { success: true, data };
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.agentsService.getById(user.organizationId, id);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateAgentDto,
  ) {
    const data = await this.agentsService.update(user.organizationId, id, dto);
    return { success: true, data };
  }

  @Post(':id/heartbeat')
  async heartbeat(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.agentsService.heartbeat(user.organizationId, id);
    return { success: true, data };
  }
}
