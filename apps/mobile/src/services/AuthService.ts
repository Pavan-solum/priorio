import axios, { AxiosInstance } from 'axios';
import { StorageService } from './StorageService';

/**
 * AuthService - Device authentication
 */
export class AuthService {
  private api: AxiosInstance;
  private storage: StorageService;
  private token: string | null = null;
  private refreshToken: string | null = null;

  constructor(apiBaseUrl: string, storage: StorageService) {
    this.storage = storage;
    this.api = axios.create({
      baseURL: apiBaseUrl,
    });
  }

  /**
   * Initialize auth service
   */
  async initialize(): Promise<void> {
    try {
      const token = await this.storage.getItem<string>('auth_token', true);
      const refreshToken = await this.storage.getItem<string>('refresh_token', true);

      if (token) {
        this.token = token;
        this.refreshToken = refreshToken;
        this.setupAxiosInterceptor();
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    }
  }

  /**
   * Register new device
   */
  async registerDevice(credentials: {
    email: string;
    password: string;
    deviceId: string;
    platform: string;
  }): Promise<{ token: string; user: any }> {
    try {
      const response = await this.api.post('/auth/login', {
        email: credentials.email,
        password: credentials.password,
      });

      const { token, refreshToken, user } = response.data;

      this.token = token;
      this.refreshToken = refreshToken;

      // Save tokens securely
      await this.storage.setItem('auth_token', token, true);
      await this.storage.setItem('refresh_token', refreshToken, true);

      this.setupAxiosInterceptor();

      return { token, user };
    } catch (error) {
      console.error('Error registering device:', error);
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<{ token: string; user: any }> {
    try {
      const response = await this.api.post('/auth/login', {
        email,
        password,
      });

      const { token, refreshToken, user } = response.data;

      this.token = token;
      this.refreshToken = refreshToken;

      await this.storage.setItem('auth_token', token, true);
      await this.storage.setItem('refresh_token', refreshToken, true);

      this.setupAxiosInterceptor();

      return { token, user };
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  }

  /**
   * Refresh auth token
   */
  async refreshAuthToken(): Promise<string> {
    try {
      if (!this.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await this.api.post('/auth/refresh', {
        refreshToken: this.refreshToken,
      });

      const { token, refreshToken } = response.data;

      this.token = token;
      this.refreshToken = refreshToken;

      await this.storage.setItem('auth_token', token, true);
      await this.storage.setItem('refresh_token', refreshToken, true);

      return token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      await this.logout();
      throw error;
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      if (this.token) {
        await this.api.post('/auth/logout', {});
      }
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      this.token = null;
      this.refreshToken = null;
      await this.storage.removeItem('auth_token');
      await this.storage.removeItem('refresh_token');
    }
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return !!this.token;
  }

  /**
   * Get authenticated user
   */
  async getCurrentUser(): Promise<any> {
    try {
      if (!this.token) {
        return null;
      }

      const response = await this.api.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Setup axios interceptor for token refresh
   */
  private setupAxiosInterceptor(): void {
    this.api.interceptors.response.use(
      response => response,
      async error => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this.refreshAuthToken();
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.api(originalRequest);
          } catch (refreshError) {
            await this.logout();
            throw refreshError;
          }
        }

        return Promise.reject(error);
      },
    );
  }

  /**
   * Validate token
   */
  async validateToken(): Promise<boolean> {
    try {
      if (!this.token) {
        return false;
      }

      const response = await this.api.get('/auth/validate', {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      return response.status === 200;
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
  }
}
