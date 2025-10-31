import { browser } from 'wxt/browser';

export interface DomainRuleData {
  ruleId: number;
  createdDay: number;
  hash: string;
}

export interface DomainRulesStorage {
  domains: Record<string, DomainRuleData>;
  ruleIdCounter: number;
}

const STORAGE_KEY = 'openpims_domain_rules';

export class DomainRulesStorage {
  /**
   * Get all stored domain rules
   */
  static async get(): Promise<DomainRulesStorage> {
    const result = await browser.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || {
      domains: {},
      ruleIdCounter: 1000
    };
  }

  /**
   * Save domain rules to storage
   */
  static async set(data: DomainRulesStorage): Promise<void> {
    await browser.storage.local.set({
      [STORAGE_KEY]: data
    });
  }

  /**
   * Add or update a domain rule
   */
  static async setDomainRule(domain: string, ruleData: DomainRuleData): Promise<void> {
    const storage = await this.get();
    storage.domains[domain] = ruleData;
    await this.set(storage);
  }

  /**
   * Get a specific domain rule
   */
  static async getDomainRule(domain: string): Promise<DomainRuleData | undefined> {
    const storage = await this.get();
    return storage.domains[domain];
  }

  /**
   * Get and increment rule ID counter
   */
  static async getNextRuleId(): Promise<number> {
    const storage = await this.get();
    const ruleId = storage.ruleIdCounter;
    storage.ruleIdCounter++;
    await this.set(storage);
    return ruleId;
  }

  /**
   * Clear all domain rules
   */
  static async clear(): Promise<void> {
    await this.set({
      domains: {},
      ruleIdCounter: 1000
    });
  }

  /**
   * Get all domains
   */
  static async getAllDomains(): Promise<Map<string, DomainRuleData>> {
    const storage = await this.get();
    return new Map(Object.entries(storage.domains));
  }
}
