import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  repositoryUrl?: string;

  @IsOptional()
  @IsString()
  defaultBranch?: string;

  @IsOptional()
  @IsEnum(['cursor', 'claude', 'copilot', 'cli', 'custom'])
  runtimeType?: string;

  @IsOptional()
  @IsEnum(['development', 'staging', 'production'])
  environment?: string;
}

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  repositoryUrl?: string;

  @IsOptional()
  @IsString()
  defaultBranch?: string;

  @IsOptional()
  @IsEnum(['cursor', 'claude', 'copilot', 'cli', 'custom'])
  runtimeType?: string;

  @IsOptional()
  @IsEnum(['development', 'staging', 'production'])
  environment?: string;
}
