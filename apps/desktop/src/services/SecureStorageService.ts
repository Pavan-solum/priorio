import { invoke } from '@tauri-apps/api/tauri';
import CryptoJS from 'crypto-js';

/**
 * Secure Storage Service
 * Manages encrypted sensitive data using system keyring
 */
export class SecureStorageService {
  private static readonly ENCRYPTION_KEY = process.env.VITE_ENCRYPTION_KEY || 'default-key';
  private static readonly KEYRING_SERVICE = 'priorio';

  /**
   * Store secure value
   */
  static async setSecure(key: string, value: string): Promise<void> {
    try {
      const encrypted = this.encrypt(value);
      // Store in system keyring via Tauri
      await invoke('store_secure', {
        service: this.KEYRING_SERVICE,
        key,
        value: encrypted,
      });
    } catch (error) {
      console.error(`Error storing secure value for key: ${key}`, error);
      throw error;
    }
  }

  /**
   * Retrieve secure value
   */
  static async getSecure(key: string): Promise<string | null> {
    try {
      const encrypted = await invoke<string>('get_secure', {
        service: this.KEYRING_SERVICE,
        key,
      });
      if (!encrypted) return null;
      return this.decrypt(encrypted);
    } catch (error) {
      console.error(`Error retrieving secure value for key: ${key}`, error);
      return null;
    }
  }

  /**
   * Delete secure value
   */
  static async deleteSecure(key: string): Promise<void> {
    try {
      await invoke('delete_secure', {
        service: this.KEYRING_SERVICE,
        key,
      });
    } catch (error) {
      console.error(`Error deleting secure value for key: ${key}`, error);
      throw error;
    }
  }

  /**
   * Clear all secure values
   */
  static async clearSecure(): Promise<void> {
    try {
      await invoke('clear_secure', {
        service: this.KEYRING_SERVICE,
      });
    } catch (error) {
      console.error('Error clearing secure storage', error);
      throw error;
    }
  }

  /**
   * Store authentication token
   */
  static async setAuthToken(token: string): Promise<void> {
    await this.setSecure('auth_token', token);
  }

  /**
   * Retrieve authentication token
   */
  static async getAuthToken(): Promise<string | null> {
    return await this.getSecure('auth_token');
  }

  /**
   * Store refresh token
   */
  static async setRefreshToken(token: string): Promise<void> {
    await this.setSecure('refresh_token', token);
  }

  /**
   * Retrieve refresh token
   */
  static async getRefreshToken(): Promise<string | null> {
    return await this.getSecure('refresh_token');
  }

  /**
   * Store API credentials
   */
  static async setApiCredentials(username: string, password: string): Promise<void> {
    const credentials = JSON.stringify({ username, password });
    await this.setSecure('api_credentials', credentials);
  }

  /**
   * Retrieve API credentials
   */
  static async getApiCredentials(): Promise<{ username: string; password: string } | null> {
    const credentials = await this.getSecure('api_credentials');
    if (!credentials) return null;
    try {
      return JSON.parse(credentials);
    } catch {
      return null;
    }
  }

  /**
   * Encrypt value using AES
   */
  private static encrypt(value: string): string {
    return CryptoJS.AES.encrypt(value, this.ENCRYPTION_KEY).toString();
  }

  /**
   * Decrypt value using AES
   */
  private static decrypt(encrypted: string): string {
    const bytes = CryptoJS.AES.decrypt(encrypted, this.ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Hash value using SHA256
   */
  static hash(value: string): string {
    return CryptoJS.SHA256(value).toString();
  }

  /**
   * Generate random key
   */
  static generateKey(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < length; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  }
}
