# Phase 4.3: Classification Service - Implementation Plan

**Date:** October 31, 2026  
**Status:** 🚀 **IN PROGRESS**  
**Phase:** 4.3 (AI Engine - Classification Service)

---

## 📋 Phase Overview

Phase 4.3 introduces a **custom classification service** with category management, training data handling, and model versioning. This extends Phase 4.2 prompts to support:

- Custom classification taxonomies per workspace
- Training data management for classifiers
- Category-specific prompt templates
- Classification accuracy tracking
- Custom model performance analytics

---

## 🎯 Architecture

### System Design
```
┌──────────────────────────────────────────────────┐
│  Classification Service (Phase 4.3)              │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │ Taxonomy Management                      │   │
│  │ - Custom categories                      │   │
│  │ - Category rules & constraints           │   │
│  │ - Category performance tracking          │   │
│  └──────────────────────────────────────────┘   │
│                    ↓                             │
│  ┌──────────────────────────────────────────┐   │
│  │ Training Data Manager                    │   │
│  │ - Store training examples                │   │
│  │ - Tag & label management                 │   │
│  │ - Training dataset versioning            │   │
│  └──────────────────────────────────────────┘   │
│                    ↓                             │
│  ┌──────────────────────────────────────────┐   │
│  │ Classifier Engine                        │   │
│  │ - Multi-model classification             │   │
│  │ - Confidence-based selection             │   │
│  │ - Fallback strategies                    │   │
│  └──────────────────────────────────────────┘   │
│                    ↓                             │
│  ┌──────────────────────────────────────────┐   │
│  │ Performance Analytics                    │   │
│  │ - Classification accuracy per category   │   │
│  │ - Confusion matrix tracking              │   │
│  │ - Precision, recall, F1-score            │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## 📦 Database Schema

### New Models
```prisma
model ClassificationTaxonomy {
  id                String   @id @default(cuid())
  workspaceId       String   @map("workspace_id") @db.Uuid
  name              String   // e.g., "task_categories"
  description       String?
  categories        ClassificationCategory[]
  classifiers       Classifier[]
  trainingDatasets  TrainingDataset[]
  
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@unique([workspaceId, name])
  @@map("classification_taxonomies")
}

model ClassificationCategory {
  id                String   @id @default(cuid())
  taxonomyId        String   @map("taxonomy_id")
  taxonomy          ClassificationTaxonomy @relation(fields: [taxonomyId], references: [id], onDelete: Cascade)
  
  name              String   // e.g., "Bug", "Feature"
  description       String?
  rules             String[] @default([])
  exampleKeywords   String[] @default([])
  
  metrics           ClassificationMetric[]
  promptTemplate    PromptTemplate?
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@unique([taxonomyId, name])
  @@map("classification_categories")
}

model TrainingDataset {
  id                String   @id @default(cuid())
  taxonomyId        String   @map("taxonomy_id")
  taxonomy          ClassificationTaxonomy @relation(fields: [taxonomyId], references: [id], onDelete: Cascade)
  
  version           Int
  description       String?
  size              Int      // Number of examples
  
  trainingExamples  TrainingExample[]
  classifier        Classifier?
  
  createdAt         DateTime @default(now())
  
  @@unique([taxonomyId, version])
  @@map("training_datasets")
}

model TrainingExample {
  id                String   @id @default(cuid())
  datasetId         String   @map("dataset_id")
  dataset           TrainingDataset @relation(fields: [datasetId], references: [id], onDelete: Cascade)
  
  text              String   // Input example
  category          String   // Expected output
  confidence        Float    @default(1.0)
  
  createdAt         DateTime @default(now())
  
  @@index([datasetId])
  @@map("training_examples")
}

model Classifier {
  id                String   @id @default(cuid())
  taxonomyId        String   @map("taxonomy_id")
  taxonomy          ClassificationTaxonomy @relation(fields: [taxonomyId], references: [id], onDelete: Cascade)
  
  trainingDatasetId String   @map("training_dataset_id")
  trainingDataset   TrainingDataset @relation(fields: [trainingDatasetId], references: [id], onDelete: Restrict)
  
  version           Int
  modelType         String   // "prompt", "fine-tuned", "ensemble"
  metadata          Json     // Model-specific metadata
  
  isActive          Boolean  @default(false)
  accuracy          Float?   // Overall accuracy
  
  metrics           ClassificationMetric[]
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@unique([taxonomyId, version])
  @@map("classifiers")
}

model ClassificationMetric {
  id                String   @id @default(cuid())
  taxonomyId        String   @map("taxonomy_id")
  taxonomy          ClassificationTaxonomy @relation(fields: [taxonomyId], references: [id], onDelete: Cascade)
  
  categoryId        String   @map("category_id")
  category          ClassificationCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  
  classifierId      String?  @map("classifier_id")
  classifier        Classifier? @relation(fields: [classifierId], references: [id], onDelete: SetNull)
  
  // Confusion matrix elements
  truePositives     Int      @default(0) @map("true_positives")
  falsePositives    Int      @default(0) @map("false_positives")
  falseNegatives    Int      @default(0) @map("false_negatives")
  trueNegatives     Int      @default(0) @map("true_negatives")
  
  // Calculated metrics
  precision         Float?   // TP / (TP + FP)
  recall            Float?   // TP / (TP + FN)
  f1Score           Float?   // Harmonic mean of precision & recall
  
  recordedAt        DateTime @default(now())
  
  @@index([taxonomyId])
  @@index([classifierId])
  @@map("classification_metrics")
}
```

---

## 🔧 Services

### TaxonomyService
- Create/update/delete custom taxonomies
- Manage categories
- Track category performance

### TrainingDataService
- Manage training datasets and examples
- Version training data
- Analyze training data quality

### ClassifierService
- Train classifiers from datasets
- Manage classifier versions
- Select best performing classifier
- Classify new items

### ClassificationAnalyticsService
- Calculate precision, recall, F1-score
- Generate confusion matrices
- Performance trending
- Model comparison

---

## 📝 REST Endpoints (20+)

**Taxonomy Management:**
```
POST   /api/integrations/ai/classification/taxonomies
GET    /api/integrations/ai/classification/taxonomies
GET    /api/integrations/ai/classification/taxonomies/:taxonomyId
PUT    /api/integrations/ai/classification/taxonomies/:taxonomyId
DELETE /api/integrations/ai/classification/taxonomies/:taxonomyId
```

**Category Management:**
```
POST   /api/integrations/ai/classification/taxonomies/:taxonomyId/categories
GET    /api/integrations/ai/classification/taxonomies/:taxonomyId/categories
PUT    /api/integrations/ai/classification/categories/:categoryId
DELETE /api/integrations/ai/classification/categories/:categoryId
```

**Training Data:**
```
POST   /api/integrations/ai/classification/taxonomies/:taxonomyId/training-data
GET    /api/integrations/ai/classification/taxonomies/:taxonomyId/training-data
POST   /api/integrations/ai/classification/training-data/:datasetId/examples
GET    /api/integrations/ai/classification/training-data/:datasetId/examples
```

**Classifiers:**
```
POST   /api/integrations/ai/classification/taxonomies/:taxonomyId/classifiers/train
GET    /api/integrations/ai/classification/taxonomies/:taxonomyId/classifiers
POST   /api/integrations/ai/classification/taxonomies/:taxonomyId/classifiers/:classifierId/activate
```

**Analytics:**
```
GET    /api/integrations/ai/classification/taxonomies/:taxonomyId/metrics
GET    /api/integrations/ai/classification/taxonomies/:taxonomyId/confusion-matrix
GET    /api/integrations/ai/classification/classifiers/:classifierId/performance
```

---

## 🎯 Key Features

1. **Custom Taxonomies** - Define custom categories per workspace
2. **Training Data Management** - Store and version training examples
3. **Multi-Model Classification** - Support different classifier types
4. **Performance Tracking** - Precision, recall, F1-score per category
5. **Confusion Matrix** - Detailed error analysis
6. **Model Versioning** - Track classifier versions and performance
7. **Category Rules** - Define rules and constraints for categories

---

**Status:** Ready for Phase 4.3 implementation
