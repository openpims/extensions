# Safari Extension - Erfolgreicher Test ✅

## Status: FUNKTIONIERT!

**Datum:** 14. November 2025
**Safari Version:** 26.1
**macOS Version:** 10.15.7

## Test-Ergebnis

```json
{
  "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Safari/605.1.15 OpenPIMS/2.0 (https://e4562ddf984f6bcf6901af538ed46157.openpims.de)"
}
```

**Erfolgskriterien:**
- ✅ User-Agent Header wird modifiziert
- ✅ `OpenPIMS/2.0` wird korrekt angehängt
- ✅ Domain-spezifischer HMAC-Hash wird generiert: `e4562ddf984f6bcf6901af538ed46157`
- ✅ Vollständige URL: `https://e4562ddf984f6bcf6901af538ed46157.openpims.de`
- ✅ Tägliche Rotation funktioniert (basierend auf dayTimestamp)

## Die Lösung: `excludedResourceTypes` statt `resourceTypes`

### Das Problem (ursprünglich)
```typescript
// FUNKTIONIERT NICHT in Safari
condition: {
  urlFilter: '*://example.com/*',
  resourceTypes: ['main_frame', 'sub_frame', ...]
}
```

Safari ignorierte diese Rules komplett zur Laufzeit.

### Die Lösung
```typescript
// FUNKTIONIERT in Safari
condition: {
  urlFilter: '*://example.com/*',
  excludedResourceTypes: [
    'sub_frame', 'stylesheet', 'script', 'image', 'font',
    'object', 'xmlhttprequest', 'ping', 'media', 'websocket', 'other'
  ]
}
```

Indem wir alles AUSSER `main_frame` excludieren, erreichen wir das gleiche Ergebnis.

## Quelle der Lösung

**ChangeTheHeaders Extension** von Jeff Johnson (Underpass App Company)
- App Store: https://apps.apple.com/app/changetheheaders/id6738314662
- Release: März 2025
- Verwendet identischen Workaround

### Reverse Engineering
Datei: `background.js` Zeilen 54-60
```javascript
const resources = setting.resources;
if (resources.length > 0) {
    condition.resourceTypes = resources.split(" ");
} else {
    condition.excludedResourceTypes = [];  // ← THE KEY!
}
```

Wenn das `resources` Feld leer ist, verwendet ChangeTheHeaders `excludedResourceTypes: []` (leeres Array = excludiere nichts = erlaube alles).

## Implementierung in OpenPIMS

**Datei:** `src/core/rules-sync.ts`

**Browser Detection:**
```typescript
const isSafari = import.meta.env.BROWSER === 'safari';
```

**Condition Creation:**
```typescript
const condition: any = {
  urlFilter: `*://${domain}/*`
};

if (isSafari) {
  // Exclude everything EXCEPT main_frame
  condition.excludedResourceTypes = [
    'sub_frame', 'stylesheet', 'script', 'image', 'font',
    'object', 'xmlhttprequest', 'ping', 'media', 'websocket', 'other'
  ];
} else {
  // Chrome/Firefox: Use resourceTypes (works fine)
  condition.resourceTypes = this.getResourceTypes();
}
```

**Angewendet in:**
1. `createDomainRule()` - Domain-spezifische Rules
2. `setNotConfiguredRule()` - Not-configured Fallback
3. `initializeForAllTabs()` - Wildcard Rule

## Test-Ablauf

### 1. Build
```bash
npm run build:safari
```

### 2. Xcode-Projekt erstellen
```bash
xcrun safari-web-extension-converter \
  --bundle-identifier de.openpims.extension \
  --force \
  --project-location .output/safari-app \
  .output/safari-mv2

open .output/safari-app/OpenPIMS/OpenPIMS.xcodeproj
```

### 3. In Xcode
- Schema: "macOS (App)"
- Run (⌘R)
- Safari startet automatisch

### 4. Extension konfigurieren
- OpenPIMS Icon in Safari Toolbar klicken
- Tab "Login" → "Synchronisieren"
- Erfolgsmeldung abwarten

### 5. Test-URL
```
https://y23.echo.test/get
```

### 6. Ergebnis prüfen
User-Agent Header muss enthalten:
```
OpenPIMS/2.0 (https://[32-char-hash].openpims.de)
```

## Vorherige Versuche (alle gescheitert)

1. ❌ User-Agent mit `resourceTypes: ['main_frame']` → Rules erstellt, nicht angewendet
2. ❌ Accept-Language Header → Nicht funktioniert
3. ❌ Custom X-OpenPIMS Header → Nicht funktioniert
4. ❌ DNT Header → Nicht funktioniert
5. ❌ Accept Header → Nicht funktioniert
6. ❌ Single Wildcard Rule → Nicht funktioniert
7. ❌ Session Rules → Nicht funktioniert
8. ❌ Cookie-based Fallback → Funktioniert, aber nicht optimal

## Erfolgsfaktor

Der entscheidende Durchbruch kam durch:
1. Analyse einer funktionierenden Safari Extension (ChangeTheHeaders)
2. Reverse Engineering des Source Codes
3. Identifikation des `excludedResourceTypes`-Workarounds
4. Implementierung in OpenPIMS mit Browser-Detection

## Auswirkungen

**Vor dem Fix:**
- Safari: Cookie-basierter Fallback (First-Party Cookie)
- Status: "Eingeschränkt"
- DSGVO: Technisch notwendiges Cookie

**Nach dem Fix:**
- Safari: User-Agent Modifikation (wie Chrome/Firefox)
- Status: "Voll unterstützt" ✅
- DSGVO: Keine Cookies nötig

## Nächste Schritte

1. ✅ README aktualisiert - Safari Status auf "Voll unterstützt"
2. ✅ Cookie-Fallback Dokumentation entfernt
3. ⏳ Content Script entfernen (nicht mehr nötig)
4. ⏳ Version 2.1 bauen
5. ⏳ Safari App Store Update

## Fazit

**Safari declarativeNetRequest funktioniert!**

Der Schlüssel ist `excludedResourceTypes` statt `resourceTypes`. Durch Reverse Engineering von ChangeTheHeaders konnten wir den Workaround identifizieren und erfolgreich in OpenPIMS implementieren.

**Alle Browser nutzen jetzt identisch User-Agent Modifikation - ohne Cookies!**
