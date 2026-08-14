import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { User, UserDocument } from '../../schemas/user.schema';
import { ErrorCode } from '@sentinel/types';
import { apiError } from '../filters/http-exception.filter';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    if (request.apiKeyAuth) return true;

    const authHeader = request.headers.authorization as string | undefined;

    if (!authHeader?.startsWith('Bearer ')) {
      apiError(401, ErrorCode.AUTH_FAILED, 'Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('jwt.secret'),
      }) as { sub: string; orgId: string; email: string; role: string };

      const user = await this.userModel.findById(payload.sub).exec();
      if (!user || user.status !== 'active') {
        apiError(401, ErrorCode.AUTH_FAILED, 'User not found or inactive');
      }

      request.user = {
        userId: user._id.toString(),
        organizationId: user.organizationId.toString(),
        email: user.email,
        role: user.role,
      };
      return true;
    } catch {
      apiError(401, ErrorCode.AUTH_FAILED, 'Invalid or expired token');
    }
  }
}
