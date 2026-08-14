import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CapabilityDto {
  @IsString()
  name!: string;

  @IsEnum(['allow', 'deny', 'approval_required'])
  mode!: string;
}

export class CreateAgentDto {
  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsEnum(['anthropic', 'openai', 'google', 'local', 'custom'])
  provider?: string;

  @IsString()
  @IsNotEmpty()
  agentType!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CapabilityDto)
  capabilities?: CapabilityDto[];
}

export class UpdateAgentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(['anthropic', 'openai', 'google', 'local', 'custom'])
  provider?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CapabilityDto)
  capabilities?: CapabilityDto[];

  @IsOptional()
  @IsEnum(['online', 'offline', 'revoked'])
  status?: string;
}
