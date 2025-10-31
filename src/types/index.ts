/**
 * Core types for OpenPIMS Extension
 */

export interface Credentials {
  userId: string;
  secret: string;
  appDomain: string;
  email?: string;
  serverUrl: string;
  isLoggedIn: boolean;
}

export interface OpenPIMSRule {
  id: number;
  priority: number;
  action: {
    type: 'modifyHeaders';
    requestHeaders: HeaderModification[];
  };
  condition: {
    urlFilter: string;
    resourceTypes: chrome.declarativeNetRequest.ResourceType[];
  };
}

export interface HeaderModification {
  header: string;
  operation: 'set' | 'remove';
  value?: string;
}

export interface SetupResponse {
  userId: string;
  token: string;
  domain: string;
  email?: string;
}


export type MessageType =
  | { type: 'LOGIN'; credentials: Credentials }
  | { type: 'LOGOUT' }
  | { type: 'SYNC'; serverUrl: string }
  | { type: 'GET_STATUS' }
  | { type: 'STATUS_RESPONSE'; isLoggedIn: boolean; credentials?: Credentials };