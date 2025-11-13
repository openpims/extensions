# Safari declarativeNetRequest Investigation

## Problem Statement
User-Agent header modification via `declarativeNetRequest` funktioniert nicht in Safari, obwohl andere Extensions wie ChangeTheHeaders behaupten, es zu können.

## Bekannte funktionierende Extension
**ChangeTheHeaders** (Jeff Johnson, Underpass App Company)
- App Store: https://apps.apple.com/app/changetheheaders/id6738314662
- Veröffentlicht: März 2025
- Unterstützt: iOS 17+, macOS 14+, visionOS 1+
- **Funktioniert** laut Entwickler für: Accept, Accept-Language, User-Agent, Cookie

## WebKit Bugs
### Bug #290922 - "declarativeNetRequest modifyHeaders doesn't support custom headers"
- **Gemeldet:** 2025-04-02 (NACH ChangeTheHeaders Release!)
- **Status:** NEW (Priority P2)
- **Radar:** rdar://problem/148430468
- **Problem:** "Unlike Chrome and Firefox, Safari doesn't support custom headers"
- **URL:** https://bugs.webkit.org/show_bug.cgi?id=290922

### Bug #293576 - "declarativeNetRequest modifyHeaders ignores rules for fetch requests"
- **Gemeldet:** 2025-05-26
- **Status:** RESOLVED DUPLICATE
- **Problem:** "Safari ignores rules for `modifyHeaders` when making `fetch` request"
- **Betrifft:** Safari 18.5 und Safari Technology Preview Release 219

## Wichtiger Zeitlicher Ablauf
1. **März 2025:** ChangeTheHeaders released - funktioniert angeblich
2. **April 2025:** Bug #290922 gemeldet - modifyHeaders funktioniert nicht
3. **Mai 2025:** Bug #293576 gemeldet - fetch requests betroffen

**Hypothese:** Safari hatte einen Breaking Change zwischen März und April 2025, der `modifyHeaders` kaputt gemacht hat!

## Mögliche Erklärungen

### Theorie 1: Safari Version Regression
- ChangeTheHeaders funktioniert in Safari 17.x / macOS 14
- Safari 18.x hat einen neuen Bug eingeführt
- Unsere Tests waren alle auf Safari 18.x+

**Test:** Extension auf Safari 17.x / macOS 14 testen

### Theorie 2: Static vs Dynamic Rules
**ChangeTheHeaders nutzt möglicherweise Static Rules:**
```json
// manifest.json
"declarative_net_request": {
  "rule_resources": [{
    "id": "ruleset",
    "enabled": true,
    "path": "rules.json"  // ← Static rules
  }]
}
```

**OpenPIMS nutzt Dynamic Rules:**
```typescript
// Zur Laufzeit erstellt
await browser.declarativeNetRequest.updateDynamicRules({
  addRules: [rule]
});
```

**WebKit Bug #290922 und #293576 erwähnen beide `updateDynamicRules()` explizit!**

**Test:** Static Rules statt Dynamic Rules verwenden

### Theorie 3: Resource Types
**ChangeTheHeaders fokussiert auf:**
- `image`, `main_frame`, `sub_frame`, `script`

**OpenPIMS nutzt:**
- `xmlhttprequest`, `sub_frame`, `main_frame`

**Bug #293576 erwähnt explizit `fetch` requests!**

**Test:** Nur `main_frame` Resource Type verwenden

### Theorie 4: URL Filter Patterns
**ChangeTheHeaders nutzt:**
- Domain-spezifische Patterns (z.B. `www.youtube.com`)
- Möglicherweise keine Wildcards

**OpenPIMS nutzt:**
- Wildcard pattern: `*://*/*`
- Domain-spezifische Patterns mit Wildcards

**Test:** Simplified pattern ohne Wildcards

### Theorie 5: Header-Wert Format
**ChangeTheHeaders setzt komplette Header-Werte:**
```
User-Agent: Mozilla/5.0 (Macintosh...) Chrome/134.0.0.0 Safari/537.36
```

**OpenPIMS appended an User-Agent:**
```
User-Agent: [existing] OpenPIMS/2.0 (https://...)
```

**Test:** Kompletten User-Agent ersetzen statt append

## Geplante Tests

### Test 1: Static Rules
```json
// manifest.json (Safari only)
"declarative_net_request": {
  "rule_resources": [{
    "id": "openpims-static",
    "enabled": true,
    "path": "safari-rules.json"
  }]
}
```

```json
// safari-rules.json
[{
  "id": 1,
  "priority": 1,
  "action": {
    "type": "modifyHeaders",
    "requestHeaders": [{
      "header": "User-Agent",
      "operation": "set",
      "value": "Mozilla/5.0... OpenPIMS/2.0 (https://test.openpims.de)"
    }]
  },
  "condition": {
    "urlFilter": "https://example.com/*",
    "resourceTypes": ["main_frame"]
  }
}]
```

### Test 2: Nur main_frame Resource Type
```typescript
const rule = {
  id: 1,
  priority: 1,
  action: {
    type: 'modifyHeaders',
    requestHeaders: [{
      header: 'User-Agent',
      operation: 'set',
      value: userAgent
    }]
  },
  condition: {
    urlFilter: '*://*/*',
    resourceTypes: ['main_frame'] // Nur main_frame!
  }
};
```

### Test 3: Safari 17.x / macOS 14
- VM mit macOS 14 Sonoma
- Safari 17.x installieren
- Extension mit Dynamic Rules testen

### Test 4: Simplified Pattern
```typescript
// Statt Wildcard
urlFilter: 'https://example.com/*'
// Statt
urlFilter: '*://*/*'
```

## Aktueller Stand

**Status:** Cookie-Fallback implementiert und funktioniert
**Grund:** Alle Versuche mit `declarativeNetRequest` gescheitert
**Aber:** Weitere Tests möglich mit oben genannten Theorien

## Empfehlung

1. **Kurzfristig:** Cookie-Fallback beibehalten (funktioniert garantiert)
2. **Mittelfristig:** Static Rules testen (vielversprechendste Theorie)
3. **Langfristig:** Auf Apple WebKit Bug Fix warten

## Referenzen
- ChangeTheHeaders: https://underpassapp.com/ChangeTheHeaders/
- WebKit Bug #290922: https://bugs.webkit.org/show_bug.cgi?id=290922
- WebKit Bug #293576: https://bugs.webkit.org/show_bug.cgi?id=293576
- Jeff Johnson Blog: https://lapcatsoftware.com/articles/2025/3/1.html