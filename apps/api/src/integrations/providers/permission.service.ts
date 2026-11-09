import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { PermissionType } from '../../../generated/prisma';

export type PermissionInput = PermissionType | 'READ' | 'WRITE' | 'DELETE' | 'ADMIN';

function toPermissionType(p: PermissionInput): PermissionType {
  switch (p) {
    case 'READ':
      return PermissionType.READ_MESSAGES;
    case 'WRITE':
      return PermissionType.WRITE_MESSAGES;
    case 'DELETE':
    case 'ADMIN':
      return PermissionType.MANAGE_TASKS;
    default:
      return p;
  }
}

/**
 * ProviderPermissionService: Manages granular permissions for each integration
 * - Request permissions from user
 * - Grant permissions to integrations
 * - Revoke permissions
 * - Validate permission before operations
 */
@Injectable()
export class ProviderPermissionService {
  private readonly logger = new Logger(ProviderPermissionService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Request permissions from user for an integration
   */
  async requestPermissions(
    integrationId: string,
    permissions: Array<{
      permission: PermissionInput;
      scope: string;
      reason?: string;
    }>,
  ): Promise<any> {
    try {
      const integration = await this.prisma.externalIntegration.findUnique({
        where: { id: integrationId },
      });

      if (!integration) {
        throw new BadRequestException('Integration not found');
      }

      const createdPermissions = [];

      for (const perm of permissions) {
        try {
          const mappedPermission = toPermissionType(perm.permission);
          const existing = await this.prisma.integrationPermission.findFirst({
            where: {
              integrationId,
              permission: mappedPermission,
              scope: perm.scope,
            },
          });

          if (!existing) {
            const created = await this.prisma.integrationPermission.create({
              data: {
                integrationId,
                permission: mappedPermission,
                scope: perm.scope,
                status: 'REQUESTED',
                metadata: {
                  reason: perm.reason,
                  requestedAt: new Date(),
                },
              },
            });

            createdPermissions.push(created);
          }
        } catch (error) {
          this.logger.warn(
            `Failed to create permission request: ${error.message}`,
          );
        }
      }

      this.logger.log(
        `Requested ${createdPermissions.length} permissions for integration ${integrationId}`,
      );

      return {
        success: true,
        permissions: createdPermissions,
        message: 'Permissions requested successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to request permissions: ${error.message}`);
      throw new InternalServerErrorException(
        'Failed to request permissions',
      );
    }
  }

  /**
   * Grant permissions to an integration
   */
  async grantPermissions(
    integrationId: string,
    permissionIds: string[],
  ): Promise<any> {
    try {
      const integration = await this.prisma.externalIntegration.findUnique({
        where: { id: integrationId },
      });

      if (!integration) {
        throw new BadRequestException('Integration not found');
      }

      // Grant all requested permissions
      const grantedPermissions = await this.prisma.integrationPermission.updateMany({
        where: {
          id: { in: permissionIds },
          integrationId,
        },
        data: {
          status: 'GRANTED',
          grantedAt: new Date(),
          expiresAt: this.calculateExpiryDate(),
        },
      });

      this.logger.log(
        `Granted ${grantedPermissions.count} permissions for integration ${integrationId}`,
      );

      // Log audit event
      await this.prisma.auditLog.create({
        data: {
          workspaceId: integration.workspaceId,
          actorId: integration.userId,
          action: 'GRANTED_INTEGRATION_PERMISSIONS',
          objectType: 'ExternalIntegration',
          objectId: integrationId,
          metadata: {
            permissionCount: grantedPermissions.count,
            provider: integration.provider,
          },
        },
      });

      return {
        success: true,
        grantedCount: grantedPermissions.count,
        message: 'Permissions granted successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to grant permissions: ${error.message}`);
      throw new InternalServerErrorException('Failed to grant permissions');
    }
  }

  /**
   * Revoke permissions from an integration
   */
  async revokePermissions(
    integrationId: string,
    permissionIds?: string[],
  ): Promise<any> {
    try {
      const integration = await this.prisma.externalIntegration.findUnique({
        where: { id: integrationId },
      });

      if (!integration) {
        throw new BadRequestException('Integration not found');
      }

      // Revoke all or specific permissions
      const revokedPermissions = await this.prisma.integrationPermission.updateMany({
        where: permissionIds
          ? {
              id: { in: permissionIds },
              integrationId,
            }
          : {
              integrationId,
              revokedAt: null,
            },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
        },
      });

      this.logger.log(
        `Revoked ${revokedPermissions.count} permissions for integration ${integrationId}`,
      );

      // Log audit event
      await this.prisma.auditLog.create({
        data: {
          workspaceId: integration.workspaceId,
          actorId: integration.userId,
          action: 'REVOKED_INTEGRATION_PERMISSIONS',
          objectType: 'ExternalIntegration',
          objectId: integrationId,
          metadata: {
            revokedCount: revokedPermissions.count,
            provider: integration.provider,
          },
        },
      });

      return {
        success: true,
        revokedCount: revokedPermissions.count,
        message: 'Permissions revoked successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to revoke permissions: ${error.message}`);
      throw new InternalServerErrorException('Failed to revoke permissions');
    }
  }

  /**
   * Check if operation is allowed based on permissions
   */
  async validatePermissions(
    integrationId: string,
    permission: PermissionInput,
    scope: string,
  ): Promise<boolean> {
    try {
      const perm = await this.prisma.integrationPermission.findFirst({
        where: {
          integrationId,
          permission: toPermissionType(permission),
          scope,
          status: 'GRANTED',
          revokedAt: null,
        },
      });

      if (!perm) {
        return false;
      }

      // Check if permission has expired
      if (perm.expiresAt && perm.expiresAt < new Date()) {
        // Auto-revoke expired permission
        await this.prisma.integrationPermission.update({
          where: { id: perm.id },
          data: {
            status: 'REVOKED',
            revokedAt: new Date(),
          },
        });

        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to validate permissions: ${error.message}`);
      return false;
    }
  }

  /**
   * Get all permissions for an integration
   */
  async listPermissions(integrationId: string): Promise<any> {
    try {
      const integration = await this.prisma.externalIntegration.findUnique({
        where: { id: integrationId },
      });

      if (!integration) {
        throw new BadRequestException('Integration not found');
      }

      const permissions = await this.prisma.integrationPermission.findMany({
        where: { integrationId },
      });

      // Categorize by status
      const byStatus = {
        requested: permissions.filter((p) => p.status === 'REQUESTED'),
        granted: permissions.filter((p) => p.status === 'GRANTED'),
        revoked: permissions.filter((p) => p.status === 'REVOKED'),
      };

      return {
        success: true,
        integrationId,
        provider: integration.provider,
        permissions: {
          all: permissions,
          byStatus,
          summary: {
            total: permissions.length,
            granted: byStatus.granted.length,
            requested: byStatus.requested.length,
            revoked: byStatus.revoked.length,
          },
        },
      };
    } catch (error) {
      this.logger.error(`Failed to list permissions: ${error.message}`);
      throw new InternalServerErrorException('Failed to list permissions');
    }
  }

  /**
   * Get expiring permissions
   */
  async getExpiringPermissions(
    workspaceId: string,
    daysUntilExpiry: number = 7,
  ): Promise<any> {
    try {
      const now = new Date();
      const expiryDate = new Date(
        now.getTime() + daysUntilExpiry * 24 * 60 * 60 * 1000,
      );

      const expiringPermissions = await this.prisma.integrationPermission.findMany({
        where: {
          integration: {
            workspaceId,
          },
          expiresAt: {
            gte: now,
            lte: expiryDate,
          },
          status: 'GRANTED',
          revokedAt: null,
        },
        include: {
          integration: true,
        },
      });

      return {
        success: true,
        count: expiringPermissions.length,
        expiringPermissions,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get expiring permissions: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Failed to get expiring permissions',
      );
    }
  }

  /**
   * Auto-renew expiring permissions
   */
  async renewPermissions(workspaceId: string): Promise<any> {
    try {
      const now = new Date();
      const expiringPermissions = await this.prisma.integrationPermission.findMany({
        where: {
          integration: {
            workspaceId,
          },
          expiresAt: {
            lte: now,
          },
          status: 'GRANTED',
          revokedAt: null,
        },
      });

      let renewed = 0;

      for (const perm of expiringPermissions) {
        try {
          await this.prisma.integrationPermission.update({
            where: { id: perm.id },
            data: {
              expiresAt: this.calculateExpiryDate(),
            },
          });

          renewed++;
        } catch (error) {
          this.logger.warn(`Failed to renew permission ${perm.id}`);
        }
      }

      this.logger.log(`Renewed ${renewed} permissions for workspace ${workspaceId}`);

      return {
        success: true,
        renewedCount: renewed,
        totalExpired: expiringPermissions.length,
      };
    } catch (error) {
      this.logger.error(`Failed to renew permissions: ${error.message}`);
      throw new InternalServerErrorException('Failed to renew permissions');
    }
  }

  /**
   * Calculate permission expiry date (90 days from now)
   */
  private calculateExpiryDate(): Date {
    return new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  }
}
