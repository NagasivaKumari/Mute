import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project, ProjectDocument } from '../schemas/project.schema';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { slugify } from '@sentinel/shared';
import { toApiId, toApiDate } from '../common/utils/mapper.util';
import { ErrorCode } from '@sentinel/types';
import { apiError } from '../common/filters/http-exception.filter';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private readonly projectModel: Model<ProjectDocument>,
  ) {}

  async create(orgId: string, dto: CreateProjectDto) {
    const slug = slugify(dto.name);
    const existing = await this.projectModel
      .findOne({ organizationId: orgId, slug })
      .exec();
    if (existing) {
      apiError(400, ErrorCode.VALIDATION_ERROR, 'Project slug already exists');
    }

    const project = await this.projectModel.create({
      organizationId: orgId,
      name: dto.name,
      slug,
      repositoryUrl: dto.repositoryUrl,
      defaultBranch: dto.defaultBranch ?? 'main',
      runtimeType: dto.runtimeType ?? 'custom',
      environment: dto.environment ?? 'development',
      status: 'active',
    });

    return this.mapProject(project);
  }

  async list(orgId: string) {
    const projects = await this.projectModel
      .find({ organizationId: orgId, status: 'active' })
      .sort({ createdAt: -1 })
      .exec();
    return projects.map((p) => this.mapProject(p));
  }

  async getById(orgId: string, id: string) {
    const project = await this.projectModel
      .findOne({ _id: id, organizationId: orgId })
      .exec();
    if (!project) apiError(404, ErrorCode.NOT_FOUND, 'Project not found');
    return this.mapProject(project);
  }

  async update(orgId: string, id: string, dto: UpdateProjectDto) {
    const project = await this.projectModel
      .findOne({ _id: id, organizationId: orgId })
      .exec();
    if (!project) apiError(404, ErrorCode.NOT_FOUND, 'Project not found');

    if (dto.name) project.name = dto.name;
    if (dto.repositoryUrl !== undefined) project.repositoryUrl = dto.repositoryUrl;
    if (dto.defaultBranch) project.defaultBranch = dto.defaultBranch;
    if (dto.runtimeType) project.runtimeType = dto.runtimeType;
    if (dto.environment) project.environment = dto.environment;
    await project.save();
    return this.mapProject(project);
  }

  async archive(orgId: string, id: string) {
    const project = await this.projectModel
      .findOne({ _id: id, organizationId: orgId })
      .exec();
    if (!project) apiError(404, ErrorCode.NOT_FOUND, 'Project not found');
    project.status = 'archived';
    await project.save();
    return this.mapProject(project);
  }

  private mapProject(project: ProjectDocument) {
    return {
      id: toApiId(project),
      organizationId: project.organizationId.toString(),
      name: project.name,
      slug: project.slug,
      repositoryUrl: project.repositoryUrl,
      defaultBranch: project.defaultBranch,
      runtimeType: project.runtimeType,
      environment: project.environment,
      status: project.status,
      createdAt: toApiDate(project.createdAt)!,
      updatedAt: toApiDate(project.updatedAt)!,
    };
  }
}
