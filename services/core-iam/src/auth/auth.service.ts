import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // Helper to hash refresh tokens
  private computeTokenHash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account has been deactivated');
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      // In a production system, you would increment failed login attempts here
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update last login timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    return user;
  }

  async generateAccessPayload(userId: number) {
    // 1. Fetch user membership, organization, and role details
    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        userId,
        status: 'active',
      },
      include: {
        organization: true,
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    const orgId = membership?.organizationId || null;
    const orgName = membership?.organization?.name || null;
    const roleName = membership?.role?.name || null;
    
    // Extract permission codes
    const permissions = membership?.role?.rolePermissions.map(rp => rp.permission.code) || [];

    return {
      user_id: userId,
      role: roleName,
      organization_id: orgId,
      organization_name: orgName,
      permissions,
    };
  }

  async login(userId: number, email: string, userAgent?: string, ipAddress?: string) {
    const accessPayload = await this.generateAccessPayload(userId);
    
    const accessToken = this.jwtService.sign(
      {
        sub: String(userId),
        email,
        type: 'access',
        ...accessPayload,
      },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: `${this.configService.get<number>('ACCESS_TOKEN_EXPIRE_SECONDS', 900)}s`,
      },
    );

    // Generate refresh token
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.computeTokenHash(rawRefreshToken);
    const refreshExpiresSeconds = this.configService.get<number>('REFRESH_TOKEN_EXPIRE_SECONDS', 604800);
    const expiresAt = new Date(Date.now() + refreshExpiresSeconds * 1000);

    // Save refresh token to DB
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        userAgent,
        ipAddress,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      userId,
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        isActive: true,
      },
    });

    const requestedRole = dto.role || 'Organization Owner';

    // Fetch matching system role
    const role = await this.prisma.role.findUnique({
      where: { name: requestedRole },
    });

    if (!role) {
      throw new ConflictException(`Role '${requestedRole}' not found in system database`);
    }

    // Only create Organization, Memberships, and Settings for Admin / Owner roles
    const isAdminRole = requestedRole === 'Organization Owner';
    
    if (isAdminRole) {
      // 1. Create Organization
      const org = await this.prisma.organization.create({
        data: {
          name: `${dto.fullName}'s Organization`,
          ownerId: user.id,
        },
      });

      // 2. Assign Membership Owner role
      await this.prisma.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          roleId: role.id,
          status: 'active',
        },
      });

      // 3. Create settings records
      await this.prisma.companySetting.create({
        data: {
          ownerId: user.id,
          companyName: `${dto.fullName}'s Company`,
          email: user.email,
        },
      });

      await this.prisma.brandingSetting.create({
        data: {
          ownerId: user.id,
        },
      });

      await this.prisma.notificationSetting.create({
        data: {
          ownerId: user.id,
          invoiceNotifications: true,
          paymentReminders: true,
          lowStockAlerts: true,
          weeklyReports: true,
        },
      });

      await this.prisma.workflowSetting.create({
        data: {
          ownerId: user.id,
          sendUpcomingInvoiceReminders: true,
          sendOverdueReminders: true,
          notifyLowStock: true,
          createdAt: new Date().toISOString(),
        },
      });
    }

    return user;
  }

  async refreshAccessToken(rawRefreshToken: string, userAgent?: string, ipAddress?: string) {
    const tokenHash = this.computeTokenHash(rawRefreshToken);
    
    const tokenRecord = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: true,
      },
    });

    if (!tokenRecord || !tokenRecord.user.isActive) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const userId = tokenRecord.userId;
    const email = tokenRecord.user.email;
    const accessPayload = await this.generateAccessPayload(userId);

    const newAccessToken = this.jwtService.sign(
      {
        sub: String(userId),
        email,
        type: 'access',
        ...accessPayload,
      },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: `${this.configService.get<number>('ACCESS_TOKEN_EXPIRE_SECONDS', 900)}s`,
      },
    );

    return {
      accessToken: newAccessToken,
    };
  }

  async revokeRefreshToken(rawRefreshToken: string) {
    const tokenHash = this.computeTokenHash(rawRefreshToken);
    
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revoked: true },
    });
  }

  async getUserMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const accessPayload = await this.generateAccessPayload(userId);

    return {
      id: user.id,
      email: user.email,
      full_name: user.fullName,
      is_active: user.isActive,
      last_login: user.lastLogin,
      created_at: user.createdAt,
      organization_id: accessPayload.organization_id,
      organization_name: accessPayload.organization_name,
      role: accessPayload.role,
      permissions: accessPayload.permissions,
    };
  }
}
