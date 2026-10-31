import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TrainingDataService } from '../services';

describe('TrainingDataService', () => {
  let service: TrainingDataService;
  let prisma: PrismaService;

  const mockWorkspaceId = 'workspace-123';
  const mockTaxonomyId = 'taxonomy-456';
  const mockDatasetId = 'dataset-789';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrainingDataService,
        {
          provide: PrismaService,
          useValue: {
            classificationTaxonomy: {
              findUnique: jest.fn(),
            },
            trainingDataset: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            trainingExample: {
              createMany: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
            },
            classifier: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<TrainingDataService>(TrainingDataService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('createTrainingDataset', () => {
    it('should create training dataset with examples', async () => {
      const dto = {
        description: 'Initial dataset',
        examples: [
          { text: 'Meeting tomorrow at 2pm', category: 'Work', confidence: 0.95 },
          { text: 'Buy groceries', category: 'Personal', confidence: 0.9 },
        ],
      };

      const mockTaxonomy = {
        id: mockTaxonomyId,
        workspaceId: mockWorkspaceId,
      };

      const expectedResult = {
        id: mockDatasetId,
        taxonomyId: mockTaxonomyId,
        version: 1,
        size: 2,
        description: dto.description,
        trainingExamples: dto.examples,
        createdAt: new Date(),
      };

      jest
        .spyOn(prisma.classificationTaxonomy, 'findUnique')
        .mockResolvedValueOnce(mockTaxonomy as any);
      jest
        .spyOn(prisma.trainingDataset, 'findFirst')
        .mockResolvedValueOnce(null);
      jest
        .spyOn(prisma.trainingDataset, 'create')
        .mockResolvedValueOnce(expectedResult as any);

      const result = await service.createTrainingDataset(
        mockTaxonomyId,
        mockWorkspaceId,
        dto,
      );

      expect(result.version).toBe(1);
      expect(result.size).toBe(2);
    });

    it('should increment version for subsequent datasets', async () => {
      const dto = {
        description: 'Second dataset',
        examples: [{ text: 'Text', category: 'Category', confidence: 0.9 }],
      };

      jest
        .spyOn(prisma.classificationTaxonomy, 'findUnique')
        .mockResolvedValueOnce({
          id: mockTaxonomyId,
          workspaceId: mockWorkspaceId,
        } as any);
      jest
        .spyOn(prisma.trainingDataset, 'findFirst')
        .mockResolvedValueOnce({
          version: 1,
        } as any);
      jest
        .spyOn(prisma.trainingDataset, 'create')
        .mockResolvedValueOnce({
          id: 'dataset-2',
          taxonomyId: mockTaxonomyId,
          version: 2,
          size: 1,
        } as any);

      const result = await service.createTrainingDataset(
        mockTaxonomyId,
        mockWorkspaceId,
        dto,
      );

      expect(result.version).toBe(2);
    });
  });

  describe('getTrainingDataset', () => {
    it('should retrieve training dataset with examples', async () => {
      const expectedDataset = {
        id: mockDatasetId,
        taxonomyId: mockTaxonomyId,
        version: 1,
        size: 2,
        trainingExamples: [
          { id: 'ex-1', text: 'Meeting tomorrow', category: 'Work' },
          { id: 'ex-2', text: 'Buy groceries', category: 'Personal' },
        ],
      };

      jest
        .spyOn(prisma.classificationTaxonomy, 'findUnique')
        .mockResolvedValueOnce({
          id: mockTaxonomyId,
          workspaceId: mockWorkspaceId,
        } as any);
      jest
        .spyOn(prisma.trainingDataset, 'findUnique')
        .mockResolvedValueOnce(expectedDataset as any);

      const result = await service.getTrainingDataset(
        mockDatasetId,
        mockTaxonomyId,
        mockWorkspaceId,
      );

      expect(result.trainingExamples).toHaveLength(2);
    });

    it('should throw NotFoundException if dataset not found', async () => {
      jest
        .spyOn(prisma.classificationTaxonomy, 'findUnique')
        .mockResolvedValueOnce({
          id: mockTaxonomyId,
          workspaceId: mockWorkspaceId,
        } as any);
      jest
        .spyOn(prisma.trainingDataset, 'findUnique')
        .mockResolvedValueOnce(null);

      await expect(
        service.getTrainingDataset(mockDatasetId, mockTaxonomyId, mockWorkspaceId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addExamples', () => {
    it('should add examples to dataset', async () => {
      const dto = {
        examples: [
          { text: 'New example 1', category: 'Work', confidence: 0.9 },
          { text: 'New example 2', category: 'Personal', confidence: 0.85 },
        ],
      };

      const existingDataset = {
        id: mockDatasetId,
        taxonomyId: mockTaxonomyId,
        size: 10,
      };

      jest
        .spyOn(prisma.classificationTaxonomy, 'findUnique')
        .mockResolvedValueOnce({
          id: mockTaxonomyId,
          workspaceId: mockWorkspaceId,
        } as any);
      jest
        .spyOn(prisma.trainingDataset, 'findUnique')
        .mockResolvedValueOnce(existingDataset as any);
      jest
        .spyOn(prisma.trainingExample, 'createMany')
        .mockResolvedValueOnce({ count: 2 });
      jest
        .spyOn(prisma.trainingDataset, 'update')
        .mockResolvedValueOnce({
          ...existingDataset,
          size: 12,
        } as any);

      const result = await service.addExamples(
        mockDatasetId,
        mockTaxonomyId,
        mockWorkspaceId,
        dto,
      );

      expect(result.examplesAdded).toBe(2);
      expect(result.totalSize).toBe(12);
    });
  });

  describe('listTrainingDatasets', () => {
    it('should list all datasets for taxonomy', async () => {
      const datasets = [
        { id: 'ds-1', version: 2, size: 50 },
        { id: 'ds-2', version: 1, size: 25 },
      ];

      jest
        .spyOn(prisma.classificationTaxonomy, 'findUnique')
        .mockResolvedValueOnce({
          id: mockTaxonomyId,
          workspaceId: mockWorkspaceId,
        } as any);
      jest
        .spyOn(prisma.trainingDataset, 'findMany')
        .mockResolvedValueOnce(datasets as any);

      const result = await service.listTrainingDatasets(
        mockTaxonomyId,
        mockWorkspaceId,
      );

      expect(result).toHaveLength(2);
      expect(result[0].version).toBe(2);
    });
  });

  describe('deleteTrainingDataset', () => {
    it('should delete dataset if not used by active classifier', async () => {
      const dataset = {
        id: mockDatasetId,
        taxonomyId: mockTaxonomyId,
        version: 1,
        size: 25,
      };

      jest
        .spyOn(prisma.classificationTaxonomy, 'findUnique')
        .mockResolvedValueOnce({
          id: mockTaxonomyId,
          workspaceId: mockWorkspaceId,
        } as any);
      jest
        .spyOn(prisma.trainingDataset, 'findUnique')
        .mockResolvedValueOnce(dataset as any);
      jest
        .spyOn(prisma.classifier, 'findUnique')
        .mockResolvedValueOnce(null);
      jest
        .spyOn(prisma.trainingDataset, 'delete')
        .mockResolvedValueOnce({} as any);

      await service.deleteTrainingDataset(
        mockDatasetId,
        mockTaxonomyId,
        mockWorkspaceId,
      );

      expect(prisma.trainingDataset.delete).toHaveBeenCalled();
    });

    it('should throw error if dataset used by active classifier', async () => {
      const dataset = {
        id: mockDatasetId,
        taxonomyId: mockTaxonomyId,
        version: 1,
      };

      jest
        .spyOn(prisma.classificationTaxonomy, 'findUnique')
        .mockResolvedValueOnce({
          id: mockTaxonomyId,
          workspaceId: mockWorkspaceId,
        } as any);
      jest
        .spyOn(prisma.trainingDataset, 'findUnique')
        .mockResolvedValueOnce(dataset as any);
      jest
        .spyOn(prisma.classifier, 'findUnique')
        .mockResolvedValueOnce({
          id: 'clf-1',
          isActive: true,
        } as any);

      await expect(
        service.deleteTrainingDataset(
          mockDatasetId,
          mockTaxonomyId,
          mockWorkspaceId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
