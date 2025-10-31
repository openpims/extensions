import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/sandbox';
import { CredentialStorage } from '../src/storage/credentials';
import { RuleManagerSync } from '../src/core/rules-sync';
import { MessageType } from '../src/types';
import { getTimeUntilExpiry } from '../src/core/hmac-sync';

export default defineBackground({
  type: 'module',
  main() {
    // Initialize on install/startup
    browser.runtime.onInstalled.addListener(handleInstall);
    browser.runtime.onStartup.addListener(handleStartup);

    // Listen for storage changes (login/logout)
    CredentialStorage.onChanged(handleStorageChange);

    // Listen for navigation events - CRITICAL: onBeforeNavigate for earliest interception
    browser.webNavigation.onBeforeNavigate.addListener(handleNavigation);

    // Handle messages from popup
    browser.runtime.onMessage.addListener(handleMessage);

    // Set up alarms for periodic updates (works in all browsers)
    setupAlarms();

    // Listen for alarms
    browser.alarms.onAlarm.addListener(handleAlarm);
  }
});

/**
 * Handle extension installation
 */
async function handleInstall(details: chrome.runtime.InstalledDetails): Promise<void> {
  await initializeRules();
}

/**
 * Handle browser startup
 */
async function handleStartup(): Promise<void> {
  await refreshAllRulesOnStartup();
}

/**
 * Refresh all stored domain rules on browser startup
 * This ensures all rules use the current day's hash
 */
async function refreshAllRulesOnStartup(): Promise<void> {
  const credentials = await CredentialStorage.get();

  if (credentials.isLoggedIn) {
    await RuleManagerSync.refreshAllRulesForCurrentDay(credentials);
  } else {
    await RuleManagerSync.clearAllRules();
    await RuleManagerSync.setNotConfiguredRule();
  }
}

/**
 * Initialize rules based on login status
 */
async function initializeRules(): Promise<void> {
  const credentials = await CredentialStorage.get();

  if (credentials.isLoggedIn) {
    await RuleManagerSync.initializeForAllTabs(credentials);
  } else {
    await RuleManagerSync.clearAllRules();
    await RuleManagerSync.setNotConfiguredRule();
  }
}

/**
 * Handle storage changes (login/logout)
 */
async function handleStorageChange(
  changes: { [key: string]: chrome.storage.StorageChange }
): Promise<void> {
  const credChange = changes.openpims_credentials;
  if (!credChange) return;

  const oldValue = credChange.oldValue;
  const newValue = credChange.newValue;

  // Check for login state change
  if (oldValue?.isLoggedIn !== newValue?.isLoggedIn) {
    if (newValue?.isLoggedIn) {
      const credentials = await CredentialStorage.get();
      await RuleManagerSync.initializeForAllTabs(credentials);
    } else {
      await RuleManagerSync.clearAllRules();
      await RuleManagerSync.setNotConfiguredRule();
    }
  }
}

/**
 * Handle navigation - Ensures domain has up-to-date rule
 * Uses existing rule immediately, updates in background if needed
 */
async function handleNavigation(details: chrome.webNavigation.WebNavigationParentedCallbackDetails): Promise<void> {
  // Only handle main frame navigations
  if (details.frameId !== 0) return;

  try {
    const url = new URL(details.url);
    const domain = url.hostname;

    // Skip browser internal pages
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return;
    }

    // Get credentials from storage (iOS-compatible: no memory cache)
    const credentials = await CredentialStorage.get();
    if (!credentials?.userId || !credentials?.secret || !credentials?.appDomain) {
      return;
    }

    // Add/update domain-specific rule
    // This will:
    // - Use existing rule if present (even if from yesterday)
    // - Create new rule if domain is new
    // - Update rule in background if outdated
    RuleManagerSync.addDomainSpecificRule(domain, credentials);

  } catch (error) {
    console.error('[OpenPIMS] Navigation error:', error);
  }
}

/**
 * Handle messages from popup
 */
function handleMessage(
  message: MessageType,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
): boolean {
  // Handle async operations
  (async () => {
    try {
      switch (message.type) {
        case 'GET_STATUS':
          const credentials = await CredentialStorage.get();
          sendResponse({
            type: 'STATUS_RESPONSE',
            isLoggedIn: credentials.isLoggedIn,
            credentials: credentials.isLoggedIn ? credentials : undefined
          });
          break;

        case 'LOGIN':
          await CredentialStorage.login(
            message.credentials.userId,
            message.credentials.secret,
            message.credentials.appDomain,
            message.credentials.email,
            message.credentials.serverUrl
          );
          sendResponse({ success: true });
          break;

        case 'LOGOUT':
          await CredentialStorage.logout();
          sendResponse({ success: true });
          break;

        default:
          console.warn('Unknown message type:', (message as any).type);
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('[OpenPIMS] Error handling message:', error);
      sendResponse({ error: (error as Error).message });
    }
  })();

  return true; // Keep message channel open for async response
}

/**
 * Set up alarms for periodic updates
 * Uses chrome.alarms API (works in all browsers including Chrome service workers)
 */
async function setupAlarms(): Promise<void> {
  // Create hourly alarm for checking if rules need updates
  await browser.alarms.create('hourly-check', {
    periodInMinutes: 60
  });

  // Create daily alarm for midnight UTC refresh
  const msUntilMidnight = getTimeUntilExpiry();
  const minutesUntilMidnight = Math.ceil(msUntilMidnight / 1000 / 60);

  await browser.alarms.create('midnight-refresh', {
    delayInMinutes: minutesUntilMidnight,
    periodInMinutes: 24 * 60 // Repeat every 24 hours
  });
}

/**
 * Handle alarm events
 */
async function handleAlarm(alarm: chrome.alarms.Alarm): Promise<void> {
  const credentials = await CredentialStorage.get();

  if (!credentials.isLoggedIn) {
    return;
  }

  switch (alarm.name) {
    case 'hourly-check':
      await RuleManagerSync.refreshAllRulesForCurrentDay(credentials);
      break;

    case 'midnight-refresh':
      await RuleManagerSync.refreshAllRulesForCurrentDay(credentials);
      break;
  }
}

