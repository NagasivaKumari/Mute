import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RegisterSecretDto {
  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsEnum(['api_key', 'password', 'ssh_key', 'env_file', 'other'])
  secretType?: string;

  @IsOptional()
  @IsString()
  envKey?: string;
}

export class RequestSecretDto {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsString()
  @IsNotEmpty()
  secretName!: string;

  @IsString()
  @IsNotEmpty()
  projectId!: string;
}

class EnvVariableDto {
  @IsString()
  key!: string;

  @IsString()
  value!: string;
}

export class ValidateEnvDto {
  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnvVariableDto)
  variables!: EnvVariableDto[];
}

export class AddEnvVariableDto {
  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsNotEmpty()
  secretName!: string;
}

export class RenameEnvVariableDto {
  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @IsString()
  @IsNotEmpty()
  oldKey!: string;

  @IsString()
  @IsNotEmpty()
  newKey!: string;
}

export class RemoveEnvVariableDto {
  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @IsString()
  @IsNotEmpty()
  key!: string;
}
