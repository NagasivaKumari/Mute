import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PolicyTargetDto {
  @IsOptional()
  @IsString()
  secretName?: string;

  @IsOptional()
  @IsString()
  actionName?: string;

  @IsOptional()
  @IsString()
  resourcePattern?: string;

  @IsOptional()
  @IsString()
  environmentName?: string;
}

class PolicyConditionsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedAgents?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deniedAgents?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedEnvironments?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deniedEnvironments?: string[];
}

class PolicyControlsDto {
  @IsBoolean()
  allowed!: boolean;

  @IsOptional()
  @IsBoolean()
  approvalRequired?: boolean;

  @IsOptional()
  @IsString()
  approver?: string;

  @IsOptional()
  @IsBoolean()
  reasonRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  auditRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  runtimeAttestationRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  flareVerificationRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  verifiedPolicyRequired?: boolean;

  @IsOptional()
  @IsNumber()
  temporaryAccessDuration?: number;
}

export class CreatePolicyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(['secret_access', 'environment', 'file', 'command', 'database', 'infrastructure', 'deploy', 'git', 'network', 'custom'])
  type!: string;

  @IsOptional()
  @IsEnum(['secrets', 'database', 'infrastructure', 'deployment', 'git', 'files', 'network', 'ai_agent', 'cloud', 'custom'])
  category?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => PolicyTargetDto)
  target!: PolicyTargetDto;

  @IsObject()
  @ValidateNested()
  @Type(() => PolicyConditionsDto)
  conditions!: PolicyConditionsDto;

  @IsObject()
  @ValidateNested()
  @Type(() => PolicyControlsDto)
  controls!: PolicyControlsDto;
}

export class UpdatePolicyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PolicyTargetDto)
  target?: PolicyTargetDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PolicyConditionsDto)
  conditions?: PolicyConditionsDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PolicyControlsDto)
  controls?: PolicyControlsDto;
}
