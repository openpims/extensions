# ChangeTheHeaders - Complete Reverse Engineering Analysis

## Overview
**Developer:** Jeff Johnson (Underpass App Company)
**Release Date:** March 2025
**Version:** 2.1 (Build 19)
**License:** Proprietary (Copyright 2025)
**App Store:** https://apps.apple.com/app/changetheheaders/id6738314662

## Architecture

### Manifest V2
```json
{
  "manifest_version": 2,
  "background": {
    "persistent": false,
    "scripts": ["background.js"]
  },
  "permissions": [
    "alarms",
    "declarativeNetRequestWithHostAccess",
    "nativeMessaging",
    "<all_urls>"
  ]
}
```

**Key Points:**
- Uses Manifest V2 (not V3!)
- Non-persistent background script
- Uses `nativeMessaging` for iCloud sync via native macOS app
- `declarativeNetRequestWithHostAccess` (same permission as OpenPIMS)

## Core Components

### 1. Background Script (`background.js` - 254 lines)

#### Main Function: `overrideHeadersReloadRules()`
**Location:** Lines 27-142

**Critical Logic - The Safari Workaround:**
```javascript
// Lines 54-60
const resources = setting.resources;
if (resources.length > 0) {
    priority += 1;
    condition.resourceTypes = resources.split(" ");
} else {
    condition.excludedResourceTypes = [];  // ← THE KEY!
}
```

**Analysis:**
- When user leaves "Resource Types" field EMPTY
- Sets `excludedResourceTypes: []` instead of `resourceTypes`
- This means: "Exclude nothing" = allow all resource types
- **This is why it works in Safari!**

#### Rule Structure
```javascript
const rule = {
    id: ruleId,
    action: {
        requestHeaders: [{
            header: headerSetting,    // e.g., "User-Agent"
            value: valueSetting,       // Full header value
            operation: "set"           // Replace entire header
        }],
        type: "modifyHeaders"
    },
    condition: {
        domains: [...],               // Optional domain filter
        resourceTypes: [...],         // Optional (if specified)
        excludedResourceTypes: [],    // Used if resourceTypes empty!
        urlFilter: "..."              // Optional URL pattern
    },
    priority: 1-9                     // Dynamic priority calculation
};
```

#### Priority Calculation (Lines 47-67)
```javascript
let priority = 1;  // Base priority

// +2 if domains specified
if (domains.length > 0) {
    priority += 2;
    condition.domains = domains.split(" ");
}

// +1 if resource types specified
if (resources.length > 0) {
    priority += 1;
    condition.resourceTypes = resources.split(" ");
} else {
    condition.excludedResourceTypes = [];  // Safari workaround!
}

// +3 if URL filter specified
if (typeof urlFilter === "string" && urlFilter.length > 0) {
    priority += 3;
    condition.urlFilter = urlFilter;
}

rule.priority = priority;  // Final: 1-9
```

**Priority Ranges:**
- `1`: No filters (wildcard)
- `2`: Base + domain filter
- `3`: Base + resource types
- `4`: Base + URL filter
- `5`: Domain + resource types
- `6`: Domain + URL filter
- `7`: Resource types + URL filter
- `9`: All three filters

#### Update Strategy (Lines 75-132)
```javascript
// Smart diff-based updates
chrome.declarativeNetRequest.getDynamicRules().then((rules) => {
    const oldRulesLength = rules.length;
    const newRules = [];

    // Build new rules list
    for (const setting of settings) {
        if (setting.enabled) {
            // ... create rule
            newRules.push(rule);
        }
    }

    // Compare old vs new
    let update = false;
    if (newRulesLength !== oldRulesLength) {
        update = true;
    } else {
        // Check each rule for differences
        for (const oldRule of rules) {
            // Compare priority, headers, conditions
            if (/* any difference */) {
                update = true;
                break;
            }
        }
    }

    // Only update if changed
    if (update) {
        chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: oldRules.map(r => r.id),
            addRules: newRules
        });
    }
});
```

**Optimization:** Only calls `updateDynamicRules()` when rules actually changed!

### 2. Native Messaging Integration

**Critical Feature:** iCloud Sync via native macOS app

```javascript
// Lines 148-166
chrome.runtime.sendNativeMessage("application.id", message, function(response) {
    const runtimeLastError = chrome.runtime.lastError;
    if (runtimeLastError) {
        console.error(runtimeLastError);
        sendResponse({lastError: runtimeLastError.message});
    } else {
        if (typeof response === "object") {
            if (response.iCloudUseSync === true && response.iCloudModified === false) {
                overrideHeadersResetAlarm();
            }
            if (reload) {
                overrideHeadersReloadRules(response, sendResponse);
                return;
            }
        }
        sendResponse(response);
    }
});
```

**Native App Communication:**
- Settings stored in native macOS app (not extension storage)
- iCloud sync handled by native app
- Extension uses `nativeMessaging` to read/write settings
- Alarm-based sync every 30 minutes

### 3. Alarm-based Sync (Lines 227-246)

```javascript
function overrideHeadersResetAlarm(delay = 30) {
    chrome.alarms.create("iCloudSync", {
        delayInMinutes: delay,
        periodInMinutes: 30  // Sync every 30 minutes
    });
}

function overrideHeadersAlarm(alarm) {
    chrome.runtime.sendNativeMessage("application.id", {name: "iCloudSync"}, function(response) {
        if (typeof response === "object") {
            if (response.iCloudUseSync === true) {
                overrideHeadersResetAlarm();
            } else {
                chrome.alarms.clearAll();
            }
            overrideHeadersReloadRules(response);
        }
    });
}

chrome.alarms.onAlarm.addListener(overrideHeadersAlarm);
```

### 4. UI Component (`options.js` - 323 lines)

#### Data Structure
```javascript
let overrideHeadersList = [
    {
        header: "User-Agent",
        value: "Mozilla/5.0...",
        domains: "www.youtube.com",  // Space-separated
        resources: "main_frame",      // Space-separated
        urlFilter: "https://*.google.com/*",
        enabled: true
    }
];
```

#### Settings Persistence
```javascript
function saveSettings(reloadRules) {
    chrome.runtime.sendMessage({
        name: "syncSettings",
        settings: overrideHeadersList,
        reload: reloadRules  // Only reload rules if needed
    }, sendMessageResponse);
}
```

**Smart Reload:**
- Only reloads declarativeNetRequest rules when necessary
- Not on every keystroke - only on blur events
- Saves settings immediately but defers rule reload

#### Auto-Sort Feature (Lines 138-174)
```javascript
function headerCompare(a, b) {
    // 1. Sort by header name
    const aName = a.header.toLowerCase();
    const bName = b.header.toLowerCase();
    if (aName < bName) return -1;
    if (aName > bName) return 1;

    // 2. Then by domain
    const aDomains = a.domains.toLowerCase();
    const bDomains = b.domains.toLowerCase();
    if (aDomains < bDomains) return -1;
    if (aDomains > bDomains) return 1;

    // 3. Then by resource types
    const aResources = a.resources.toLowerCase();
    const bResources = b.resources.toLowerCase();
    if (aResources < bResources) return -1;
    if (aResources > bResources) return 1;

    // 4. Finally by URL filter
    // ...

    return 0;
}

overrideHeadersList.sort(headerCompare);
```

## Key Differences vs OpenPIMS

| Feature | ChangeTheHeaders | OpenPIMS |
|---------|-----------------|----------|
| **Manifest** | V2 | V2 (Safari), V3 (Chrome) |
| **Background** | Non-persistent | Non-persistent (Safari), Service Worker (Chrome) |
| **Storage** | Native app + nativeMessaging | Extension storage |
| **iCloud Sync** | Yes (via native app) | No |
| **Rule Creation** | User-configured (static data, dynamic rules) | Auto-generated HMAC (dynamic) |
| **Resource Types** | `excludedResourceTypes: []` when empty | `resourceTypes: [...]` explicit list |
| **Safari Workaround** | Yes - uses excludedResourceTypes | No (we just added it!) |
| **Header Operation** | `set` (replace entire header) | `set` (append to User-Agent) |
| **Priority System** | 1-9 dynamic based on filters | Fixed (1 for wildcard, 100 for domain) |
| **Update Strategy** | Diff-based (only if changed) | Always updates |
| **Settings UI** | Full CRUD interface | Login/Manual/Register tabs |

## The Critical Safari Bug Workaround

**The Problem:**
```javascript
// DOESN'T WORK in Safari
condition: {
    resourceTypes: ['main_frame', 'sub_frame', ...]
}
```

**The Solution (ChangeTheHeaders):**
```javascript
// WORKS in Safari!
condition: {
    excludedResourceTypes: []  // Empty array = exclude nothing
}
```

**Why it works:**
- Safari has a bug with explicit `resourceTypes` arrays
- But `excludedResourceTypes: []` works fine
- Empty array means "exclude nothing" = all types allowed
- For specific types, exclude everything EXCEPT what you want:

```javascript
// To get only main_frame:
condition: {
    excludedResourceTypes: [
        'sub_frame', 'stylesheet', 'script', 'image', 'font',
        'object', 'xmlhttprequest', 'ping', 'media', 'websocket', 'other'
    ]
}
```

## Performance Optimizations

### 1. Diff-Based Updates
Only calls `updateDynamicRules()` when rules actually changed

### 2. Deferred Saves
- Settings saved on blur (not every keystroke)
- Rule reload only when necessary (not on every setting change)

### 3. Smart Priority
Dynamic priority calculation ensures most specific rules win

### 4. Alarm-Based Sync
Background sync every 30 minutes (not constant polling)

## Security Considerations

### Permissions
- `<all_urls>`: Required for declarativeNetRequest
- `nativeMessaging`: Required for iCloud sync
- `alarms`: For periodic sync
- `declarativeNetRequestWithHostAccess`: For header modification

### Data Storage
- Settings stored in native macOS app (not in extension)
- Uses macOS Keychain for iCloud sync
- No web-based storage or tracking

## Browser Compatibility

**Safari Only:**
- Uses Safari-specific `nativeMessaging` for macOS app integration
- Manifest V2 (Safari doesn't support V3 fully yet)
- Works on macOS 14+, iOS 17+, iPadOS 17+, visionOS 1+

**Not compatible with:**
- Chrome, Firefox, Edge (uses Safari-specific native messaging)

## Pricing Model
- One-time purchase: $4.99 USD
- Universal purchase (macOS + iOS + iPadOS + visionOS)
- No subscriptions or in-app purchases

## Conclusion

### What We Learned for OpenPIMS

1. **`excludedResourceTypes: []` is the Safari fix!**
   - This is the key workaround for Safari's declarativeNetRequest bug
   - We've now implemented this in OpenPIMS

2. **Simpler is Better:**
   - ChangeTheHeaders uses simple data structures
   - No complex caching or pre-computation
   - Dynamic rules created on-demand from user settings

3. **Native App Integration:**
   - Jeff Johnson uses a native macOS app for settings storage
   - This allows iCloud sync across devices
   - OpenPIMS could consider this for future versions

4. **Smart Updates:**
   - Only update rules when they actually change
   - Saves API calls and improves performance

5. **Priority System:**
   - Dynamic priority based on specificity is clever
   - More specific rules automatically get higher priority

### Files Analyzed
- `manifest.json` - 30 lines
- `background.js` - 254 lines
- `options.js` - 323 lines
- `options.html` - 95 lines
- `style.css` - minimal

**Total Code:** ~700 lines (much simpler than OpenPIMS!)

### Key Takeaway
**The Safari bug workaround is `excludedResourceTypes: []` instead of `resourceTypes: [...]`**

This is now implemented in OpenPIMS and should make Safari support possible!