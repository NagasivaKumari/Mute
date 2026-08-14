import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface ApiKeyContext {
  organizationId: string;
  apiKeyId: string;
  permissions: string[];
}

export const ApiKeyAuth = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ApiKeyContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.apiKeyAuth;
  },
);
