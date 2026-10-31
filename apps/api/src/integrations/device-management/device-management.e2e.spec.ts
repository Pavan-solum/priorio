import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

/**
 * E2E Tests for Device Management
 */
describe('Device Management E2E', () => {
  const API_URL = 'http://localhost:3001/api';
  let deviceId: string;
  let authToken: string;

  beforeEach(async () => {
    // Login to get auth token
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'test@priorio.app',
      password: 'testpassword123',
    });
    authToken = loginResponse.data.token;
  });

  afterEach(async () => {
    // Cleanup: unregister device if created
    if (deviceId) {
      try {
        await axios.delete(`${API_URL}/device-management/devices/${deviceId}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
      } catch (e) {
        console.log('Cleanup error:', e);
      }
    }
  });

  describe('Device Registration', () => {
    it('should register a new device', async () => {
      const response = await axios.post(
        `${API_URL}/device-management/devices/register`,
        {
          deviceName: 'Test Device',
          platform: 'iOS',
          osVersion: '17.0',
          appVersion: '1.0.0',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('deviceId');
      expect(response.data.platform).toBe('iOS');
      deviceId = response.data.deviceId;
    });

    it('should get device details', async () => {
      // First register
      const registerResponse = await axios.post(
        `${API_URL}/device-management/devices/register`,
        {
          deviceName: 'Test Device',
          platform: 'Android',
          osVersion: '14.0',
          appVersion: '1.0.0',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      deviceId = registerResponse.data.deviceId;

      // Then fetch
      const response = await axios.get(
        `${API_URL}/device-management/devices/${deviceId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.deviceId).toBe(deviceId);
      expect(response.data.deviceName).toBe('Test Device');
    });
  });

  describe('Sync Operations', () => {
    beforeEach(async () => {
      // Register device before sync tests
      const response = await axios.post(
        `${API_URL}/device-management/devices/register`,
        {
          deviceName: 'Sync Test Device',
          platform: 'iOS',
          osVersion: '17.0',
          appVersion: '1.0.0',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      deviceId = response.data.deviceId;
    });

    it('should initiate sync operation', async () => {
      const response = await axios.post(
        `${API_URL}/device-management/devices/${deviceId}/sync`,
        {
          clientTimestamp: Date.now(),
          deviceInfo: {
            platform: 'iOS',
            appVersion: '1.0.0',
          },
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('syncLogId');
      expect(response.data).toHaveProperty('lastSyncTime');
    });

    it('should process offline tasks during sync', async () => {
      // Initiate sync first
      const syncResponse = await axios.post(
        `${API_URL}/device-management/devices/${deviceId}/sync`,
        {
          clientTimestamp: Date.now(),
          deviceInfo: { platform: 'iOS', appVersion: '1.0.0' },
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      const syncLogId = syncResponse.data.syncLogId;

      // Process offline tasks
      const response = await axios.post(
        `${API_URL}/device-management/devices/${deviceId}/sync-offline-tasks`,
        {
          workspaceId: 'default',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('synced');
      expect(response.data).toHaveProperty('failed');
      expect(Array.isArray(response.data.synced)).toBe(true);
    });

    it('should complete sync operation', async () => {
      const syncResponse = await axios.post(
        `${API_URL}/device-management/devices/${deviceId}/sync`,
        {
          clientTimestamp: Date.now(),
          deviceInfo: { platform: 'iOS', appVersion: '1.0.0' },
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      const syncLogId = syncResponse.data.syncLogId;

      const response = await axios.post(
        `${API_URL}/device-management/devices/${deviceId}/sync/${syncLogId}/complete`,
        {
          clientTimestamp: Date.now(),
          status: 'completed',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.status).toBe('completed');
    });
  });

  describe('Offline-First Scenarios', () => {
    beforeEach(async () => {
      const response = await axios.post(
        `${API_URL}/device-management/devices/register`,
        {
          deviceName: 'Offline Test Device',
          platform: 'iOS',
          osVersion: '17.0',
          appVersion: '1.0.0',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      deviceId = response.data.deviceId;
    });

    it('should queue task when offline', async () => {
      const response = await axios.post(
        `${API_URL}/device-management/devices/${deviceId}/queue-task`,
        {
          taskData: {
            title: 'Offline Task',
            description: 'Created offline',
            priority: 'MEDIUM',
            status: 'TODO',
          },
          createdAt: Date.now(),
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.queued).toBe(true);
    });

    it('should handle sync conflicts', async () => {
      // Create conflicting changes
      const response = await axios.post(
        `${API_URL}/sync/conflicts/resolve`,
        {
          conflictId: 'test-conflict',
          resolution: 'local',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('resolved');
    });
  });

  describe('Error Handling', () => {
    it('should return 401 for unauthorized requests', async () => {
      try {
        await axios.post(`${API_URL}/device-management/devices/register`, {
          deviceName: 'Test',
          platform: 'iOS',
          osVersion: '17.0',
          appVersion: '1.0.0',
        });
        expect.fail('Should have thrown 401');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }
    });

    it('should return 400 for invalid device data', async () => {
      try {
        await axios.post(
          `${API_URL}/device-management/devices/register`,
          {
            // Missing required fields
            deviceName: 'Test',
          },
          {
            headers: { Authorization: `Bearer ${authToken}` },
          }
        );
        expect.fail('Should have thrown 400');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }
    });

    it('should return 404 for non-existent device', async () => {
      try {
        await axios.get(
          `${API_URL}/device-management/devices/non-existent-id`,
          {
            headers: { Authorization: `Bearer ${authToken}` },
          }
        );
        expect.fail('Should have thrown 404');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
      }
    });
  });
});
