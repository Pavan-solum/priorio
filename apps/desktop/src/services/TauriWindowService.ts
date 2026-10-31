import { invoke } from '@tauri-apps/api/tauri';
import { appWindow } from '@tauri-apps/api/window';

/**
 * Tauri Window Service
 * Manages application windows
 */
export class TauriWindowService {
  /**
   * Show main window
   */
  static async showWindow(): Promise<void> {
    await appWindow.show();
    await appWindow.setFocus();
  }

  /**
   * Hide window
   */
  static async hideWindow(): Promise<void> {
    await appWindow.hide();
  }

  /**
   * Minimize window
   */
  static async minimizeWindow(): Promise<void> {
    await appWindow.minimize();
  }

  /**
   * Maximize window
   */
  static async maximizeWindow(): Promise<void> {
    await appWindow.maximize();
  }

  /**
   * Unmaximize window
   */
  static async unmaximizeWindow(): Promise<void> {
    await appWindow.unmaximize();
  }

  /**
   * Toggle maximize
   */
  static async toggleMaximize(): Promise<void> {
    const isMaximized = await appWindow.isMaximized();
    if (isMaximized) {
      await this.unmaximizeWindow();
    } else {
      await this.maximizeWindow();
    }
  }

  /**
   * Close window
   */
  static async closeWindow(): Promise<void> {
    await appWindow.close();
  }

  /**
   * Set window always on top
   */
  static async setAlwaysOnTop(alwaysOnTop: boolean): Promise<void> {
    await appWindow.setAlwaysOnTop(alwaysOnTop);
  }

  /**
   * Get window size
   */
  static async getWindowSize(): Promise<{ width: number; height: number }> {
    const size = await appWindow.innerSize();
    return { width: size.width, height: size.height };
  }

  /**
   * Set window size
   */
  static async setWindowSize(width: number, height: number): Promise<void> {
    const newSize = new (await import('@tauri-apps/api/window')).PhysicalSize(
      width,
      height
    );
    await appWindow.setSize(newSize);
  }

  /**
   * Get window position
   */
  static async getWindowPosition(): Promise<{ x: number; y: number }> {
    const position = await appWindow.outerPosition();
    return { x: position.x, y: position.y };
  }

  /**
   * Set window position
   */
  static async setWindowPosition(x: number, y: number): Promise<void> {
    const newPosition = new (await import('@tauri-apps/api/window')).PhysicalPosition(
      x,
      y
    );
    await appWindow.setPosition(newPosition);
  }

  /**
   * Is window focused
   */
  static async isWindowFocused(): Promise<boolean> {
    return await appWindow.isFocused();
  }

  /**
   * Listen to window events
   */
  static onWindowEvent(
    event: string,
    callback: (payload?: any) => void
  ): Promise<() => void> {
    return appWindow.listen(event, (e) => callback(e.payload));
  }
}
