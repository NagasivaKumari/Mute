import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
  validateSync,
} from 'class-validator';

enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsNumber()
  PORT: number = 3001;

  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsString()
  @IsNotEmpty()
  MONGODB_URI!: string;

  @IsString()
  @MinLength(32)
  JWT_SECRET!: string;

  @IsString()
  JWT_EXPIRES_IN: string = '15m';

  @IsString()
  JWT_REFRESH_EXPIRES_IN: string = '7d';

  @IsString()
  CORS_ORIGIN: string = 'http://localhost:3000';

  @IsOptional()
  @IsUrl({ require_tld: false })
  FLARE_RPC_URL?: string;

  @IsOptional()
  @IsNumber()
  FLARE_CHAIN_ID?: number;

  @IsOptional()
  @IsString()
  FLARE_PRIVATE_KEY?: string;

  @IsOptional()
  @IsString()
  ORG_REGISTRY_ADDRESS?: string;

  @IsOptional()
  @IsString()
  POLICY_REGISTRY_ADDRESS?: string;

  @IsOptional()
  @IsString()
  APPROVAL_REGISTRY_ADDRESS?: string;

  @IsOptional()
  @IsString()
  AUDIT_REGISTRY_ADDRESS?: string;

  @IsOptional()
  @IsString()
  ATTESTATION_REGISTRY_ADDRESS?: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed:\n${errors
        .map((error) => Object.values(error.constraints ?? {}).join(', '))
        .join('\n')}`,
    );
  }

  return validated;
}
