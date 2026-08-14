import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ErrorCode } from '@sentinel/types';
import { apiError } from '../filters/http-exception.filter';

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

@Injectable()
export class RateLimitGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const key = request.ip ?? 'unknown';
    const now = Date.now();
    const windowMs = 60_000;
    const limit = request.user ? 100 : 10;

    const entry = rateLimitStore.get(key);
    if (!entry || entry.resetAt < now) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }

    entry.count++;
    if (entry.count > limit) {
      apiError(429, ErrorCode.VALIDATION_ERROR, 'Rate limit exceeded');
    }
    return true;
  }
}
