import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class EvaluateDto {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsString()
  @IsNotEmpty()
  action!: string;

  @IsString()
  @IsNotEmpty()
  resource!: string;

  @IsObject()
  context!: {
    agentId: string;
    projectId: string;
  };
}

export class ResolveSecretDto {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsString()
  @IsNotEmpty()
  secretName!: string;

  @IsObject()
  context!: {
    agentId: string;
    projectId: string;
  };
}

export class AuthorizeDangerousDto {
  @IsString()
  @IsNotEmpty()
  operationId!: string;

  @IsString()
  @IsNotEmpty()
  operationType!: string;

  @IsString()
  @IsNotEmpty()
  resource!: string;

  @IsString()
  @IsNotEmpty()
  requestHash!: string;
}
