import { 
  Controller, 
  Post, 
  Body, 
  Get, 
  Req, 
  Res, 
  Headers, 
  UnauthorizedException, 
  HttpCode, 
  HttpStatus,
  UseGuards,
  Put,
  Delete,
  Param
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { InviteUserDto, UpdateUserRoleDto, UpdateUserStatusDto, UpdateRolePermissionsDto } from './dto/team.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PermissionsGuard } from './guards/permissions.guard';
import { Permissions } from './decorators/permissions.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private setRefreshTokenCookie(res: Response, token: string) {
    const expireSeconds = this.configService.get<number>('REFRESH_TOKEN_EXPIRE_SECONDS', 604800);
    const domain = this.configService.get<string>('COOKIE_DOMAIN');
    
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: false, // Local dev: set secure to false
      sameSite: 'lax',
      maxAge: expireSeconds * 1000,
      path: '/api/auth', // Transmit on /api/auth/refresh and /api/auth/logout
      ...(domain ? { domain } : {}),
    });
  }

  private clearRefreshTokenCookie(res: Response) {
    const domain = this.configService.get<string>('COOKIE_DOMAIN');
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/api/auth',
      ...(domain ? { domain } : {}),
    });
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;

    const result = await this.authService.login(user.id, user.email, userAgent, ipAddress);
    
    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      access_token: result.accessToken,
      expires_in: this.configService.get<number>('ACCESS_TOKEN_EXPIRE_SECONDS', 900),
      user_id: result.userId,
    };
  }

  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.register(registerDto);
    
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;

    const result = await this.authService.login(user.id, user.email, userAgent, ipAddress);
    
    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      access_token: result.accessToken,
      expires_in: this.configService.get<number>('ACCESS_TOKEN_EXPIRE_SECONDS', 900),
      user_id: result.userId,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies['refresh_token'];
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;

    try {
      const result = await this.authService.refreshAccessToken(refreshToken, userAgent, ipAddress);
      this.setRefreshTokenCookie(res, result.refreshToken);
      return {
        access_token: result.accessToken,
        expires_in: this.configService.get<number>('ACCESS_TOKEN_EXPIRE_SECONDS', 900),
      };
    } catch (err) {
      this.clearRefreshTokenCookie(res);
      throw err;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies['refresh_token'];
    if (refreshToken) {
      await this.authService.revokeRefreshToken(refreshToken);
    }
    this.clearRefreshTokenCookie(res);
    return { message: 'Logged out successfully' };
  }

  @Get('users/me')
  @UseGuards(PermissionsGuard)
  @Permissions('users:read')
  async getMe(@Req() req: Request & { user: any }) {
    return this.authService.getUserMe(Number(req.user.sub));
  }

  @Get('users')
  @UseGuards(PermissionsGuard)
  @Permissions('users:list')
  async listUsers(@Req() req: Request & { user: any }) {
    const orgId = Number(req.user.organization_id);
    return this.authService.listUsersInOrganization(orgId);
  }

  @Post('users')
  @UseGuards(PermissionsGuard)
  @Permissions('users:manage')
  async inviteUser(
    @Req() req: Request & { user: any },
    @Body() body: InviteUserDto
  ) {
    const orgId = Number(req.user.organization_id);
    return this.authService.inviteUserToOrganization(orgId, body);
  }

  @Put('users/:id/status')
  @UseGuards(PermissionsGuard)
  @Permissions('users:manage')
  async toggleStatus(
    @Req() req: Request & { user: any },
    @Param('id') id: string,
    @Body() body: UpdateUserStatusDto
  ) {
    const orgId = Number(req.user.organization_id);
    return this.authService.toggleUserStatus(orgId, Number(id), body.isActive);
  }

  @Put('users/:id/role')
  @UseGuards(PermissionsGuard)
  @Permissions('users:manage')
  async updateRole(
    @Req() req: Request & { user: any },
    @Param('id') id: string,
    @Body() body: UpdateUserRoleDto
  ) {
    const orgId = Number(req.user.organization_id);
    return this.authService.updateUserRole(orgId, Number(id), body.roleId);
  }

  @Delete('users/:id')
  @UseGuards(PermissionsGuard)
  @Permissions('users:manage')
  async deleteUser(
    @Req() req: Request & { user: any },
    @Param('id') id: string
  ) {
    const orgId = Number(req.user.organization_id);
    return this.authService.deleteUserFromOrganization(orgId, Number(id));
  }

  @Get('roles')
  @UseGuards(PermissionsGuard)
  @Permissions('roles:list')
  async listRoles() {
    return this.authService.listAvailableRoles();
  }

  @Get('permissions')
  @UseGuards(PermissionsGuard)
  @Permissions('permissions:list')
  async listPermissions() {
    return this.authService.listAllPermissions();
  }

  @Put('roles/:id/permissions')
  @UseGuards(PermissionsGuard)
  @Permissions('roles:manage')
  async updateRolePermissions(
    @Param('id') id: string,
    @Body() body: UpdateRolePermissionsDto
  ) {
    return this.authService.updateRolePermissions(Number(id), body.permissionIds);
  }
}
