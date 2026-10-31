# Phase 4.2: Prompt Management & Versioning - Implementation Plan

**Date:** October 31, 2026  
**Status:** 🚀 **IN PROGRESS**  
**Phase:** 4.2 (AI Engine - Prompts & Versioning)

---

## 📋 Phase Overview

Phase 4.2 introduces a **prompt management system** with versioning, A/B testing, and optimization tracking. This enables:
- Dynamic prompt management without code changes
- Version control for prompt improvements
- A/B testing to compare prompt effectiveness
- Performance metrics collection
- Template reusability across AI operations

---

## 🎯 Phase 4.2 Architecture

### System Design
```
┌─────────────────────────────────────────────────┐
│  Prompt Management System (Phase 4.2)           │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ Prompt Template Database                 │  │
│  │ - Classification prompts                 │  │
│  │ - Summarization prompts                  │  │
│  │ - Entity extraction prompts              │  │
│  │ - Suggestion generation prompts          │  │
│  └──────────────────────────────────────────┘  │
│                    ↓                            │
│  ┌──────────────────────────────────────────┐  │
│  │ Prompt Version Manager                   │  │
│  │ - Version control                        │  │
│  │ - A/B testing framework                  │  │
│  │ - Rollback capability                    │  │
│  │ - Performance tracking                   │  │
│  └──────────────────────────────────────────┘  │
│                    ↓                            │
│  ┌──────────────────────────────────────────┐  │
│  │ Prompt Optimization Engine               │  │
│  │ - Metrics collection                     │  │
│  │ - Effectiveness scoring                  │  │
│  │ - Recommendation engine                  │  │
│  └──────────────────────────────────────────┘  │
│                    ↓                            │
│  ┌──────────────────────────────────────────┐  │
│  │ AI Service Integration                   │  │
│  │ - Template resolution                    │  │
│  │ - Variable substitution                  │  │
│  │ - Metrics recording                      │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 📦 Deliverables

### 1. Prompt Template Database
- Prisma model for prompt storage
- Version tracking
- Metadata and tags
- Effectiveness metrics

### 2. Prompt Version Manager
- Create/update prompt versions
- A/B testing framework
- Version switching
- Rollback capability

### 3. Prompt Optimization Engine
- Metrics collection (accuracy, cost, latency)
- Performance scoring
- Recommendations
- Trend analysis

### 4. Service Integration
- Updated AI Service to use templates
- Variable substitution
- Metrics recording
- Performance tracking

### 5. REST API Endpoints
- Prompt template CRUD
- Version management
- A/B test management
- Performance analytics

### 6. Tests & Documentation
- Comprehensive test suite
- API documentation
- Setup guide

---

## 🗂️ File Structure

```
Phase 4.2 Files to Create:

apps/api/src/integrations/ai/
├── prompts/
│   ├── prompt-template.entity.ts      (Prisma model)
│   ├── prompt-version.entity.ts       (Version tracking)
│   ├── prompt.service.ts              (Core service)
│   ├── prompt.controller.ts           (REST API)
│   ├── prompt-optimizer.service.ts    (Optimization)
│   └── dto/
│       ├── prompt.dto.ts
│       └── optimization.dto.ts
│
├── __tests__/
│   ├── prompt.service.spec.ts         (30+ tests)
│   └── prompt-optimizer.spec.ts       (20+ tests)
│
└── prompts-module.ts                  (Module integration)

infrastructure/database/schema.prisma
  - PromptTemplate model
  - PromptVersion model
  - PromptMetric model
  - ABTest model

Documentation/
├── PHASE_4_2_PLAN.md
├── PHASE_4_2_COMPLETE.md
└── PROMPT_API_GUIDE.md
```

---

## 📚 Database Schema

### PromptTemplate Model
```prisma
model PromptTemplate {
  id                String       @id @default(cuid())
  workspaceId       String       // Multi-tenant
  name              String       // e.g., "classify_task"
  operation         String       // classify, summarize, extract, suggest
  description       String?
  category          String       // work, personal, health, etc
  
  // Relationships
  versions          PromptVersion[]
  abTests           ABTest[]
  metrics           PromptMetric[]
  
  // Metadata
  tags              String[]
  isActive          Boolean      @default(true)
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
  
  // Constraints
  @@unique([workspaceId, name])
  @@index([workspaceId])
  @@index([operation])
}

model PromptVersion {
  id                String       @id @default(cuid())
  templateId        String
  template          PromptTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  
  // Version info
  version           Int          // 1, 2, 3, ...
  content           String       // The actual prompt
  variables         String[]     // {taskTitle}, {description}, etc
  
  // Testing & Metrics
  isActive          Boolean      @default(false)
  abTests           ABTest[]
  metrics           PromptMetric[]
  
  // Metadata
  description       String?
  changelog         String?
  author            String?
  
  createdAt         DateTime     @default(now())
  
  @@unique([templateId, version])
  @@index([templateId])
}

model ABTest {
  id                String       @id @default(cuid())
  templateId        String
  template          PromptTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  
  // Versions being tested
  controlVersionId  String
  controlVersion    PromptVersion @relation("control", fields: [controlVersionId], references: [id])
  treatmentVersionId String
  treatmentVersion  PromptVersion @relation("treatment", fields: [treatmentVersionId], references: [id])
  
  // Test status
  status            String       @default("running") // running, completed, winner_selected
  winner            String?      // "control" or "treatment"
  
  // Metrics
  controlMetrics    PromptMetric[]
  treatmentMetrics  PromptMetric[]
  
  // Config
  sampleSize        Int?         // Target number of samples
  startDate         DateTime     @default(now())
  endDate           DateTime?
  
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
  
  @@index([templateId])
  @@index([status])
}

model PromptMetric {
  id                String       @id @default(cuid())
  templateId        String
  template          PromptTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  versionId         String
  version           PromptVersion @relation(fields: [versionId], references: [id], onDelete: Cascade)
  abTestId          String?
  abTest            ABTest?      @relation(fields: [abTestId], references: [id], onDelete: SetNull)
  
  // Performance metrics
  operation         String       // classify, summarize, etc
  success           Boolean
  accuracy          Float?       // 0-1 confidence
  latencyMs         Int
  tokenCount        Int
  costUsd           Float
  
  // Quality metrics
  userRating        Int?         // 1-5 stars (if user feedback available)
  relevance         Float?       // AI-scored relevance
  
  // Context
  taskId            String?
  userId            String?
  
  recordedAt        DateTime     @default(now())
  
  @@index([templateId])
  @@index([versionId])
  @@index([abTestId])
  @@index([recordedAt])
}
```

---

## 🔧 Service Implementation Overview

### PromptService (Core Management)
```typescript
class PromptService {
  // CRUD operations
  async createTemplate(name, operation, content, variables)
  async getTemplate(templateId)
  async listTemplates(workspaceId, filters)
  async updateTemplate(templateId, updates)
  async deleteTemplate(templateId)
  
  // Version management
  async createVersion(templateId, content, description)
  async getVersion(versionId)
  async listVersions(templateId)
  async activateVersion(versionId)
  async rollbackVersion(templateId)
  
  // Template resolution
  async resolveTemplate(templateName, variables)
  async getActivePrompt(operation, workspaceId)
  
  // Metrics
  async recordMetric(versionId, metric)
  async getMetrics(templateId, filters)
}
```

### PromptOptimizerService (Analytics & Testing)
```typescript
class PromptOptimizerService {
  // A/B Testing
  async startABTest(templateId, controlVersion, treatmentVersion)
  async getABTest(testId)
  async recordTestMetric(testId, version, metric)
  async analyzeABTest(testId)
  async selectWinner(testId, winner)
  
  // Analytics
  async getEffectiveness(templateId)
  async compareVersions(versionIds)
  async getTrends(templateId, timeRange)
  async getRecommendations(templateId)
  
  // Performance
  async getAverageLatency(templateId)
  async getAverageCost(templateId)
  async getSuccessRate(templateId)
}
```

### Updated AIService Integration
```typescript
class AIService {
  // Use templates instead of inline prompts
  async classifyTask(workspaceId, taskId, text, userId, provider) {
    // 1. Get active classification prompt template
    const template = await this.promptService.getActivePrompt(
      'classify', 
      workspaceId
    )
    
    // 2. Substitute variables
    const prompt = this.substituteVariables(template, { text })
    
    // 3. Call AI provider
    const classification = await provider.classifyTask(prompt)
    
    // 4. Record metrics
    await this.promptService.recordMetric(template.versionId, {
      operation: 'classify',
      success: true,
      accuracy: classification.confidence,
      latencyMs: elapsed,
      tokenCount,
      costUsd
    })
    
    return classification
  }
  
  // Similar for summarize, extract, suggest
}
```

---

## 🚀 REST API Endpoints

### Prompt Template Management

```
GET /api/integrations/ai/prompts
  → List all prompt templates for workspace

POST /api/integrations/ai/prompts
  → Create new prompt template
  Body: { name, operation, content, variables, tags }

GET /api/integrations/ai/prompts/:templateId
  → Get prompt template details

PUT /api/integrations/ai/prompts/:templateId
  → Update prompt template

DELETE /api/integrations/ai/prompts/:templateId
  → Delete prompt template

POST /api/integrations/ai/prompts/:templateId/versions
  → Create new version
  Body: { content, description }

GET /api/integrations/ai/prompts/:templateId/versions
  → List versions

GET /api/integrations/ai/prompts/:templateId/versions/:versionId
  → Get specific version

POST /api/integrations/ai/prompts/:templateId/versions/:versionId/activate
  → Activate version

POST /api/integrations/ai/prompts/:templateId/rollback
  → Rollback to previous version
```

### A/B Testing

```
POST /api/integrations/ai/prompts/:templateId/ab-tests
  → Start A/B test
  Body: { controlVersionId, treatmentVersionId, sampleSize }

GET /api/integrations/ai/ab-tests/:testId
  → Get A/B test details

GET /api/integrations/ai/ab-tests/:testId/results
  → Get A/B test results

POST /api/integrations/ai/ab-tests/:testId/select-winner
  → Select winner and apply
  Body: { winner: "control" | "treatment" }
```

### Analytics & Optimization

```
GET /api/integrations/ai/prompts/:templateId/metrics
  → Get performance metrics

GET /api/integrations/ai/prompts/:templateId/effectiveness
  → Get effectiveness score

GET /api/integrations/ai/prompts/:templateId/comparison
  → Compare all versions

GET /api/integrations/ai/prompts/:templateId/recommendations
  → Get optimization recommendations

GET /api/integrations/ai/prompts/:templateId/trends
  → Get performance trends
```

---

## 🧪 Testing Strategy

### Unit Tests (30+ cases)
- Template CRUD operations
- Version management
- Template resolution
- Variable substitution
- Metrics recording

### Service Tests (20+ cases)
- A/B test workflow
- Analytics calculations
- Winner selection
- Rollback functionality
- Edge cases

---

## 📊 Success Criteria

- [x] Database models for templates, versions, metrics
- [ ] PromptService with full CRUD and version management
- [ ] PromptOptimizerService with A/B testing
- [ ] REST API with all endpoints
- [ ] AIService integration with template resolution
- [ ] 50+ comprehensive tests
- [ ] Complete documentation
- [ ] Performance metrics collection

---

## ⏱️ Implementation Timeline

**Estimated Duration:** 3-4 hours

1. **Database Schema** (30 min)
   - Prisma models
   - Migrations

2. **Prompt Service** (60 min)
   - CRUD operations
   - Version management
   - Template resolution

3. **Optimizer Service** (60 min)
   - A/B testing
   - Analytics
   - Recommendations

4. **API Integration** (45 min)
   - REST endpoints
   - DTOs
   - Error handling

5. **Testing** (45 min)
   - Unit tests
   - Service tests
   - Integration tests

6. **Documentation** (30 min)
   - API guide
   - Setup instructions
   - Examples

---

## 🎓 Key Concepts

### Prompt Versioning
Every update to a prompt creates a new version, enabling:
- Rollback to previous prompts
- A/B testing between versions
- Performance comparison
- Audit trail

### A/B Testing Framework
Compare two prompt versions to:
- Measure effectiveness improvements
- Validate optimizations
- Select best performer
- Make data-driven decisions

### Metrics Collection
Track for each prompt execution:
- Success/failure
- Accuracy/confidence
- Latency in milliseconds
- Token count and cost
- User ratings (optional)

### Variable Substitution
Prompts use placeholders like `{taskTitle}`, `{description}`:
- Reusable templates
- Context-aware prompts
- Dynamic content injection

---

**Status:** Ready to implement  
**Priority:** HIGH - Enables prompt optimization  
**Dependencies:** Phase 4.1 (AI Service)

Next: Begin implementation of Phase 4.2
