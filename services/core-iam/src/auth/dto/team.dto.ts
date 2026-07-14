import { IsEmail, IsNotEmpty, IsString, IsNumber, IsBoolean, IsArray, IsOptional } from 'class-validator';

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
  @IsString()
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
