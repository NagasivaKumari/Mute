import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuditService, CreateAuditDto } from './audit.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { ErrorCode } from '@sentinel/types';
import { apiError } from '../common/filters/http-exception.filter';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

class CreateAuditBody {
  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @IsString()
  @IsNotEmpty()
  agentId!: string;

  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsString()
  @IsNotEmpty()
  action!: string;

  @IsString()
  @IsNotEmpty()
  resource!: string;

  @IsString()
  @IsNotEmpty()
  decision!: string;

  @IsOptional()
  @IsString()
  policyId?: string;

  @IsOptional()
  @IsNumber()
  policyVersion?: number;

  @IsOptional()
  @IsString()
  policyHash?: string;

  @IsOptional()
  @IsNumber()
  riskScore?: number;
}

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() body: CreateAuditBody) {
    if (user.role !== 'owner' && user.role !== 'admin') {
      apiError(403, ErrorCode.FORBIDDEN, 'Only owners and admins can create audit records');
    }

    const dto: CreateAuditDto = { organizationId: user.organizationId, ...body };
    const data = await this.auditService.create(dto);
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async search(
    @CurrentUser() user: AuthUser,
    @Query('projectId') projectId?: string,
    @Query('agentId') agentId?: string,
    @Query('decision') decision?: string,
    @Query('event') event?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.auditService.search(user.organizationId, {
      projectId,
      agentId,
      decision,
      event,
      from,
      to,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.auditService.getById(user.organizationId, id);
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Post('verify')
  async verify(
    @CurrentUser() user: AuthUser,
    @Body('auditId') auditId: string,
  ) {
    const data = await this.auditService.verify(user.organizationId, auditId);
    return { success: true, data };
  }
}
