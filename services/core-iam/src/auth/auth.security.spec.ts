import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RegisterDto } from './dto/register.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { InviteUserDto } from './dto/team.dto';

describe('Auth Security Validation', () => {
  describe('Password Complexity Enforcement (Finding #6)', () => {
    it('should reject weak passwords in RegisterDto', async () => {
      const weakPasswords = [
        '12345', // too short (< 8)
        '12345678', // numbers only
        'abcdefgh', // lowercase only
        'ABCDEFGH', // uppercase only
        'Abcdefgh', // no numbers or symbols
        'Abcdefg1', // no special character
        'abcdef1!', // no uppercase
        'ABCDEF1!', // no lowercase
      ];

      for (const pwd of weakPasswords) {
        const dto = plainToInstance(RegisterDto, {
          email: 'test@datavex.com',
          password: pwd,
          fullName: 'Test User',
        });
        const errors = await validate(dto);
        const passwordErrors = errors.find((e) => e.property === 'password');
        expect(passwordErrors).toBeDefined();
      }
    });

    it('should accept strong passwords meeting complexity rules in RegisterDto', async () => {
      const strongPasswords = [
        'Admin@123!',
        'User@123!',
        'DataVex#2026',
        'Secure$Pass99',
        'P@ssw0rd!Complex',
      ];

      for (const pwd of strongPasswords) {
        const dto = plainToInstance(RegisterDto, {
          email: 'valid@datavex.com',
          password: pwd,
          fullName: 'Valid User',
        });
        const errors = await validate(dto);
        const passwordErrors = errors.find((e) => e.property === 'password');
        expect(passwordErrors).toBeUndefined();
      }
    });

    it('should reject weak passwords in CreateUserDto', async () => {
      const dto = plainToInstance(CreateUserDto, {
        email: 'admin@datavex.com',
        password: 'weak',
        fullName: 'Admin User',
      });
      const errors = await validate(dto);
      const passwordErrors = errors.find((e) => e.property === 'password');
      expect(passwordErrors).toBeDefined();
    });

    it('should validate optional password in InviteUserDto when provided', async () => {
      // Weak optional password should fail
      const weakDto = plainToInstance(InviteUserDto, {
        email: 'invited@datavex.com',
        fullName: 'Invited User',
        roleId: 2,
        password: 'weak',
      });
      const weakErrors = await validate(weakDto);
      const weakPasswordErrors = weakErrors.find((e) => e.property === 'password');
      expect(weakPasswordErrors).toBeDefined();

      // Strong optional password should pass
      const strongDto = plainToInstance(InviteUserDto, {
        email: 'invited@datavex.com',
        fullName: 'Invited User',
        roleId: 2,
        password: 'User@123!',
      });
      const strongErrors = await validate(strongDto);
      expect(strongErrors.length).toBe(0);

      // Omitted password should pass (optional)
      const noPwdDto = plainToInstance(InviteUserDto, {
        email: 'invited@datavex.com',
        fullName: 'Invited User',
        roleId: 2,
      });
      const noPwdErrors = await validate(noPwdDto);
      expect(noPwdErrors.length).toBe(0);
    });
  });

  describe('Session Fixation Mitigation (Finding #7)', () => {
    it('should generate a cryptographically unique session ID and jti on login', async () => {
      const { AuthService } = await import('./auth.service');
      const mockPrisma: any = {
        organizationMember: {
          findFirst: jest.fn().mockResolvedValue({
            organizationId: 1,
            organization: { name: 'Acme Corp' },
            user: { fullName: 'Alex Chen' },
            role: {
              name: 'Admin',
              rolePermissions: [{ permission: { code: 'users:manage' } }],
            },
          }),
        },
        refreshToken: {
          create: jest.fn().mockResolvedValue({ id: 1 }),
        },
      };
      const signedTokens: any[] = [];
      const mockJwt: any = {
        sign: jest.fn().mockImplementation((payload) => {
          signedTokens.push(payload);
          return 'jwt-token-' + payload.sessionId;
        }),
      };
      const mockConfig: any = {
        get: jest.fn().mockImplementation((key, defaultVal) => defaultVal),
      };

      const authService = new AuthService(mockPrisma, mockJwt, mockConfig);

      const login1 = await authService.login(1, 'alex@datavex.com');
      const login2 = await authService.login(1, 'alex@datavex.com');

      // Assert session IDs exist and are UUIDs
      expect(login1.sessionId).toBeDefined();
      expect(login2.sessionId).toBeDefined();
      expect(login1.sessionId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );

      // Assert session IDs are distinct across login events (no fixation)
      expect(login1.sessionId).not.toBe(login2.sessionId);

      // Assert jti and sessionId were bound to JWT payload
      expect(signedTokens[0].jti).toBe(login1.sessionId);
      expect(signedTokens[0].sessionId).toBe(login1.sessionId);
      expect(signedTokens[1].jti).toBe(login2.sessionId);
      expect(signedTokens[1].sessionId).toBe(login2.sessionId);
    });

    it('should regenerate session by revoking previous refresh token and issuing fresh session', async () => {
      const { AuthService } = await import('./auth.service');
      const mockPrisma: any = {
        organizationMember: {
          findFirst: jest.fn().mockResolvedValue({
            organizationId: 1,
            organization: { name: 'Acme Corp' },
            user: { fullName: 'Alex Chen' },
            role: {
              name: 'Admin',
              rolePermissions: [],
            },
          }),
        },
        refreshToken: {
          create: jest.fn().mockResolvedValue({ id: 2 }),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      };
      const mockJwt: any = {
        sign: jest.fn().mockReturnValue('mock-jwt-token'),
      };
      const mockConfig: any = {
        get: jest.fn().mockImplementation((key, defaultVal) => defaultVal),
      };

      const authService = new AuthService(mockPrisma, mockJwt, mockConfig);

      const result = await authService.regenerateSession(
        1,
        'alex@datavex.com',
        'old-stale-refresh-token',
      );

      // Verify old token was revoked
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { revoked: true },
        }),
      );

      // Verify new session ID was created
      expect(result.sessionId).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });
  });
});
