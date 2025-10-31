import { SetupResponse } from '../types';

/**
 * API client for OpenPIMS server communication
 */
export class OpenPIMSApi {
  /**
   * Auto-setup by fetching credentials from the server
   * Uses existing authentication cookies
   */
  static async autoSetup(serverUrl: string): Promise<SetupResponse> {
    const url = new URL('/api/extension/setup', serverUrl);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'OpenPIMS-Extension'
        }
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Nicht eingeloggt. Bitte zuerst auf der Webseite einloggen.');
        }
        if (response.status === 404) {
          throw new Error('Setup-Endpunkt nicht gefunden. Bitte Server-URL prüfen.');
        }
        if (response.status >= 500) {
          throw new Error(`Server-Fehler (${response.status}). Bitte später erneut versuchen.`);
        }
        throw new Error(`Fehler beim Abrufen der Daten (${response.status})`);
      }

      const data = await response.json();

      // Validate response
      if (!data.userId || !data.token || !data.domain) {
        throw new Error('Ungültige Server-Antwort. Erforderliche Felder fehlen.');
      }

      return {
        userId: String(data.userId),
        token: data.token,
        domain: data.domain,
        email: data.email
      };
    } catch (error) {
      console.error('[OpenPIMS] Error in autoSetup:', error);
      // Re-throw known errors
      if (error instanceof Error) {
        throw error;
      }
      // Network errors (DNS, connection refused, etc.)
      throw new Error('Verbindung zum Server fehlgeschlagen. Bitte Internetverbindung und URL prüfen.');
    }
  }

  /**
   * Verify that a subdomain is valid
   */
  static async verifySubdomain(
    serverUrl: string,
    subdomain: string,
    domain: string
  ): Promise<boolean> {
    const url = new URL('/api/extension/verify', serverUrl);

    try {
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'OpenPIMS-Extension'
        },
        body: JSON.stringify({ subdomain, domain })
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.valid === true;
    } catch (error) {
      console.error('[OpenPIMS] Error verifying subdomain:', error);
      return false;
    }
  }

  /**
   * Get consent status for a specific domain
   */
  static async getConsentStatus(
    serverUrl: string,
    userId: string,
    domain: string
  ): Promise<any> {
    const url = new URL(`/api/extension/consent/${userId}`, serverUrl);
    url.searchParams.append('domain', domain);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'OpenPIMS-Extension'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get consent status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[OpenPIMS] Error getting consent status:', error);
      return null;
    }
  }

  /**
   * Validate server URL format
   */
  static validateServerUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
      return false;
    }
  }

  /**
   * Extract domain from server URL
   */
  static extractDomain(serverUrl: string): string {
    try {
      const url = new URL(serverUrl);
      return url.hostname;
    } catch {
      return 'openpims.de';
    }
  }
}