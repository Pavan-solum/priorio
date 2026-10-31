import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TaxonomyService } from '../services';

describe('TaxonomyService', () => {
  let service: TaxonomyService;
  let prisma: PrismaService;

  const mockWorkspaceId = 'workspace-123';
  const mockTaxonomyId = 'taxonomy-456';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaxonomyService,
        {
          provide: PrismaService,
          useValue: {
            classificationTaxonomy: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            classificationCategory: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<TaxonomyService>(TaxonomyService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('createTaxonomy', () => {
    it('should create a taxonomy successfully', async () => {
      const dto = {
        name: 'Task Categories',
        description: 'Standard task categories',
      };

      const expectedResult = {
        id: mockTaxonomyId,
        workspaceId: mockWorkspaceId,
        ...dto,
        isActive: true,
        categories: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest
        .spyOn(prisma.classificationTaxonomy, 'findUnique')
        .mockResolvedValueOnce(null);
      jest
        .spyOn(prisma.classificationTaxonomy, 'create')
        .mockResolvedValueOnce(expectedResult);

      const result = await service.createTaxonomy(mockWorkspaceId, dto);

      expect(result).toEqual(expectedResult);
      expect(prisma.classificationTaxonomy.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if taxonomy already exists', async () => {
      const dto = {
        name: 'Task Categories',
        description: 'Standard task categories',
      };

      jest.spyOn(prisma.classificationTaxonomy, 'findUnique')
        .mockResolvedValueOnce({
          id: 'existing-id',
          workspaceId: mockWorkspaceId,
          name: dto.name,
        } as any);

      await expect(
        service.createTaxonomy(mockWorkspaceId, dto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getTaxonomy', () => {
    it('should return taxonomy if it exists', async () => {
      const expectedTaxonomy = {
        id: mockTaxonomyId,
        workspaceId: mockWorkspaceId,
        name: 'Task Categories',
        categories: [],
        classifiers: [],
        metrics: [],
      };

      jest
        .spyOn(prisma.classificationTaxonomy, 'findUnique')
        .mockResolvedValueOnce(expectedTaxonomy as any);

      const result = await service.getTaxonomy(mockTaxonomyId, mockWorkspaceId);

      expect(result).toEqual(expectedTaxonomy);
    });

    it('should throw NotFoundException if taxonomy does not exist', async () => {
      jest
        .spyOn(prisma.classificationTaxonomy, 'findUnique')
        .mockResolvedValueOnce(null);

      await expect(
        service.getTaxonomy(mockTaxonomyId, mockWorkspaceId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if workspace does not match', async () => {
      jest
        .spyOn(prisma.classificationTaxonomy, 'findUnique')
        .mockResolvedValueOnce({
          id: mockTaxonomyId,
          workspaceId: 'different-workspace',
          name: 'Task Categories',
        } as any);

      await expect(
        service.getTaxonomy(mockTaxonomyId, mockWorkspaceId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listTaxonomies', () => {
    it('should return list of taxonomies', async () => {
      const expectedTaxonomies = [
        {
          id: 'tax-1',
          workspaceId: mockWorkspaceId,
          name: 'Category 1',
          _count: { categories: 5 },
        },
        {
          id: 'tax-2',
          workspaceId: mockWorkspaceId,
          name: 'Category 2',
          _count: { categories: 3 },
        },
      ];

      jest
        .spyOn(prisma.classificationTaxonomy, 'findMany')
        .mockResolvedValueOnce(expectedTaxonomies as any);

      const result = await service.listTaxonomies(mockWorkspaceId);

      expect(result).toHaveLength(2);
      expect(result[0].categoryCount).toBe(5);
      expect(result[1].categoryCount).toBe(3);
    });

    it('should return empty array if no taxonomies exist', async () => {
      jest
        .spyOn(prisma.classificationTaxonomy, 'findMany')
        .mockResolvedValueOnce([]);

      const result = await service.listTaxonomies(mockWorkspaceId);

      expect(result).toEqual([]);
    });
  });

  describe('updateTaxonomy', () => {
    it('should update taxonomy successfully', async () => {
      const existingTaxonomy = {
        id: mockTaxonomyId,
        workspaceId: mockWorkspaceId,
        name: 'Old Name',
        description: 'Old Description',
        isActive: true,
      };

      const updateDto = {
        name: 'New Name',
        description: 'New Description',
        isActive: false,
      };

      const expectedResult = {
        ...existingTaxonomy,
        ...updateDto,
        categories: [],
      };

      jest
        .spyOn(prisma.classificationTaxonomy, 'findUnique')
        .mockResolvedValueOnce(existingTaxonomy as any);
      jest
        .spyOn(prisma.classificationTaxonomy, 'update')
        .mockResolvedValueOnce(expectedResult as any);

      const result = await service.updateTaxonomy(
        mockTaxonomyId,
        mockWorkspaceId,
        updateDto,
      );

      expect(result.name).toBe('New Name');
      expect(result.isActive).toBe(false);
    });
  });

  describe('deleteTaxonomy', () => {
    it('should delete taxonomy successfully', async () => {
      jest
        .spyOn(prisma.classificationTaxonomy, 'findUnique')
        .mockResolvedValueOnce({
          id: mockTaxonomyId,
          workspaceId: mockWorkspaceId,
          name: 'Task Categories',
        } as any);
      jest
        .spyOn(prisma.classificationTaxonomy, 'delete')
        .mockResolvedValueOnce({} as any);

      await service.deleteTaxonomy(mockTaxonomyId, mockWorkspaceId);

      expect(prisma.classificationTaxonomy.delete).toHaveBeenCalledWith({
        where: { id: mockTaxonomyId },
      });
    });
  });

  describe('createCategory', () => {
    it('should create category successfully', async () => {
      const categoryDto = {
        name: 'Work',
        description: 'Work-related tasks',
        rules: ['priority >= high', 'contains:deadline'],
        exampleKeywords: ['meeting', 'deadline', 'project'],
      };

      const expectedResult = {
        id: 'category-123',
        taxonomyId: mockTaxonomyId,
        ...categoryDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest
        .spyOn(prisma.classificationTaxonomy, 'findUnique')
        .mockResolvedValueOnce({
          id: mockTaxonomyId,
          workspaceId: mockWorkspaceId,
        } as any);
      jest
        .spyOn(prisma.classificationCategory, 'create')
        .mockResolvedValueOnce(expectedResult as any);

      const result = await service.createCategory(
        mockTaxonomyId,
        mockWorkspaceId,
        categoryDto,
      );

      expect(result.name).toBe('Work');
      expect(result.taxonomyId).toBe(mockTaxonomyId);
    });
  });

  describe('updateCategory', () => {
    it('should update category successfully', async () => {
      const categoryId = 'category-123';
      const updateDto = {
        name: 'Updated Work',
        rules: ['priority >= high'],
      };

      const existingCategory = {
        id: categoryId,
        taxonomyId: mockTaxonomyId,
        name: 'Work',
        description: 'Work-related tasks',
        rules: ['priority >= high', 'contains:deadline'],
        exampleKeywords: ['meeting', 'deadline', 'project'],
      };

      jest
        .spyOn(prisma.classificationTaxonomy, 'findUnique')
        .mockResolvedValueOnce({
          id: mockTaxonomyId,
          workspaceId: mockWorkspaceId,
        } as any);
      jest
        .spyOn(prisma.classificationCategory, 'findUnique')
        .mockResolvedValueOnce(existingCategory as any);
      jest
        .spyOn(prisma.classificationCategory, 'update')
        .mockResolvedValueOnce({
          ...existingCategory,
          ...updateDto,
        } as any);

      const result = await service.updateCategory(
        categoryId,
        mockTaxonomyId,
        mockWorkspaceId,
        updateDto,
      );

      expect(result.name).toBe('Updated Work');
    });
  });

  describe('deleteCategory', () => {
    it('should delete category successfully', async () => {
      const categoryId = 'category-123';

      jest
        .spyOn(prisma.classificationTaxonomy, 'findUnique')
        .mockResolvedValueOnce({
          id: mockTaxonomyId,
          workspaceId: mockWorkspaceId,
        } as any);
      jest
        .spyOn(prisma.classificationCategory, 'findUnique')
        .mockResolvedValueOnce({
          id: categoryId,
          taxonomyId: mockTaxonomyId,
          name: 'Work',
        } as any);
      jest
        .spyOn(prisma.classificationCategory, 'delete')
        .mockResolvedValueOnce({} as any);

      await service.deleteCategory(categoryId, mockTaxonomyId, mockWorkspaceId);

      expect(prisma.classificationCategory.delete).toHaveBeenCalledWith({
        where: { id: categoryId },
      });
    });
  });
});
