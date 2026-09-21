import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

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
      throw new UnauthorizedException(
        'No account found with this email address',
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account has been deactivated');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(
        'Account is temporarily locked due to too many failed attempts. Please try again later.',
      );
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      const lockThreshold = this.configService.get<number>('LOCK_THRESHOLD', 5);
      const lockDurationMinutes = this.configService.get<number>(
        'LOCK_DURATION_MINUTES',
        15,
      );

      // M1 fix: atomic increment via Prisma to prevent lost-update races
      const [updatedUser] = await this.prisma.$queryRaw<
        { failedLoginAttempts: number }[]
      >`
        UPDATE users
        SET failed_login_attempts = failed_login_attempts + 1,
            locked_until = CASE
              WHEN failed_login_attempts + 1 >= ${lockThreshold}
              THEN NOW() + interval '${lockDurationMinutes} minutes'
              ELSE locked_until
            END
        WHERE id = ${user.id}
        RETURNING failed_login_attempts
      `;

      const newAttempts =
        updatedUser?.failedLoginAttempts ?? user.failedLoginAttempts + 1;

      throw new UnauthorizedException('Incorrect password');
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLogin: new Date(),
        },
      });
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });
    }

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
        user: true,
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
    const permissions =
      membership?.role?.rolePermissions.map((rp) => rp.permission.code) || [];

    return {
      user_id: userId,
      full_name: membership?.user?.fullName || null,
      role: roleName,
      organization_id: orgId,
      organization_name: orgName,
      permissions,
    };
  }

  async login(
    userId: number,
    email: string,
    userAgent?: string,
    ipAddress?: string,
  ) {
    // Session Fixation Prevention: Generate a fresh, unique cryptographic session ID for every authentication
    const sessionId = crypto.randomUUID();

    const accessPayload = await this.generateAccessPayload(userId);

    const accessToken = this.jwtService.sign(
      {
        jti: sessionId,
        sessionId,
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
    const refreshExpiresSeconds = this.configService.get<number>(
      'REFRESH_TOKEN_EXPIRE_SECONDS',
      604800,
    );
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
      sessionId,
      userId,
    };
  }

  /**
   * Regenerates a user session by revoking any prior refresh token and issuing
   * fresh credentials with a new session ID. Directly prevents session fixation.
   */
  async regenerateSession(
    userId: number,
    email: string,
    oldRefreshToken?: string,
    userAgent?: string,
    ipAddress?: string,
  ) {
    if (oldRefreshToken) {
      await this.revokeRefreshToken(oldRefreshToken);
    }
    return this.login(userId, email, userAgent, ipAddress);
  }

  async register(dto: RegisterDto): Promise<any> {
    this.logger.log(`Attempting to register user: ${dto.email}`);
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      this.logger.warn(
        `Registration failed. User already exists: ${dto.email}`,
      );
      throw new ConflictException('A user with this email already exists');
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          fullName: dto.fullName,
          isActive: true,
        },
      });

      const requestedRole = dto.role || 'Organization Owner';

      // Fetch matching system role
      const role = await tx.role.findUnique({
        where: { name: requestedRole },
      });

      if (!role) {
        throw new ConflictException(
          `Role '${requestedRole}' not found in system database`,
        );
      }

      // Only create Organization, Memberships, and Settings for Admin / Owner roles
      const isAdminRole = requestedRole === 'Organization Owner';

      if (isAdminRole) {
        // 1. Create Organization
        const org = await tx.organization.create({
          data: {
            name: `${dto.fullName}'s Organization`,
            ownerId: user.id,
          },
        });

        // 2. Assign Membership Owner role
        await tx.organizationMember.create({
          data: {
            organizationId: org.id,
            userId: user.id,
            roleId: role.id,
            status: 'active',
          },
        });

        // 3. Create settings records
        await tx.companySetting.create({
          data: {
            ownerId: user.id,
            companyName: `${dto.fullName}'s Company`,
            email: user.email,
          },
        });

        await tx.brandingSetting.create({
          data: {
            ownerId: user.id,
          },
        });

        await tx.notificationSetting.create({
          data: {
            ownerId: user.id,
            invoiceNotifications: true,
            paymentReminders: true,
            lowStockAlerts: true,
            weeklyReports: true,
          },
        });

        await tx.workflowSetting.create({
          data: {
            ownerId: user.id,
            sendUpcomingInvoiceReminders: true,
            sendOverdueReminders: true,
            notifyLowStock: true,
            createdAt: new Date().toISOString(),
          },
        });
      }

      this.logger.log(
        `Successfully registered user: ${user.email} as ${requestedRole}`,
      );
      return user;
    });
  }

  async refreshAccessToken(
    rawRefreshToken: string,
    userAgent?: string,
    ipAddress?: string,
  ) {
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

    // Revoke old refresh token (rotation)
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revoked: true },
    });

    const userId = tokenRecord.userId;
    const email = tokenRecord.user.email;
    const accessPayload = await this.generateAccessPayload(userId);

    const newSessionId = crypto.randomUUID();
    const newAccessToken = this.jwtService.sign(
      {
        jti: newSessionId,
        sessionId: newSessionId,
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

    // Issue new refresh token
    const rawNewRefreshToken = crypto.randomBytes(40).toString('hex');
    const newTokenHash = this.computeTokenHash(rawNewRefreshToken);
    const refreshExpiresSeconds = this.configService.get<number>(
      'REFRESH_TOKEN_EXPIRE_SECONDS',
      604800,
    );
    const expiresAt = new Date(Date.now() + refreshExpiresSeconds * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: newTokenHash,
        expiresAt,
        userAgent,
        ipAddress,
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: rawNewRefreshToken,
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

    // M3: reject deactivated users — their tokens should be treated as invalid
    if (!user.isActive) {
      throw new UnauthorizedException('Account has been deactivated');
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

  async listUsersInOrganization(orgId: number) {
    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: {
        user: true,
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

    return members.map((m) => ({
      id: m.user.id,
      name: m.user.fullName || '',
      email: m.user.email,
      role: m.role?.name || 'User',
      role_id: m.role?.id || null,
      status: !m.user.isActive
        ? ('disabled' as const)
        : m.status === 'invited'
          ? ('invited' as const)
          : ('active' as const),
      department: m.role?.description || 'Corporate',
      permissions: (m.role?.rolePermissions || []).map(
        (rp) => rp.permission.code,
      ),
      last_active: m.user.lastLogin ? m.user.lastLogin.toISOString() : '',
    }));
  }

  async inviteUserToOrganization(
    orgId: number,
    data: {
      email: string;
      fullName: string;
      roleId: number;
      password?: string;
    },
  ) {
    let user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (user) {
      const existingMember = await this.prisma.organizationMember.findFirst({
        where: {
          organizationId: orgId,
          userId: user.id,
        },
      });
      if (existingMember) {
        throw new ConflictException(
          'User is already a member of this organization',
        );
      }
    } else {
      const defaultPassword = data.password || 'User@123!';
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(defaultPassword, salt);
      user = await this.prisma.user.create({
        data: {
          email: data.email,
          fullName: data.fullName,
          passwordHash,
          isActive: true,
        },
      });
    }

    const member = await this.prisma.organizationMember.create({
      data: {
        organizationId: orgId,
        userId: user.id,
        roleId: data.roleId,
        status: 'active',
      },
      include: {
        user: true,
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

    return {
      id: member.user.id,
      name: member.user.fullName || '',
      email: member.user.email,
      role: member.role?.name || 'User',
      role_id: member.role?.id || null,
      status: 'active' as const,
      department: member.role?.description || 'Corporate',
      permissions: (member.role?.rolePermissions || []).map(
        (rp) => rp.permission.code,
      ),
      last_active: '',
    };
  }

  async toggleUserStatus(
    orgId: number,
    targetUserId: number,
    isActive: boolean,
  ) {
    const member = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId: orgId,
        userId: targetUserId,
      },
    });
    if (!member) {
      throw new NotFoundException('User not found in organization');
    }

    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { isActive },
    });

    await this.prisma.organizationMember.update({
      where: { id: member.id },
      data: { status: isActive ? 'active' : 'disabled' },
    });

    return { success: true };
  }

  async updateUserRole(orgId: number, targetUserId: number, roleId: number) {
    const member = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId: orgId,
        userId: targetUserId,
      },
    });
    if (!member) {
      throw new NotFoundException('User not found in organization');
    }

    await this.prisma.organizationMember.update({
      where: { id: member.id },
      data: { roleId },
    });

    return { success: true };
  }

  async deleteUserFromOrganization(orgId: number, targetUserId: number) {
    const member = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId: orgId,
        userId: targetUserId,
      },
    });
    if (!member) {
      throw new NotFoundException('User not found in organization');
    }

    await this.prisma.organizationMember.delete({
      where: { id: member.id },
    });

    const otherMemberships = await this.prisma.organizationMember.findMany({
      where: { userId: targetUserId },
    });
    if (otherMemberships.length === 0) {
      await this.prisma.user.delete({
        where: { id: targetUserId },
      });
    }

    return { success: true };
  }

  async listAvailableRoles() {
    const roles = await this.prisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description || '',
      permissions: r.rolePermissions.map((rp) => rp.permission.code),
    }));
  }

  async listAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
    });
  }

  async updateRolePermissions(roleId: number, permissionIds: number[]) {
    await this.prisma.rolePermission.deleteMany({
      where: { roleId },
    });

    if (permissionIds.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: permissionIds.map((pid) => ({
          roleId,
          permissionId: pid,
        })),
      });
    }

    return { success: true };
  }
}
