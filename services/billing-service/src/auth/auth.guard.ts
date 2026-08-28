import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";

export interface JwtPayload {
  sub: string;
  email: string;
  type: string;
  user_id: number;
  role: string;
  organization_id: number;
  organization_name: string;
  permissions: string[];
  iat: number;
  exp: number;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException("Missing or invalid authorization header");
    }

    try {
      const secret = this.configService.get<string>("JWT_SECRET");
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret,
      });
      // L4: reject non-access tokens (refresh, reset, etc.)
      if (payload.type !== "access") {
        throw new UnauthorizedException("Invalid token type");
      }
      (request as any).user = payload;
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }

  private extractToken(request: Request): string | undefined {
    const auth = request.headers.authorization;
    if (!auth) return undefined;
    const [type, token] = auth.split(" ");
    return type === "Bearer" ? token : undefined;
  }
}
