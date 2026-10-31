import {
  IsString,
  IsUUID,
  IsOptional,
  IsNotEmpty,
  IsEnum,
  IsArray,
} from 'class-validator';

/**
 * DTO for permission request
 */
export class PermissionRequestDto {
  @IsNotEmpty()
  @IsUUID()
  integrationId: string;

  @IsNotEmpty()
  @IsArray()
  permissions: PermissionDto[];
}

/**
 * DTO for individual permission
 */
export class PermissionDto {
  @IsNotEmpty()
  @IsEnum(['READ', 'WRITE', 'DELETE', 'ADMIN'])
  permission: 'READ' | 'WRITE' | 'DELETE' | 'ADMIN';

  @IsNotEmpty()
  @IsString()
  scope: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * DTO for granting permissions
 */
export class GrantPermissionsDto {
  @IsNotEmpty()
  @IsUUID()
  integrationId: string;

  @IsNotEmpty()
  @IsArray()
  @IsUUID({ each: true })
  permissionIds: string[];
}

/**
 * DTO for revoking permissions
 */
export class RevokePermissionsDto {
  @IsNotEmpty()
  @IsUUID()
  integrationId: string;

  @IsOptional()
  @IsArray()
  @IsUUID({ each: true })
  permissionIds?: string[];
}

/**
 * DTO for validating permissions
 */
export class ValidatePermissionsDto {
  @IsNotEmpty()
  @IsUUID()
  integrationId: string;

  @IsNotEmpty()
  @IsEnum(['READ', 'WRITE', 'DELETE', 'ADMIN'])
  permission: 'READ' | 'WRITE' | 'DELETE' | 'ADMIN';

  @IsNotEmpty()
  @IsString()
  scope: string;
}

/**
 * DTO for listing permissions
 */
export class ListPermissionsDto {
  @IsNotEmpty()
  @IsUUID()
  integrationId: string;
}
