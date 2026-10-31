import { invoke } from '@tauri-apps/api/tauri';
import { readTextFile, writeTextFile, removeFile, removeDir } from '@tauri-apps/api/fs';
import { open, save } from '@tauri-apps/api/dialog';

/**
 * File Service
 * Manages file operations on desktop
 */
export class FileService {
  /**
   * Pick file
   */
  static async pickFile(options?: FilePickerOptions): Promise<string | null> {
    try {
      const selected = await open({
        multiple: false,
        filters: options?.filters,
        defaultPath: options?.defaultPath,
      });

      if (Array.isArray(selected)) {
        return selected[0] || null;
      }
      return selected;
    } catch (error) {
      console.error('Error picking file:', error);
      return null;
    }
  }

  /**
   * Pick multiple files
   */
  static async pickFiles(options?: FilePickerOptions): Promise<string[]> {
    try {
      const selected = await open({
        multiple: true,
        filters: options?.filters,
        defaultPath: options?.defaultPath,
      });

      if (Array.isArray(selected)) {
        return selected;
      }
      return selected ? [selected] : [];
    } catch (error) {
      console.error('Error picking files:', error);
      return [];
    }
  }

  /**
   * Pick directory
   */
  static async pickDirectory(options?: DirectoryPickerOptions): Promise<string | null> {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        defaultPath: options?.defaultPath,
      });

      if (Array.isArray(selected)) {
        return selected[0] || null;
      }
      return selected;
    } catch (error) {
      console.error('Error picking directory:', error);
      return null;
    }
  }

  /**
   * Save file dialog
   */
  static async saveFile(options?: FileSaveOptions): Promise<string | null> {
    try {
      return await save({
        defaultPath: options?.defaultPath,
        filters: options?.filters,
      });
    } catch (error) {
      console.error('Error saving file:', error);
      return null;
    }
  }

  /**
   * Read file
   */
  static async readFile(path: string): Promise<string | null> {
    try {
      return await readTextFile(path);
    } catch (error) {
      console.error(`Error reading file: ${path}`, error);
      return null;
    }
  }

  /**
   * Write file
   */
  static async writeFile(path: string, content: string): Promise<boolean> {
    try {
      await writeTextFile(path, content);
      return true;
    } catch (error) {
      console.error(`Error writing file: ${path}`, error);
      return false;
    }
  }

  /**
   * Delete file
   */
  static async deleteFile(path: string): Promise<boolean> {
    try {
      await removeFile(path);
      return true;
    } catch (error) {
      console.error(`Error deleting file: ${path}`, error);
      return false;
    }
  }

  /**
   * Delete directory
   */
  static async deleteDirectory(path: string, recursive: boolean = false): Promise<boolean> {
    try {
      await removeDir(path, { recursive });
      return true;
    } catch (error) {
      console.error(`Error deleting directory: ${path}`, error);
      return false;
    }
  }

  /**
   * Export data to file
   */
  static async exportData(data: any, filename: string): Promise<boolean> {
    try {
      const jsonContent = JSON.stringify(data, null, 2);
      const path = await this.saveFile({
        defaultPath: filename,
        filters: [
          {
            name: 'JSON',
            extensions: ['json'],
          },
        ],
      });

      if (!path) return false;
      return await this.writeFile(path, jsonContent);
    } catch (error) {
      console.error('Error exporting data:', error);
      return false;
    }
  }

  /**
   * Import data from file
   */
  static async importData(
    filters?: FilePickerOptions['filters']
  ): Promise<{ path: string; data: any } | null> {
    try {
      const path = await this.pickFile({ filters });
      if (!path) return null;

      const content = await this.readFile(path);
      if (!content) return null;

      const data = JSON.parse(content);
      return { path, data };
    } catch (error) {
      console.error('Error importing data:', error);
      return null;
    }
  }

  /**
   * Open file with default application
   */
  static async openFile(path: string): Promise<void> {
    try {
      await invoke('open_file', { path });
    } catch (error) {
      console.error(`Error opening file: ${path}`, error);
    }
  }
}

export interface FilePickerOptions {
  filters?: Array<{ name: string; extensions: string[] }>;
  defaultPath?: string;
}

export interface DirectoryPickerOptions {
  defaultPath?: string;
}

export interface FileSaveOptions {
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}
