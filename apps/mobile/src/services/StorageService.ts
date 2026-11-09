import { Preferences as CapacitorStorage } from '@capacitor/preferences';
import CryptoJS from 'crypto-js';

/**
 * StorageService - Local encrypted storage
 */
export class StorageService {
  private encryptionKey: string = '';

  constructor(encryptionKey: string) {
    this.encryptionKey = encryptionKey;
  }

  /**
   * Save data with optional encryption
   */
  async setItem(key: string, value: any, encrypted: boolean = false): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const dataToStore = encrypted ? this.encrypt(serialized) : serialized;

      await CapacitorStorage.set({
        key,
        value: dataToStore,
      });
    } catch (error) {
      console.error(`Error saving item ${key}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve data with optional decryption
   */
  async getItem<T>(key: string, encrypted: boolean = false): Promise<T | null> {
    try {
      const { value } = await CapacitorStorage.get({ key });

      if (!value) {
        return null;
      }

      const data = encrypted ? this.decrypt(value) : value;
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error retrieving item ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove item from storage
   */
  async removeItem(key: string): Promise<void> {
    try {
      await CapacitorStorage.remove({ key });
    } catch (error) {
      console.error(`Error removing item ${key}:`, error);
    }
  }

  /**
   * Clear all storage
   */
  async clear(): Promise<void> {
    try {
      await CapacitorStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }

  /**
   * Get all keys
   */
  async keys(): Promise<string[]> {
    try {
      const { keys } = await CapacitorStorage.keys();
      return keys;
    } catch (error) {
      console.error('Error getting keys:', error);
      return [];
    }
  }

  /**
   * Save bulk data
   */
  async setMultiple(items: Record<string, any>, encrypted: boolean = false): Promise<void> {
    try {
      for (const [key, value] of Object.entries(items)) {
        await this.setItem(key, value, encrypted);
      }
    } catch (error) {
      console.error('Error saving multiple items:', error);
      throw error;
    }
  }

  /**
   * Retrieve bulk data
   */
  async getMultiple<T>(keys: string[], encrypted: boolean = false): Promise<Record<string, T | null>> {
    try {
      const result: Record<string, T | null> = {};

      for (const key of keys) {
        result[key] = await this.getItem<T>(key, encrypted);
      }

      return result;
    } catch (error) {
      console.error('Error retrieving multiple items:', error);
      throw error;
    }
  }

  /**
   * Check if key exists
   */
  async hasItem(key: string): Promise<boolean> {
    try {
      const value = await this.getItem(key);
      return value !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get storage size
   */
  async getStorageSize(): Promise<number> {
    try {
      const keys = await this.keys();
      let size = 0;

      for (const key of keys) {
        const item = await CapacitorStorage.get({ key });
        if (item.value) {
          size += item.value.length;
        }
      }

      return size;
    } catch (error) {
      console.error('Error calculating storage size:', error);
      return 0;
    }
  }

  // Private encryption methods

  private encrypt(data: string): string {
    return CryptoJS.AES.encrypt(data, this.encryptionKey).toString();
  }

  private decrypt(encryptedData: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
}
