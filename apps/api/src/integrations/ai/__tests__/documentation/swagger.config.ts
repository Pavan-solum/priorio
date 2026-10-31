/**
 * OpenAPI/Swagger Documentation for Priorio AI Engine
 * Complete API specification with examples and error codes
 */

export const aiEngineSwaggerConfig = {
  swagger: '3.0.0',
  info: {
    title: 'Priorio AI Engine API',
    version: '1.0.0',
    description: 'AI-powered task intelligence and automation',
    contact: {
      name: 'Priorio Team',
      email: 'support@priorio.io',
    },
  },

  servers: [
    {
      url: 'http://localhost:3000/api',
      description: 'Development server',
    },
    {
      url: 'https://api.priorio.io/api',
      description: 'Production server',
    },
  ],

  security: [{ bearerAuth: [] }],

  tags: [
    {
      name: 'AI Engine',
      description: 'Core AI operations',
    },
    {
      name: 'Classification',
      description: 'Advanced classification services',
    },
  ],

  paths: {
    '/integrations/ai/classify': {
      post: {
        summary: 'Classify a task',
        tags: ['AI Engine'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              example: {
                workspaceId: 'ws-123',
                text: 'Schedule meeting tomorrow',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Classification successful',
            content: {
              'application/json': {
                example: {
                  category: 'work',
                  priority: 'high',
                  tags: ['meeting'],
                  confidence: 0.92,
                },
              },
            },
          },
        },
      },
    },
  },
};
