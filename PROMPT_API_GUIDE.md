# Prompt Management API - Complete Guide

**Quick Start Guide for Phase 4.2**

---

## 🚀 Quick Start (5 minutes)

### 1. Create Your First Prompt Template
```bash
curl -X POST http://localhost:3001/api/integrations/ai/prompts \
  -H "Content-Type: application/json" \
  -H "X-Workspace-ID: workspace-123" \
  -d '{
    "name": "classify_task",
    "operation": "classify",
    "content": "Classify this task into a category: {taskTitle}",
    "variables": ["taskTitle"],
    "description": "Classifies tasks by category",
    "category": "work",
    "tags": ["ai", "classification"]
  }'
```

**Response:**
```json
{
  "id": "tmpl-abc123",
  "workspaceId": "workspace-123",
  "name": "classify_task",
  "operation": "classify",
  "isActive": true,
  "createdAt": "2026-10-31T22:30:00Z",
  "updatedAt": "2026-10-31T22:30:00Z"
}
```

### 2. Create a New Version
```bash
curl -X POST http://localhost:3001/api/integrations/ai/prompts/tmpl-abc123/versions \
  -H "Content-Type: application/json" \
  -H "X-Workspace-ID: workspace-123" \
  -d '{
    "content": "Classify this task into one of: Bug, Feature, Enhancement\nTask: {taskTitle}",
    "description": "Improved with explicit categories",
    "changelog": "Added explicit category list",
    "author": "user-456"
  }'
```

### 3. Run A/B Test
```bash
curl -X POST http://localhost:3001/api/integrations/ai/prompts/tmpl-abc123/ab-tests \
  -H "Content-Type: application/json" \
  -H "X-Workspace-ID: workspace-123" \
  -d '{
    "controlVersionId": "version-1",
    "treatmentVersionId": "version-2",
    "sampleSize": 100
  }'
```

### 4. Get Results
```bash
curl -X GET http://localhost:3001/api/integrations/ai/prompts/ab-tests/test-xyz789/results \
  -H "X-Workspace-ID: workspace-123"
```

---

## 📖 Complete API Reference

### Template Management

#### Create Template
```http
POST /api/integrations/ai/prompts
Content-Type: application/json
X-Workspace-ID: workspace-123

{
  "name": "classify_task",
  "operation": "classify",
  "content": "Classify: {taskTitle}",
  "variables": ["taskTitle"],
  "description": "Optional description",
  "category": "Optional category",
  "tags": ["ai", "optional"]
}
```

**Response:** `201 Created`
```json
{
  "id": "tmpl-abc123",
  "workspaceId": "workspace-123",
  "name": "classify_task",
  "operation": "classify",
  "description": "Optional description",
  "category": "Optional category",
  "tags": ["ai", "optional"],
  "isActive": true,
  "createdAt": "2026-10-31T22:30:00Z",
  "updatedAt": "2026-10-31T22:30:00Z"
}
```

#### List Templates
```http
GET /api/integrations/ai/prompts?operation=classify&isActive=true
X-Workspace-ID: workspace-123
```

**Response:** `200 OK`
```json
[
  {
    "id": "tmpl-abc123",
    "workspaceId": "workspace-123",
    "name": "classify_task",
    "operation": "classify",
    "isActive": true,
    "createdAt": "2026-10-31T22:30:00Z",
    "updatedAt": "2026-10-31T22:30:00Z"
  }
]
```

**Query Parameters:**
- `operation`: Filter by operation (classify, summarize, extract, suggest)
- `isActive`: Filter by active status (true/false)

#### Get Template
```http
GET /api/integrations/ai/prompts/tmpl-abc123
X-Workspace-ID: workspace-123
```

#### Update Template
```http
PUT /api/integrations/ai/prompts/tmpl-abc123
Content-Type: application/json
X-Workspace-ID: workspace-123

{
  "description": "Updated description",
  "tags": ["ai", "improved"],
  "isActive": true,
  "category": "work"
}
```

#### Delete Template
```http
DELETE /api/integrations/ai/prompts/tmpl-abc123
X-Workspace-ID: workspace-123
```

**Response:** `204 No Content`

---

### Version Management

#### Create Version
```http
POST /api/integrations/ai/prompts/tmpl-abc123/versions
Content-Type: application/json
X-Workspace-ID: workspace-123

{
  "content": "New prompt content with {variables}",
  "variables": ["variables"],
  "description": "What's different",
  "changelog": "Detailed changelog",
  "author": "user-id"
}
```

**Response:** `201 Created`
```json
{
  "id": "version-2",
  "templateId": "tmpl-abc123",
  "version": 2,
  "content": "New prompt content with {variables}",
  "variables": ["variables"],
  "isActive": false,
  "description": "What's different",
  "changelog": "Detailed changelog",
  "author": "user-id",
  "createdAt": "2026-10-31T22:35:00Z"
}
```

#### List Versions
```http
GET /api/integrations/ai/prompts/tmpl-abc123/versions
X-Workspace-ID: workspace-123
```

**Response:** `200 OK` (sorted by version descending)
```json
[
  {
    "id": "version-2",
    "templateId": "tmpl-abc123",
    "version": 2,
    "isActive": false
  },
  {
    "id": "version-1",
    "templateId": "tmpl-abc123",
    "version": 1,
    "isActive": true
  }
]
```

#### Get Version
```http
GET /api/integrations/ai/prompts/tmpl-abc123/versions/version-2
X-Workspace-ID: workspace-123
```

#### Activate Version
```http
POST /api/integrations/ai/prompts/tmpl-abc123/versions/version-2/activate
X-Workspace-ID: workspace-123
```

**Note:** Automatically deactivates all other versions

#### Rollback
```http
POST /api/integrations/ai/prompts/tmpl-abc123/rollback
X-Workspace-ID: workspace-123
```

**Response:** Returns previous version (version - 1)

---

### Metrics Recording

#### Record Execution Metric
```http
POST /api/integrations/ai/prompts/tmpl-abc123/versions/version-2/metrics
Content-Type: application/json
X-Workspace-ID: workspace-123

{
  "operation": "classify",
  "success": true,
  "accuracy": 0.95,
  "latencyMs": 245,
  "tokenCount": 67,
  "costUsd": 0.002,
  "userRating": 5,
  "relevance": 0.98,
  "taskId": "task-123",
  "userId": "user-456"
}
```

**Response:** `201 Created`
```json
{
  "id": "metric-1",
  "templateId": "tmpl-abc123",
  "versionId": "version-2",
  "operation": "classify",
  "success": true,
  "accuracy": 0.95,
  "latencyMs": 245,
  "tokenCount": 67,
  "costUsd": 0.002,
  "userRating": 5,
  "relevance": 0.98,
  "taskId": "task-123",
  "userId": "user-456",
  "recordedAt": "2026-10-31T22:40:00Z"
}
```

**Fields:**
- `operation` (required): classify, summarize, extract, suggest
- `success` (required): true/false
- `accuracy` (optional): 0-1 confidence score
- `latencyMs` (required): Response time in milliseconds
- `tokenCount` (required): Number of tokens used
- `costUsd` (required): Estimated cost
- `userRating` (optional): 1-5 stars
- `relevance` (optional): 0-1 relevance score
- `taskId` (optional): Associated task ID
- `userId` (optional): User who triggered operation

#### Get Metrics
```http
GET /api/integrations/ai/prompts/tmpl-abc123/metrics?operation=classify&limit=100
X-Workspace-ID: workspace-123
```

**Query Parameters:**
- `operation`: Filter by operation type
- `limit`: Maximum number of metrics (default: 100, max: 1000)

**Response:** `200 OK` (sorted by recordedAt descending)
```json
[
  {
    "id": "metric-1",
    "templateId": "tmpl-abc123",
    "versionId": "version-2",
    "success": true,
    "accuracy": 0.95,
    "recordedAt": "2026-10-31T22:40:00Z"
  },
  {
    "id": "metric-2",
    "templateId": "tmpl-abc123",
    "versionId": "version-2",
    "success": true,
    "accuracy": 0.93,
    "recordedAt": "2026-10-31T22:39:00Z"
  }
]
```

---

### A/B Testing

#### Start A/B Test
```http
POST /api/integrations/ai/prompts/tmpl-abc123/ab-tests
Content-Type: application/json
X-Workspace-ID: workspace-123

{
  "controlVersionId": "version-1",
  "treatmentVersionId": "version-2",
  "sampleSize": 100
}
```

**Response:** `201 Created`
```json
{
  "id": "test-xyz789",
  "templateId": "tmpl-abc123",
  "controlVersionId": "version-1",
  "treatmentVersionId": "version-2",
  "status": "running",
  "sampleSize": 100,
  "startDate": "2026-10-31T22:35:00Z",
  "endDate": null,
  "winner": null,
  "createdAt": "2026-10-31T22:35:00Z",
  "updatedAt": "2026-10-31T22:35:00Z"
}
```

#### Get A/B Test Details
```http
GET /api/integrations/ai/prompts/ab-tests/test-xyz789
X-Workspace-ID: workspace-123
```

#### Analyze A/B Test Results
```http
GET /api/integrations/ai/prompts/ab-tests/test-xyz789/results
X-Workspace-ID: workspace-123
```

**Response:** `200 OK`
```json
{
  "testId": "test-xyz789",
  "templateId": "tmpl-abc123",
  "status": "running",
  "controlVersion": {
    "versionId": "version-1",
    "version": 1,
    "samples": 50,
    "successRate": 0.92,
    "averageLatencyMs": 245,
    "averageCostUsd": 0.0018
  },
  "treatmentVersion": {
    "versionId": "version-2",
    "version": 2,
    "samples": 50,
    "successRate": 0.96,
    "averageLatencyMs": 220,
    "averageCostUsd": 0.0015
  },
  "statisticalSignificance": 0.82,
  "recommendedWinner": "treatment",
  "winner": null,
  "createdAt": "2026-10-31T22:35:00Z",
  "updatedAt": "2026-10-31T22:45:00Z"
}
```

**Interpretation:**
- `statisticalSignificance`: 0-1 confidence in results (0.5+ is significant)
- `recommendedWinner`: Which version performed better
- `status`: "running", "completed", or "winner_selected"

#### Select Winner
```http
POST /api/integrations/ai/prompts/ab-tests/test-xyz789/select-winner
Content-Type: application/json
X-Workspace-ID: workspace-123

{
  "winner": "treatment"
}
```

**Response:** `200 OK`
```json
{
  "id": "test-xyz789",
  "status": "winner_selected",
  "winner": "treatment",
  "endDate": "2026-10-31T23:45:00Z"
}
```

**Note:** Automatically activates the winning version

---

### Analytics & Optimization

#### Get Effectiveness Score
```http
GET /api/integrations/ai/prompts/tmpl-abc123/effectiveness
X-Workspace-ID: workspace-123
```

**Response:** `200 OK`
```json
{
  "templateId": "tmpl-abc123",
  "templateName": "classify_task",
  "operation": "classify",
  "overallScore": 87.5,
  "successRate": 0.94,
  "averageLatencyMs": 235,
  "averageCostUsd": 0.0017,
  "totalExecutions": 245,
  "recentTrend": "improving"
}
```

**Score Interpretation:**
- 80-100: Excellent
- 60-80: Good
- 40-60: Fair (optimization recommended)
- 0-40: Poor (significant changes needed)

#### Compare Versions
```http
GET /api/integrations/ai/prompts/tmpl-abc123/comparison
X-Workspace-ID: workspace-123
```

**Response:** `200 OK` (sorted by version descending)
```json
[
  {
    "versionId": "version-3",
    "version": 3,
    "totalExecutions": 50,
    "successRate": 0.96,
    "averageLatencyMs": 220,
    "averageCostUsd": 0.0015,
    "averageAccuracy": 0.94,
    "averageRelevance": 0.93
  },
  {
    "versionId": "version-2",
    "version": 2,
    "totalExecutions": 95,
    "successRate": 0.92,
    "averageLatencyMs": 245,
    "averageCostUsd": 0.0018
  },
  {
    "versionId": "version-1",
    "version": 1,
    "totalExecutions": 100,
    "successRate": 0.88,
    "averageLatencyMs": 280,
    "averageCostUsd": 0.002
  }
]
```

#### Get Recommendations
```http
GET /api/integrations/ai/prompts/tmpl-abc123/recommendations
X-Workspace-ID: workspace-123
```

**Response:** `200 OK`
```json
{
  "templateId": "tmpl-abc123",
  "templateName": "classify_task",
  "operation": "classify",
  "overallHealthScore": 87.5,
  "recommendations": [
    {
      "type": "add_examples",
      "description": "Model accuracy is low. Adding examples can improve performance.",
      "potentialImpact": "high",
      "confidence": 0.85,
      "actionableSteps": [
        "Add 2-3 worked examples",
        "Show correct and incorrect outputs",
        "Provide reasoning behind examples"
      ]
    },
    {
      "type": "optimize_for_cost",
      "description": "Operations are expensive. Consider more efficient prompts.",
      "potentialImpact": "medium",
      "confidence": 0.7,
      "actionableSteps": [
        "Use simpler model if accuracy allows",
        "Reduce prompt length without losing quality",
        "Batch similar operations"
      ]
    }
  ]
}
```

**Recommendation Types:**
- `increase_specificity`: Add more detail and constraints
- `reduce_length`: Shorten the prompt
- `add_examples`: Include worked examples
- `improve_clarity`: Use clearer language
- `optimize_for_cost`: Reduce costs

---

## 💡 Common Workflows

### Workflow 1: Optimize a Failing Prompt
```
1. GET /prompts/tmpl-abc123/recommendations
   → Check what AI recommends
   
2. POST /prompts/tmpl-abc123/versions
   → Implement recommendations
   
3. POST /prompts/tmpl-abc123/ab-tests
   → Test new version vs. current
   
4. GET /ab-tests/test-xyz789/results
   → Monitor A/B test progress
   
5. POST /ab-tests/test-xyz789/select-winner
   → Deploy best version when ready
```

### Workflow 2: Monitor Prompt Performance
```
1. GET /prompts?operation=classify
   → List all classification prompts
   
2. GET /prompts/tmpl-abc123/effectiveness
   → Check effectiveness score
   
3. GET /prompts/tmpl-abc123/comparison
   → Compare all versions
   
4. GET /prompts/tmpl-abc123/metrics?limit=50
   → Review recent metrics
```

### Workflow 3: Run Controlled Experiment
```
1. POST /prompts/tmpl-abc123/versions
   → Create experimental version
   
2. POST /prompts/tmpl-abc123/ab-tests
   → Start A/B test with control
   
3. Monitor with multiple GET calls to:
   → /ab-tests/test-xyz789/results
   
4. POST /ab-tests/test-xyz789/select-winner
   → Deploy winner automatically
```

---

## 🔧 Integration Example (TypeScript)

```typescript
import axios from 'axios';

class PromptManager {
  private baseURL = 'http://localhost:3001/api/integrations/ai/prompts';
  private workspaceId = 'workspace-123';

  async createTemplate(name: string, content: string) {
    const response = await axios.post(
      this.baseURL,
      {
        name,
        operation: 'classify',
        content,
        variables: [],
      },
      {
        headers: { 'X-Workspace-ID': this.workspaceId }
      }
    );
    return response.data;
  }

  async recordMetric(
    versionId: string,
    success: boolean,
    latencyMs: number,
    tokenCount: number,
    costUsd: number,
  ) {
    const response = await axios.post(
      `${this.baseURL}/tmpl-abc123/versions/${versionId}/metrics`,
      {
        operation: 'classify',
        success,
        latencyMs,
        tokenCount,
        costUsd,
      },
      {
        headers: { 'X-Workspace-ID': this.workspaceId }
      }
    );
    return response.data;
  }

  async getEffectiveness(templateId: string) {
    const response = await axios.get(
      `${this.baseURL}/${templateId}/effectiveness`,
      {
        headers: { 'X-Workspace-ID': this.workspaceId }
      }
    );
    return response.data;
  }
}
```

---

## ⚠️ Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Prompt template tmpl-xyz not found",
  "error": "Not Found"
}
```

### 409 Conflict
```json
{
  "statusCode": 409,
  "message": "Prompt template \"classify_task\" already exists in this workspace",
  "error": "Conflict"
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

---

## 📊 Testing API Locally

### Using curl
```bash
# Create template
curl -X POST http://localhost:3001/api/integrations/ai/prompts \
  -H "Content-Type: application/json" \
  -H "X-Workspace-ID: test-workspace" \
  -d '{"name": "test", "operation": "classify", "content": "test"}'

# List templates
curl -X GET http://localhost:3001/api/integrations/ai/prompts \
  -H "X-Workspace-ID: test-workspace"

# Get template
curl -X GET http://localhost:3001/api/integrations/ai/prompts/tmpl-id \
  -H "X-Workspace-ID: test-workspace"
```

### Using Postman
1. Import the API collection
2. Set `{{workspaceId}}` variable to your workspace ID
3. Run requests from the collection

### Using TypeScript
See integration example above

---

**API Documentation Complete - Ready for Production Use**
