import { browser } from 'wxt/browser';
import { Credentials } from '../types';

/**
 * Manages user credentials in browser storage
 */
export class CredentialStorage {
  private static readonly STORAGE_KEY = 'openpims_credentials';

  /**
   * Default credentials (not logged in state)
   */
  private static getDefaultCredentials(): Credentials {
    return {
      userId: '',
      secret: '',
      appDomain: 'openpims.de',
      email: '',
      serverUrl: 'https://openpims.de',
      isLoggedIn: false
    };
  }

  /**
   * Get credentials from storage
   */
  static async get(): Promise<Credentials> {
    try {
      const result = await browser.storage.local.get(this.STORAGE_KEY);
      const stored = result[this.STORAGE_KEY];

      if (stored && typeof stored === 'object') {
        return { ...this.getDefaultCredentials(), ...stored };
      }

      return this.getDefaultCredentials();
    } catch (error) {
      console.error('Error reading credentials:', error);
      return this.getDefaultCredentials();
    }
  }

  /**
   * Save credentials to storage
   */
  static async set(credentials: Partial<Credentials>): Promise<void> {
    const current = await this.get();
    const updated = { ...current, ...credentials };

    await browser.storage.local.set({
      [this.STORAGE_KEY]: updated
    });
  }

  /**
   * Login with credentials
   */
  static async login(
    userId: string,
    secret: string,
    appDomain: string,
    email?: string,
    serverUrl?: string
  ): Promise<void> {
    await this.set({
      userId,
      secret,
      appDomain,
      email: email || '',
      serverUrl: serverUrl || `https://${appDomain}`,
      isLoggedIn: true
    });
  }

  /**
   * Logout and clear credentials
   */
  static async logout(): Promise<void> {
    await this.set({
      userId: '',
      secret: '',
      email: '',
      isLoggedIn: false
    });
  }

  /**
   * Listen for storage changes
   */
  static onChanged(
    callback: (changes: { [key: string]: chrome.storage.StorageChange }) => void
  ): void {
    browser.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && this.STORAGE_KEY in changes) {
        callback(changes);
      }
    });
  }
}