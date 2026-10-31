/**
 * Load Testing Configuration for Artillery
 * Simulates realistic load scenarios for the AI Engine API
 */

export const loadTestConfig = {
  // Basic load test scenario
  basicLoad: {
    target: 'http://localhost:3000',
    phases: [
      { duration: 60, arrivalRate: 10, name: 'Warm up' },
      { duration: 120, arrivalRate: 50, name: 'Ramp up' },
      { duration: 60, arrivalRate: 100, name: 'Sustained load' },
      { duration: 30, arrivalRate: 50, name: 'Ramp down' },
    ],
    defaults: {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
    },
  },

  // Spike test scenario - sudden traffic surge
  spikeTest: {
    target: 'http://localhost:3000',
    phases: [
      { duration: 60, arrivalRate: 10, name: 'Baseline' },
      { duration: 10, arrivalRate: 500, name: 'Spike' },
      { duration: 60, arrivalRate: 10, name: 'Recovery' },
    ],
  },

  // Soak test scenario - sustained load over time
  soakTest: {
    target: 'http://localhost:3000',
    phases: [
      { duration: 60, arrivalRate: 20, name: 'Ramp up' },
      { duration: 3600, arrivalRate: 50, name: '1 hour soak' },
      { duration: 60, arrivalRate: 20, name: 'Ramp down' },
    ],
  },

  // Stress test scenario - find breaking point
  stressTest: {
    target: 'http://localhost:3000',
    phases: [
      { duration: 60, arrivalRate: 20 },
      { duration: 60, arrivalRate: 50 },
      { duration: 60, arrivalRate: 100 },
      { duration: 60, arrivalRate: 200 },
      { duration: 60, arrivalRate: 500 },
      { duration: 30, arrivalRate: 20 },
    ],
  },

  // Scenarios for different endpoints
  scenarios: {
    classifyEndpoint: {
      name: 'Classification workflow',
      flow: [
        {
          post: {
            url: '/integrations/ai/classify',
            json: {
              workspaceId: 'workspace-123',
              text: 'Schedule meeting with team tomorrow',
              userId: 'user-456',
            },
          },
        },
        {
          think: 2,
        },
      ],
    },

    summarizeEndpoint: {
      name: 'Summarization workflow',
      flow: [
        {
          post: {
            url: '/integrations/ai/summarize',
            json: {
              workspaceId: 'workspace-123',
              text:
                'This is a comprehensive task that involves multiple complex steps ' +
                'and requires careful planning and execution.',
              userId: 'user-456',
              maxLength: 50,
            },
          },
        },
        {
          think: 1,
        },
      ],
    },

    extractEndpoint: {
      name: 'Entity extraction workflow',
      flow: [
        {
          post: {
            url: '/integrations/ai/extract',
            json: {
              workspaceId: 'workspace-123',
              text: 'Call John at 2pm tomorrow in New York office',
              userId: 'user-456',
            },
          },
        },
      ],
    },

    suggestEndpoint: {
      name: 'Suggestions workflow',
      flow: [
        {
          post: {
            url: '/integrations/ai/suggest',
            json: {
              workspaceId: 'workspace-123',
              task: {
                id: 'task-1',
                title: 'Fix bug',
                description: 'Fix login bug',
                priority: 'medium',
              },
              userId: 'user-456',
            },
          },
        },
        {
          think: 3,
        },
      ],
    },
  },
};

/**
 * Performance test metrics to track
 */
export const performanceMetrics = {
  latency: {
    p50: 'Median response time (50th percentile)',
    p95: '95th percentile response time',
    p99: '99th percentile response time',
    mean: 'Average response time',
    max: 'Maximum response time',
  },
  throughput: {
    rps: 'Requests per second',
    totalRequests: 'Total requests sent',
    completedRequests: 'Requests completed successfully',
    failedRequests: 'Requests that failed',
    errorRate: 'Percentage of failed requests',
  },
  resources: {
    cpuUsage: 'CPU utilization percentage',
    memoryUsage: 'Memory consumption in MB',
    connectionCount: 'Active connections',
  },
  costs: {
    costPerRequest: 'USD per request',
    costPerHour: 'USD per hour',
    costPerDay: 'USD per day',
  },
};

/**
 * Expected performance benchmarks
 */
export const performanceBenchmarks = {
  p50Latency: 250, // milliseconds
  p95Latency: 800, // milliseconds
  p99Latency: 2000, // milliseconds
  maxErrorRate: 0.01, // 1%
  minThroughput: 50, // requests per second
  maxCpuUsage: 80, // percent
  maxMemoryUsage: 512, // MB
  costPerRequest: 0.001, // USD
};

/**
 * Load test configurations in YAML format (for Artillery CLI)
 */
export const artilleryConfigs = {
  basicLoad: `
config:
  target: http://localhost:3000
  phases:
    - duration: 60
      arrivalRate: 10
      name: Warm up
    - duration: 120
      arrivalRate: 50
      name: Ramp up
    - duration: 60
      arrivalRate: 100
      name: Sustained load
  defaults:
    headers:
      Content-Type: application/json
      Authorization: Bearer test-token

scenarios:
  - name: Classification API
    flow:
      - post:
          url: /integrations/ai/classify
          json:
            workspaceId: workspace-123
            text: Schedule meeting with team tomorrow
            userId: user-456
      - think: 2
`,

  spikeTest: `
config:
  target: http://localhost:3000
  phases:
    - duration: 60
      arrivalRate: 10
    - duration: 10
      arrivalRate: 500
    - duration: 60
      arrivalRate: 10

scenarios:
  - name: Spike Test
    flow:
      - post:
          url: /integrations/ai/classify
          json:
            workspaceId: workspace-123
            text: Test task
      - think: 1
`,

  soakTest: `
config:
  target: http://localhost:3000
  phases:
    - duration: 60
      arrivalRate: 20
    - duration: 3600
      arrivalRate: 50
      name: 1 hour soak
    - duration: 60
      arrivalRate: 20

scenarios:
  - name: Soak Test
    flow:
      - post:
          url: /integrations/ai/classify
          json:
            workspaceId: workspace-123
            text: Test task
`,
};
