import { browser } from 'wxt/browser';
import { OpenPIMSRule, Credentials, HeaderModification } from '../types';
import { generateOpenPIMSUrl } from './hmac-sync';
import { DomainRulesStorage, DomainRuleData } from '../storage/domain-rules';

/**
 * SYNCHRONOUS Rule Manager - ensures rules are created immediately
 * Based on the working Chromium extension approach
 */
// Track domain rules with creation day
interface DomainRuleInfo {
  ruleId: number;
  createdDay: number; // dayTimestamp when rule was created
  hash: string; // The HMAC hash for this domain
}

export class RuleManagerSync {
  private static ruleIdCounter = 1000; // Start with higher ID to avoid conflicts
  private static readonly NOT_CONFIGURED_RULE_ID = 999999;
  private static readonly WILDCARD_RULE_ID = 1;
  private static readonly MAX_RULES = 5000;
  private static domainsWithRules = new Map<string, DomainRuleInfo>();

  /**
   * Get all resource types for the rule
   */
  private static getResourceTypes(): chrome.declarativeNetRequest.ResourceType[] {
    return [
      'main_frame',
      'sub_frame',
      'stylesheet',
      'script',
      'image',
      'font',
      'object',
      'xmlhttprequest',
      'ping',
      'media',
      'websocket',
      'other'
    ] as chrome.declarativeNetRequest.ResourceType[];
  }

  /**
   * Creates a rule for a specific domain - now uses stored hash
   */
  static createDomainRule(
    domain: string,
    ruleId: number,
    credentials: Credentials,
    openpimsUrl: string
  ): OpenPIMSRule {
    // Use pre-calculated hash (passed as parameter)

    const headers: HeaderModification[] = [];

    // Note: Chrome's declarativeNetRequest doesn't support custom headers like X-OpenPIMS
    // We can only modify standard headers

    // Always add User-Agent modification
    // This SHOULD work on first request!
    headers.push({
      header: 'User-Agent',
      operation: 'set',
      value: `${navigator.userAgent} OpenPIMS/2.0 (${openpimsUrl})`
    });

    return {
      id: ruleId,
      priority: 100, // Higher priority than wildcard rule
      action: {
        type: 'modifyHeaders',
        requestHeaders: headers
      },
      condition: {
        urlFilter: `*://${domain}/*`,
        resourceTypes: this.getResourceTypes()
      }
    };
  }

  /**
   * Get current day timestamp
   */
  private static getCurrentDay(): number {
    return Math.floor(Date.now() / 1000 / 86400);
  }

  /**
   * Add or update rule for domain
   * Uses existing rule immediately, updates in background if needed
   */
  static addDomainSpecificRule(
    domain: string,
    credentials: Credentials
  ): void {
    const currentDay = this.getCurrentDay();
    const existingRule = this.domainsWithRules.get(domain);

    // If rule exists and is from today, nothing to do
    if (existingRule && existingRule.createdDay === currentDay) {
      return;
    }

    // If rule exists but from yesterday, it's still being used
    // We'll update it in background
    if (existingRule && existingRule.createdDay < currentDay) {
      // Keep using old rule, update async
      this.updateDomainRuleAsync(domain, existingRule.ruleId, credentials, currentDay);
      return;
    }

    // New domain - create rule
    this.createNewDomainRule(domain, credentials, currentDay);
  }

  /**
   * Create a new domain rule (async)
   */
  private static async createNewDomainRule(
    domain: string,
    credentials: Credentials,
    currentDay: number
  ): Promise<void> {
    // Generate HMAC hash using Web Crypto API
    const openpimsUrl = await generateOpenPIMSUrl(
      credentials.userId,
      credentials.secret,
      domain,
      credentials.appDomain
    );

    // Get next rule ID from storage
    const ruleId = await DomainRulesStorage.getNextRuleId();

    // Track domain IMMEDIATELY in memory
    this.domainsWithRules.set(domain, {
      ruleId,
      createdDay: currentDay,
      hash: openpimsUrl
    });

    // Also save to persistent storage
    await DomainRulesStorage.setDomainRule(domain, {
      ruleId,
      createdDay: currentDay,
      hash: openpimsUrl
    });

    // Create rule with the generated hash
    const rule = this.createDomainRule(domain, ruleId, credentials, openpimsUrl);

    // Update rules
    try {
      await browser.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [ruleId],
        addRules: [rule as any]
      });
    } catch (error) {
      console.error(`[OpenPIMS] Error applying rule for ${domain}:`, error);
      this.domainsWithRules.delete(domain);
    }
  }

  /**
   * Update existing rule with new hash (async, doesn't block)
   */
  private static async updateDomainRuleAsync(
    domain: string,
    ruleId: number,
    credentials: Credentials,
    newDay: number
  ): Promise<void> {
    // Generate new HMAC hash for today
    const openpimsUrl = await generateOpenPIMSUrl(
      credentials.userId,
      credentials.secret,
      domain,
      credentials.appDomain
    );

    const ruleData: DomainRuleData = {
      ruleId,
      createdDay: newDay,
      hash: openpimsUrl
    };

    // Update tracking immediately (memory)
    this.domainsWithRules.set(domain, ruleData);

    // Update persistent storage
    await DomainRulesStorage.setDomainRule(domain, ruleData);

    // Create new rule with updated hash
    const rule = this.createDomainRule(domain, ruleId, credentials, openpimsUrl);

    // Update rule async
    try {
      await browser.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [ruleId],
        addRules: [rule as any]
      });
    } catch (error) {
      console.error(`[OpenPIMS] Error updating rule for ${domain}:`, error);
    }
  }

  /**
   * Clear all rules and reset state
   */
  static async clearAllRules(): Promise<void> {
    const existingRules = await browser.declarativeNetRequest.getDynamicRules();
    const ruleIds = existingRules.map(r => r.id);

    if (ruleIds.length > 0) {
      await browser.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIds
      });
    }

    this.domainsWithRules.clear();
    this.ruleIdCounter = 1000; // Reset to starting value
  }

  /**
   * Set not-configured rule
   */
  static async setNotConfiguredRule(): Promise<void> {
    const rule: OpenPIMSRule = {
      id: this.NOT_CONFIGURED_RULE_ID,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [{
          header: 'User-Agent',
          operation: 'set',
          value: `${navigator.userAgent} OpenPIMS/2.0 ()`
        }]
      },
      condition: {
        urlFilter: '*://*/*',
        resourceTypes: ['main_frame'] as chrome.declarativeNetRequest.ResourceType[]
      }
    };

    await browser.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [this.NOT_CONFIGURED_RULE_ID],
      addRules: [rule as any]
    });
  }

  /**
   * Initialize rules for all open tabs - happens on login
   * Creates both wildcard rule AND domain-specific rules
   */
  static async initializeForAllTabs(credentials: Credentials): Promise<void> {
    // Clear existing rules first
    await this.clearAllRules();

    // Create wildcard rule with just appDomain for FIRST requests to new domains
    // No hash, no user identification - just the OpenPIMS domain
    const wildcardRule = {
      id: 1,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [{
          header: 'User-Agent',
          operation: 'set',
          value: `${navigator.userAgent} OpenPIMS/2.0 (https://${credentials.appDomain})`
        }]
      },
      condition: {
        urlFilter: '*://*/*',
        resourceTypes: this.getResourceTypes()
      }
    };

    await browser.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1],
      addRules: [wildcardRule as any]
    });

    // Get all tabs and create domain-specific rules for each
    const tabs = await browser.tabs.query({});
    const processedDomains = new Set<string>();

    // Always add app domain
    processedDomains.add(credentials.appDomain);
    this.addDomainSpecificRule(credentials.appDomain, credentials);

    for (const tab of tabs) {
      if (tab.url) {
        try {
          const url = new URL(tab.url);
          if ((url.protocol === 'http:' || url.protocol === 'https:') &&
              !processedDomains.has(url.hostname)) {
            processedDomains.add(url.hostname);
            this.addDomainSpecificRule(url.hostname, credentials);
          }
        } catch (e) {
          // Ignore invalid URLs
        }
      }
    }
  }

  /**
   * Check if domain has rule
   */
  static hasDomainRule(domain: string): boolean {
    return this.domainsWithRules.has(domain);
  }

  /**
   * Refresh all stored domain rules for current day
   * Called on browser startup to ensure all rules have today's hash
   */
  static async refreshAllRulesForCurrentDay(credentials: Credentials): Promise<void> {
    const currentDay = this.getCurrentDay();

    // Load all stored domains from persistent storage
    const storedDomains = await DomainRulesStorage.getAllDomains();

    // Populate memory cache
    this.domainsWithRules = storedDomains;

    // First, recreate the wildcard rule with just appDomain
    // No hash for first-time visits, just the OpenPIMS domain
    const wildcardRule = {
      id: this.WILDCARD_RULE_ID,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [{
          header: 'User-Agent',
          operation: 'set',
          value: `${navigator.userAgent} OpenPIMS/2.0 (https://${credentials.appDomain})`
        }]
      },
      condition: {
        urlFilter: '*://*/*',
        resourceTypes: this.getResourceTypes()
      }
    };

    await browser.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [this.WILDCARD_RULE_ID],
      addRules: [wildcardRule as any]
    });

    // Now refresh all domain-specific rules
    for (const [domain, ruleInfo] of storedDomains.entries()) {
      if (ruleInfo.createdDay < currentDay) {
        // Rule is outdated, update it
        this.updateDomainRuleAsync(domain, ruleInfo.ruleId, credentials, currentDay);
      } else {
        // Rule is already from today, but we still need to recreate it in browser
        // Use the stored hash (no need to recalculate)
        const rule = this.createDomainRule(domain, ruleInfo.ruleId, credentials, ruleInfo.hash);
        await browser.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: [ruleInfo.ruleId],
          addRules: [rule as any]
        });
      }
    }
  }
}