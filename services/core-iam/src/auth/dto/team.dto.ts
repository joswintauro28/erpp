import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  IsOptional,
  MinLength,
  MaxLength,
  IsStrongPassword,
} from 'class-validator';

export class InviteUserDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsNotEmpty({ message: 'Full name is required' })
  @IsString({ message: 'Full name must be a string' })
  fullName: string;

  @IsNotEmpty({ message: 'Role ID is required' })
  @IsNumber({}, { message: 'Role ID must be a number' })
  roleId: number;

  @IsOptional()
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        'Password is too weak. It must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    },
  )
  password?: string;
}

export class UpdateUserRoleDto {
  @IsNotEmpty({ message: 'Role ID is required' })
  @IsNumber({}, { message: 'Role ID must be a number' })
  roleId: number;
}

export class UpdateUserStatusDto {
  @IsNotEmpty({ message: 'Active status is required' })
  @IsBoolean({ message: 'Active status must be a boolean' })
  isActive: boolean;
}

export class UpdateRolePermissionsDto {
  @IsNotEmpty({ message: 'Permission IDs are required' })
  @IsArray({ message: 'Permission IDs must be an array' })
  @IsNumber({}, { each: true, message: 'Each permission ID must be a number' })
  permissionIds: number[];
}
