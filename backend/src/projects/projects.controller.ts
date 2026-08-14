import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateProjectDto) {
    const data = await this.projectsService.create(user.organizationId, dto);
    return { success: true, data, message: 'Project created' };
  }

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const data = await this.projectsService.list(user.organizationId);
    return { success: true, data };
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.projectsService.getById(user.organizationId, id);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    const data = await this.projectsService.update(user.organizationId, id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  async archive(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.projectsService.archive(user.organizationId, id);
    return { success: true, data, message: 'Project archived' };
  }
}
