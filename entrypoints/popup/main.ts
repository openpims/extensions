import { browser } from 'wxt/browser';
import { OpenPIMSApi } from '../../src/core/api';
import { CredentialStorage } from '../../src/storage/credentials';
import { MessageType, Credentials } from '../../src/types';

// DOM elements
let loadingContent: HTMLElement;
let loggedInContent: HTMLElement;
let loginForm: HTMLElement;
let errorMessage: HTMLElement;

// User info elements
let userEmail: HTMLElement;
let serverUrl: HTMLAnchorElement;

// Form inputs
let providerUrlInput: HTMLInputElement;
let userIdInput: HTMLInputElement;
let tokenInput: HTMLInputElement;
let domainInput: HTMLInputElement;

// Buttons
let autoSyncButton: HTMLButtonElement;
let manualSetupButton: HTMLButtonElement;
let syncButton: HTMLButtonElement;
let logoutButton: HTMLButtonElement;
let openRegisterButton: HTMLButtonElement;

/**
 * Initialize the popup
 */
async function init(): Promise<void> {
  // Get DOM elements
  loadingContent = document.getElementById('loadingContent')!;
  loggedInContent = document.getElementById('loggedInContent')!;
  loginForm = document.getElementById('loginForm')!;
  errorMessage = document.getElementById('errorMessage')!;

  userEmail = document.getElementById('userEmail')!;
  serverUrl = document.getElementById('serverUrl') as HTMLAnchorElement;

  providerUrlInput = document.getElementById('providerUrl') as HTMLInputElement;
  userIdInput = document.getElementById('userId') as HTMLInputElement;
  tokenInput = document.getElementById('token') as HTMLInputElement;
  domainInput = document.getElementById('domain') as HTMLInputElement;

  autoSyncButton = document.getElementById('autoSyncButton') as HTMLButtonElement;
  manualSetupButton = document.getElementById('manualSetupButton') as HTMLButtonElement;
  syncButton = document.getElementById('syncButton') as HTMLButtonElement;
  logoutButton = document.getElementById('logoutButton') as HTMLButtonElement;
  openRegisterButton = document.getElementById('openRegisterButton') as HTMLButtonElement;

  // Set up event listeners
  autoSyncButton.addEventListener('click', handleAutoSync);
  manualSetupButton.addEventListener('click', handleManualSetup);
  syncButton.addEventListener('click', handleSync);
  logoutButton.addEventListener('click', handleLogout);
  openRegisterButton.addEventListener('click', handleOpenRegister);

  // Set up tab switching
  setupTabs();

  // Check login status
  await checkLoginStatus();
}

/**
 * Set up tab switching functionality
 */
function setupTabs(): void {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');

      // Remove active class from all buttons and panels
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanels.forEach(panel => panel.classList.remove('active'));

      // Add active class to clicked button and corresponding panel
      button.classList.add('active');
      const targetPanel = document.querySelector(`[data-panel="${targetTab}"]`);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  });
}

/**
 * Check if user is logged in and show appropriate UI
 */
async function checkLoginStatus(): Promise<void> {
  try {
    const message: MessageType = { type: 'GET_STATUS' };
    const response = await browser.runtime.sendMessage(message);

    if (response?.isLoggedIn && response.credentials) {
      showLoggedInUI(response.credentials);
    } else {
      showLoginUI();
    }
  } catch (error) {
    console.error('[OpenPIMS] Error checking login status:', error);
    showLoginUI();
  }
}

/**
 * Show logged in UI
 */
function showLoggedInUI(credentials: Credentials): void {
  loadingContent.classList.add('hidden');
  loginForm.classList.add('hidden');
  loggedInContent.classList.remove('hidden');

  userEmail.textContent = credentials.email || `User ${credentials.userId}`;
  serverUrl.textContent = credentials.serverUrl;
  serverUrl.href = credentials.serverUrl;
}

/**
 * Show login UI
 */
function showLoginUI(): void {
  loadingContent.classList.add('hidden');
  loggedInContent.classList.add('hidden');
  loginForm.classList.remove('hidden');
}

/**
 * Show error message
 */
function showError(message: string): void {
  if (!errorMessage) {
    console.error('[OpenPIMS] Error message element not found');
    return;
  }

  errorMessage.textContent = message;
  errorMessage.classList.remove('hidden');

  // Auto-hide after 5 seconds
  setTimeout(() => {
    errorMessage.classList.add('hidden');
  }, 5000);
}

/**
 * Handle auto sync button click
 */
async function handleAutoSync(): Promise<void> {
  const url = providerUrlInput.value.trim();

  if (!OpenPIMSApi.validateServerUrl(url)) {
    showError('Bitte geben Sie eine gültige URL ein (z.B. https://openpims.de)');
    return;
  }

  autoSyncButton.disabled = true;
  autoSyncButton.textContent = 'Synchronisiere...';

  try {
    // Fetch setup data from server
    const setupData = await OpenPIMSApi.autoSetup(url);

    // Login with fetched credentials
    const message: MessageType = {
      type: 'LOGIN',
      credentials: {
        userId: setupData.userId,
        secret: setupData.token,
        appDomain: setupData.domain,
        email: setupData.email,
        serverUrl: url,
        isLoggedIn: true
      }
    };

    const response = await browser.runtime.sendMessage(message);

    if (!response?.success) {
      throw new Error('Login fehlgeschlagen');
    }

    // Wait a bit for storage to update
    await new Promise(resolve => setTimeout(resolve, 200));

    // Show success and refresh UI
    await checkLoginStatus();
  } catch (error) {
    console.error('[OpenPIMS] Auto-sync error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unbekannter Fehler beim Synchronisieren';
    showError(errorMsg);
  } finally {
    autoSyncButton.disabled = false;
    autoSyncButton.innerHTML = '<span class="icon">🔄</span> Synchronisieren';
  }
}

/**
 * Handle manual setup button click
 */
async function handleManualSetup(): Promise<void> {
  const userId = userIdInput.value.trim();
  const token = tokenInput.value.trim();
  const domain = domainInput.value.trim();

  // Validate inputs
  if (!userId || !token || !domain) {
    showError('Bitte füllen Sie alle Felder aus');
    return;
  }

  if (token.length < 16) {
    showError('Token muss mindestens 16 Zeichen lang sein');
    return;
  }

  if (!/^[a-zA-Z0-9]+$/.test(userId)) {
    showError('Benutzer-ID darf nur Buchstaben und Zahlen enthalten');
    return;
  }

  if (!/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i.test(domain)) {
    showError('Bitte geben Sie eine gültige Domain ein');
    return;
  }

  manualSetupButton.disabled = true;
  manualSetupButton.textContent = 'Einrichten...';

  try {
    // Login with manual credentials
    const message: MessageType = {
      type: 'LOGIN',
      credentials: {
        userId,
        secret: token,
        appDomain: domain,
        serverUrl: `https://${domain}`,
        isLoggedIn: true
      }
    };

    const response = await browser.runtime.sendMessage(message);

    if (!response?.success) {
      throw new Error('Login fehlgeschlagen');
    }

    // Wait a bit for storage to update
    await new Promise(resolve => setTimeout(resolve, 100));

    // Clear form
    userIdInput.value = '';
    tokenInput.value = '';

    // Show success and refresh UI
    await checkLoginStatus();
  } catch (error) {
    showError('Fehler beim Einrichten: ' + (error as Error).message);
  } finally {
    manualSetupButton.disabled = false;
    manualSetupButton.textContent = 'Manuell einrichten';
  }
}

/**
 * Handle sync button click (refresh for logged in user)
 */
async function handleSync(): Promise<void> {
  syncButton.disabled = true;
  syncButton.textContent = 'Synchronisiere...';

  try {
    const credentials = await CredentialStorage.get();

    if (!credentials.isLoggedIn) {
      showError('Nicht eingeloggt');
      return;
    }

    // Try to fetch updated data from server
    const setupData = await OpenPIMSApi.autoSetup(credentials.serverUrl);

    // Update credentials if changed
    if (setupData.token !== credentials.secret || setupData.userId !== credentials.userId) {
      const message: MessageType = {
        type: 'LOGIN',
        credentials: {
          userId: setupData.userId,
          secret: setupData.token,
          appDomain: setupData.domain,
          email: setupData.email,
          serverUrl: credentials.serverUrl,
          isLoggedIn: true
        }
      };

      await browser.runtime.sendMessage(message);
    }

    // Refresh UI
    await checkLoginStatus();
  } catch (error) {
    showError('Fehler beim Synchronisieren: ' + (error as Error).message);
  } finally {
    syncButton.disabled = false;
    syncButton.innerHTML = '<span class="icon">🔄</span> Jetzt synchronisieren';
  }
}

/**
 * Handle logout button click
 */
async function handleLogout(): Promise<void> {
  if (confirm('Möchten Sie sich wirklich ausloggen?')) {
    const message: MessageType = { type: 'LOGOUT' };
    await browser.runtime.sendMessage(message);
    await checkLoginStatus();
  }
}

/**
 * Handle register button click - opens registration page
 */
function handleOpenRegister(): void {
  // Get provider URL from input or use default
  const providerUrl = providerUrlInput?.value.trim() || 'https://openpims.de';

  // Extract base URL
  let baseUrl: string;
  try {
    const url = new URL(providerUrl);
    baseUrl = `${url.protocol}//${url.hostname}`;
  } catch {
    baseUrl = 'https://openpims.de';
  }

  // Open registration page with source parameter
  browser.tabs.create({
    url: `${baseUrl}/register?source=extension`
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}