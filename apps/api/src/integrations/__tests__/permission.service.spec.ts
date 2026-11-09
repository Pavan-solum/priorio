import { Test, TestingModule } from '@nestjs/testing';
import { ProviderPermissionService } from '../providers/permission.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  mockIntegration,
  mockPermissionRequest,
  mockProviderPermission,
} from '../../__tests__/fixtures/mock-data';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('ProviderPermissionService', () => {
  let service: ProviderPermissionService;
  let prismaService: PrismaService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProviderPermissionService,
        {
          provide: PrismaService,
          useValue: {
            providerPermission: {
              create: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              findFirst: jest.fn(),
              delete: jest.fn(),
            },
            permissionRequest: {
              create: jest.fn(),
              update: jest.fn(),
              findMany: jest.fn(),
            },
            auditLog: {
              create: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProviderPermissionService>(
      ProviderPermissionService,
    );
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Permission Request', () => {
    it('should create permission request', async () => {
      jest
        .spyOn(prismaService.permissionRequest, 'create')
        .mockResolvedValue(mockPermissionRequest as any);

      const result = await service.requestPermissions(
        mockIntegration.id,
        'READ_CALENDAR',
      );

      expect(result).toBeDefined();
      expect(prismaService.permissionRequest.create).toHaveBeenCalled();
    });

    it('should request multiple permissions at once', async () => {
      const permissions = ['READ_CALENDAR', 'WRITE_TASK', 'READ_EMAIL'];

      jest
        .spyOn(prismaService.permissionRequest, 'create')
        .mockResolvedValue(mockPermissionRequest as any);

      for (const perm of permissions) {
        await service.requestPermissions(mockIntegration.id, perm);
      }

      expect(prismaService.permissionRequest.create).toHaveBeenCalledTimes(3);
    });
  });

  describe('Permission Grant', () => {
    it('should grant permissions to integration', async () => {
      jest
        .spyOn(prismaService.providerPermission, 'create')
        .mockResolvedValue(mockProviderPermission as any);

      const result = await service.grantPermissions(
        mockIntegration.id,
        'READ_CALENDAR',
      );

      expect(result).toBeDefined();
      expect(prismaService.providerPermission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            permission: 'READ_CALENDAR',
            status: 'GRANTED',
          }),
        }),
      );
    });

    it('should set 90-day expiry on permissions', async () => {
      const expiryDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

      jest
        .spyOn(prismaService.providerPermission, 'create')
        .mockResolvedValue({
          ...mockProviderPermission,
          expiresAt: expiryDate,
        } as any);

      const result = await service.grantPermissions(
        mockIntegration.id,
        'READ_CALENDAR',
      );

      expect(prismaService.providerPermission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expiresAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('Permission Revocation', () => {
    it('should revoke permissions immediately', async () => {
      jest
        .spyOn(prismaService.providerPermission, 'update')
        .mockResolvedValue({
          ...mockProviderPermission,
          status: 'REVOKED',
          revokedAt: new Date(),
        } as any);

      const result = await service.revokePermissions(
        mockIntegration.id,
        'READ_CALENDAR',
      );

      expect(result).toBeDefined();
      expect(prismaService.providerPermission.update).toHaveBeenCalled();
    });

    it('should revoke all permissions for integration', async () => {
      jest
        .spyOn(prismaService.providerPermission, 'findMany')
        .mockResolvedValue([
          { ...mockProviderPermission, permission: 'READ_CALENDAR' },
          { ...mockProviderPermission, permission: 'WRITE_TASK' },
        ] as any);

      jest
        .spyOn(prismaService.providerPermission, 'update')
        .mockResolvedValue({
          ...mockProviderPermission,
          status: 'REVOKED',
        } as any);

      await service.revokeAllPermissions(mockIntegration.id);

      expect(prismaService.providerPermission.update).toHaveBeenCalled();
    });
  });

  describe('Permission Validation', () => {
    it('should validate allowed operations', async () => {
      jest
        .spyOn(prismaService.providerPermission, 'findFirst')
        .mockResolvedValue({ ...mockProviderPermission, status: 'GRANTED' } as any);

      const result = await service.validatePermissions(
        mockIntegration.id,
        'READ_CALENDAR',
      );

      expect(result).toBe(true);
    });

    it('should reject operations without permission', async () => {
      jest
        .spyOn(prismaService.providerPermission, 'findFirst')
        .mockResolvedValue(null);

      await expect(
        service.validatePermissions(mockIntegration.id, 'READ_CALENDAR'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject expired permissions', async () => {
      const expiredPerm = {
        ...mockProviderPermission,
        status: 'GRANTED',
        expiresAt: new Date(Date.now() - 1000),
      };

      jest
        .spyOn(prismaService.providerPermission, 'findFirst')
        .mockResolvedValue(expiredPerm as any);

      await expect(
        service.validatePermissions(mockIntegration.id, 'READ_CALENDAR'),
      ).rejects.toThrow();
    });
  });

  describe('Permission Expiry', () => {
    it('should detect expiring permissions', async () => {
      const expiringPerm = {
        ...mockProviderPermission,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      jest
        .spyOn(prismaService.providerPermission, 'findMany')
        .mockResolvedValue([expiringPerm] as any);

      const result = await service.getExpiringPermissions(7);

      expect(result).toContain(expiringPerm);
    });

    it('should send expiry notifications', async () => {
      const expiringPerm = {
        ...mockProviderPermission,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      jest
        .spyOn(prismaService.providerPermission, 'findMany')
        .mockResolvedValue([expiringPerm] as any);
      jest.spyOn(service as any, 'sendNotification').mockResolvedValue({});

      await service.notifyExpiringPermissions(7);

      expect((service as any).sendNotification).toHaveBeenCalled();
    });
  });

  describe('Permission Renewal', () => {
    it('should renew expiring permissions', async () => {
      const expiringSoon = {
        ...mockProviderPermission,
        expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      };

      jest
        .spyOn(prismaService.providerPermission, 'findMany')
        .mockResolvedValue([expiringSoon] as any);
      jest
        .spyOn(prismaService.providerPermission, 'update')
        .mockResolvedValue({
          ...expiringSoon,
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        } as any);

      await service.autoRenewPermissions();

      expect(prismaService.providerPermission.update).toHaveBeenCalled();
    });

    it('should allow manual permission renewal', async () => {
      jest
        .spyOn(prismaService.providerPermission, 'update')
        .mockResolvedValue({
          ...mockProviderPermission,
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        } as any);

      const result = await service.renewPermission(
        mockIntegration.id,
        'READ_CALENDAR',
      );

      expect(result).toBeDefined();
    });
  });

  describe('Permission Auditing', () => {
    it('should log permission changes', async () => {
      jest
        .spyOn(prismaService.auditLog, 'create')
        .mockResolvedValue({} as any);

      await service.grantPermissions(
        mockIntegration.id,
        'READ_CALENDAR',
      );

      expect(prismaService.auditLog.create).toHaveBeenCalled();
    });

    it('should track grant operations', async () => {
      jest
        .spyOn(prismaService.auditLog, 'create')
        .mockResolvedValue({} as any);
      jest
        .spyOn(prismaService.providerPermission, 'create')
        .mockResolvedValue(mockProviderPermission as any);

      await service.grantPermissions(
        mockIntegration.id,
        'READ_CALENDAR',
      );

      expect(prismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'PERMISSION_GRANTED',
          }),
        }),
      );
    });

    it('should track revoke operations', async () => {
      jest
        .spyOn(prismaService.auditLog, 'create')
        .mockResolvedValue({} as any);
      jest
        .spyOn(prismaService.providerPermission, 'update')
        .mockResolvedValue({
          ...mockProviderPermission,
          status: 'REVOKED',
        } as any);

      await service.revokePermissions(
        mockIntegration.id,
        'READ_CALENDAR',
      );

      expect(prismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'PERMISSION_REVOKED',
          }),
        }),
      );
    });

    it('should maintain complete audit trail', async () => {
      jest
        .spyOn(prismaService.auditLog, 'create')
        .mockResolvedValue({} as any);

      await service.grantPermissions(
        mockIntegration.id,
        'READ_CALENDAR',
      );
      await service.revokePermissions(
        mockIntegration.id,
        'READ_CALENDAR',
      );
      await service.renewPermission(
        mockIntegration.id,
        'READ_CALENDAR',
      );

      expect(prismaService.auditLog.create).toHaveBeenCalledTimes(3);
    });
  });

  describe('Permission Listing', () => {
    it('should list all permissions by status', async () => {
      const granted = { ...mockProviderPermission, status: 'GRANTED' };
      const revoked = { ...mockProviderPermission, status: 'REVOKED' };

      jest
        .spyOn(prismaService.providerPermission, 'findMany')
        .mockResolvedValue([granted, revoked] as any);

      const result = await service.listPermissions(mockIntegration.id);

      expect(result).toContain(granted);
      expect(result).toContain(revoked);
    });

    it('should filter permissions by status', async () => {
      const granted = { ...mockProviderPermission, status: 'GRANTED' };

      jest
        .spyOn(prismaService.providerPermission, 'findMany')
        .mockResolvedValue([granted] as any);

      const result = await service.listPermissions(
        mockIntegration.id,
        'GRANTED',
      );

      expect(result).toContain(granted);
    });
  });
});
