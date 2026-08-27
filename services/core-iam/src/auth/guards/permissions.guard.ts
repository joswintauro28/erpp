import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization token');
    }

    const token = authHeader.substring(7);
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      
      // Attach user info payload to request object for downstream controllers
      request.user = payload;

      // DENY-BY-DEFAULT: routes without @Permissions() are locked.
      // This prevents accidentally unprotected admin endpoints (audit C1).
      // Login/register/refresh/logout are NOT guarded — they are free to call.
      if (!requiredPermissions || requiredPermissions.length === 0) {
        throw new UnauthorizedException('This endpoint requires explicit @Permissions() annotation');
      }

      // Organization Owners (admins/super-admins) bypass all permission restrictions
      if (payload.role === 'Organization Owner') {
        return true;
      }

      // Check if user holds at least one of the required permission codes
      const userPermissions: string[] = payload.permissions || [];
      const hasPermission = requiredPermissions.some(perm => userPermissions.includes(perm));
      
      if (!hasPermission) {
        throw new UnauthorizedException('Insufficient permissions');
      }
      return true;
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired authorization token');
    }
  }
}
