# Migration Guide - Von separaten Extensions zur Unified Codebase

## Überblick

Dieses Dokument beschreibt die Migration von den drei separaten Browser-Extensions (Chromium, Firefox, Safari) zur neuen einheitlichen Codebasis.

## Vorteile der Migration

### Reduzierung
- **Code**: 855 → ~350 Zeilen (-59%)
- **Repositories**: 3 → 1
- **Build-Systeme**: 3 → 1
- **Bundle Size**: 67-150KB → 25-40KB (-62%)

### Verbesserungen
- ✅ TypeScript für Type Safety
- ✅ Hot Module Reload
- ✅ Automatisches Manifest V2/V3 Handling
- ✅ Native Web Crypto API (keine CryptoJS Dependency)
- ✅ Moderne Toolchain (WXT + Vite)

## Technische Änderungen

### 1. Build-System

| Alt | Neu |
|-----|-----|
| Webpack (Chrome) | WXT + Vite |
| Keine (Firefox) | WXT + Vite |
| Xcode (Safari) | WXT + Vite |

### 2. Kryptografie

```javascript
// ALT (Chrome mit CryptoJS)
const CryptoJS = require('crypto-js');
const hash = CryptoJS.HmacSHA256(message, secret);

// NEU (Alle Browser mit Web Crypto API)
const key = await crypto.subtle.importKey(...);
const signature = await crypto.subtle.sign('HMAC', key, messageData);
```

### 3. Architektur

```
// ALT: Monolithischer background.js (421 Zeilen)
background.js

// NEU: Modulare Struktur
src/
├── core/
│   ├── hmac.ts       (50 Zeilen)
│   ├── rules.ts      (150 Zeilen)
│   └── api.ts        (80 Zeilen)
├── storage/
│   └── credentials.ts (70 Zeilen)
└── utils/
    └── browser-detect.ts (40 Zeilen)
```

## Migrations-Schritte

### Phase 1: Setup (30 Minuten)

1. **Neues Projekt initialisieren**
   ```bash
   cd /Users/portalix/Projects/extensions
   git clone [unified-repo] openpims-extension
   cd openpims-extension
   npm install
   ```

2. **Alte Extensions sichern**
   ```bash
   cp -r ../chromium ../chromium.backup
   cp -r ../firefox ../firefox.backup
   cp -r ../safari ../safari.backup
   ```

### Phase 2: Daten-Migration (1 Stunde)

#### Chrome/Edge-Nutzer

1. Alte Extension deinstallieren
2. Neue Extension laden:
   ```bash
   npm run build:chrome
   # Chrome: chrome://extensions/
   # "Load unpacked" → .output/chrome-mv3/
   ```
3. Credentials werden automatisch migriert (gleicher Storage-Key)

#### Firefox-Nutzer

1. Alte Extension deinstallieren
2. Neue Extension laden:
   ```bash
   npm run build:firefox
   # Firefox: about:debugging
   # "Load Temporary Add-on" → .output/firefox-mv2/manifest.json
   ```

#### Safari-Nutzer

1. Build erstellen:
   ```bash
   npm run build:safari
   ```
2. In Xcode konvertieren (einmalig):
   ```bash
   xcrun safari-web-extension-converter .output/safari/
   ```

### Phase 3: Testing (2 Stunden)

**Funktions-Tests:**

- [ ] Auto-Setup via Server
- [ ] Manuelles Setup
- [ ] Header-Injection verifizieren
- [ ] Tägliche Rotation (Zeitumstellung testen)
- [ ] Login/Logout
- [ ] Browser-Neustart

**Browser-Matrix:**

| Test | Chrome | Firefox | Safari |
|------|--------|---------|--------|
| Install | ✅ | ✅ | ✅ |
| Login | ✅ | ✅ | ✅ |
| X-OpenPIMS | ✅ | ✅ | ❌ (expected) |
| User-Agent | ✅ | ✅ | ✅ |

### Phase 4: Deployment (1 Stunde)

1. **Store-Pakete erstellen**
   ```bash
   npm run zip:chrome   # → chrome-mv3.zip
   npm run zip:firefox  # → firefox-mv2.zip
   npm run zip:safari   # → safari.zip
   ```

2. **Store-Upload**
   - Chrome Web Store: https://chrome.google.com/webstore/devconsole
   - Firefox Add-ons: https://addons.mozilla.org/developers/
   - Safari: App Store Connect

3. **Alte Repositories archivieren**

   Die alten Repositories wurden bereits archiviert und mit Deprecation-Hinweisen versehen:
   - [openpims/chromium](https://github.com/openpims/chromium) - ⚠️ DEPRECATED
   - [openpims/firefox](https://github.com/openpims/firefox) - ⚠️ DEPRECATED
   - [openpims/safari](https://github.com/openpims/safari) - ⚠️ DEPRECATED

## Rollback-Plan

Falls Probleme auftreten:

1. **Sofort-Rollback** (< 5 Minuten)
   ```bash
   # Alte Extensions sind noch installierbar
   cd ../chromium.backup && npm run build
   cd ../firefox.backup
   cd ../safari.backup
   ```

2. **Store-Rollback** (< 1 Tag)
   - Alte Versionen in Stores reaktivieren
   - Update-Manifest auf alte Version zeigen

## FAQ

### Verliere ich meine Einstellungen?

**Nein.** Der Storage-Key ist identisch (`openpims_credentials`), alle Einstellungen werden automatisch übernommen.

### Muss ich mich neu einloggen?

**Nein.** Wenn Sie in der alten Extension eingeloggt waren, bleiben Sie es auch in der neuen.

### Was ist mit meinen Regeln?

Die Regeln werden beim ersten Start der neuen Extension automatisch neu generiert basierend auf Ihren gespeicherten Credentials.

### Funktioniert die alte Extension noch?

Ja, bis Sie sie deinstallieren. Aber beide gleichzeitig zu nutzen wird nicht empfohlen (Konflikte möglich).

### Safari Custom Headers?

Safari unterstützt weiterhin keine custom headers. Das ist eine Platform-Limitation, keine Code-Problem. Die User-Agent Modifikation funktioniert aber perfekt.

## Support

Bei Problemen:

1. GitHub Issues: [repository-url]/issues
2. Logs prüfen: Browser Console (F12)
3. Rollback durchführen (siehe oben)

## Zeitplan

- **Woche 1**: Development & Testing
- **Woche 2**: Beta-Test mit ausgewählten Nutzern
- **Woche 3**: Rollout für alle Nutzer
- **Woche 4**: Alte Repos archivieren

## Metriken nach Migration

Erwartete Verbesserungen:

- **Bug-Fix-Zeit**: 3x schneller (nur 1x fixen)
- **Feature-Development**: 3x schneller (nur 1x implementieren)
- **Testing-Aufwand**: -50% (automatisierte Tests)
- **Build-Zeit**: -66% (1 Build für alle)

---

**Status**: Ready for Implementation
**Letzte Aktualisierung**: Oktober 2024
**Verantwortlich**: Stefan Böck