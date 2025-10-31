# OpenPIMS Browser Extension - Unified Codebase

Personal Information Management System (PIMS) for cookie consent management. A modern, unified codebase supporting Chrome, Firefox, Safari, Edge, Brave, and Opera from a single repository.

## Description

OpenPIMS Browser Extension signals participating websites that you use OpenPIMS by modifying the `User-Agent` header with a unique, domain-specific URL generated using deterministic HMAC-SHA256 hashing. Each website you visit gets its own unique OpenPIMS identifier that rotates daily for enhanced privacy.

Participating websites can then:
1. Query your existing cookie consents from your OpenPIMS provider using the URL in the User-Agent header
2. Show you a link to your PIMS provider if you haven't set consents for their site yet
3. Your PIMS provider will show:
   - Consent dialog (if you're already registered)
   - Registration/setup dialog (if you're new) → After successful registration, the consent dialog is shown

## Key Features

- **Centralized Consent Management** - Manage all cookie consents in one place at your PIMS provider
- **Automatic Consent Signaling** - Websites automatically detect your OpenPIMS usage via User-Agent header
- **Domain-Specific Privacy** - Each website gets a unique OpenPIMS URL
- **Daily Rotation** - User URLs regenerate every 24 hours (UTC midnight) for enhanced privacy
- **HMAC-SHA256 Security** - Cryptographically secure subdomain generation using native Web Crypto API
- **Cross-Browser Support** - Chrome (MV3), Firefox (MV2), Safari (MV2) from single codebase
- **Zero Configuration** - Works immediately after synchronization
- 🌐 **Unified Codebase**: One repository for Chrome, Firefox, Safari, Edge, Brave, Opera
- 📦 **Modern Build System**: WXT Framework with TypeScript and Vite
- 🚀 **Hot Module Reload**: Fast development with automatic reloads

## Unterstützte Browser

| Browser | Manifest | User-Agent Mod | DSGVO-konform | Status |
|---------|----------|----------------|---------------|--------|
| Chrome | V3 | ✅ | ✅ | Voll unterstützt |
| Firefox | V2 | ✅ | ✅ | Voll unterstützt |
| Safari | V2 | ✅ | ✅ | Voll unterstützt (macOS + iOS) |
| Edge | V3 | ✅ | ✅ | Voll unterstützt |
| Brave | V3 | ✅ | ✅ | Voll unterstützt |
| Opera | V3 | ✅ | ✅ | Voll unterstützt |

**Hinweis:** Edge, Brave und Opera nutzen den gleichen Chrome-Build (Chromium-basiert).

## Installation für Entwickler

### Voraussetzungen

- Node.js 18+ und npm
- Git

### Setup

```bash
# Repository klonen
git clone [repository-url]
cd openpims-extension

# Dependencies installieren
npm install
```

## Usage

### First-Time Users (No Account Yet)
1. Install the extension
2. Click the OpenPIMS extension icon in the browser toolbar
3. Click the **"Neu hier?"** tab (with green indicator)
4. Click **"Jetzt registrieren"** - opens registration page in new tab
5. Register at your OpenPIMS provider (e.g., https://openpims.de)
6. Return to extension popup
7. Click **"Login"** tab → **"Synchronisieren"**
8. Done! The extension is now active

### Automatic Setup (Recommended for Existing Users)
1. Register/login at your OpenPIMS provider (e.g., https://openpims.de)
2. Install the extension (see Installation below)
3. Click the OpenPIMS extension icon in the browser toolbar
4. Click **"Login"** tab → **"Synchronisieren"** - the extension automatically retrieves your credentials
5. The extension is now active and signals your OpenPIMS usage to participating websites

### Manual Setup (Advanced)
1. Register/login at your OpenPIMS provider
2. Copy your User-ID, Token, and Domain from the setup page
3. Click the OpenPIMS extension icon
4. Click **"Manuell"** tab
5. Enter the credentials manually
6. Click **"Manuell einrichten"**
7. The extension is now active

### Extension Status Detection
The extension sends a modified User-Agent to indicate its status:
- **Not logged in**: `User-Agent: Mozilla/5.0... OpenPIMS/2.0 ()`
- **First request to new domain**: `User-Agent: Mozilla/5.0... OpenPIMS/2.0 (https://openpims.de)`
- **Domain-specific (logged in)**: `User-Agent: Mozilla/5.0... OpenPIMS/2.0 (https://{subdomain}.openpims.de)`

This allows the OpenPIMS server to automatically detect extension installation and synchronization without user interaction.

## Entwicklung

### Alle Browser gleichzeitig

```bash
npm run dev
```

### Spezifischer Browser

```bash
npm run dev:chrome   # Chrome/Edge/Brave
npm run dev:firefox  # Firefox
npm run dev:safari   # Safari
```

Die Extension wird automatisch geladen und bei Änderungen neu geladen (Hot Module Reload).

## Build

### Alle Browser

```bash
npm run build
```

### Spezifischer Browser

```bash
npm run build:chrome   # Erstellt .output/chrome-mv3/
npm run build:firefox  # Erstellt .output/firefox-mv2/
npm run build:safari   # Erstellt .output/safari/
```

### ZIP-Archive für Store-Upload

```bash
npm run zip:chrome   # Erstellt chrome-mv3.zip
npm run zip:firefox  # Erstellt firefox-mv2.zip
npm run zip:safari   # Erstellt safari.zip
```

## Architektur

```
openpims-extension/
├── entrypoints/
│   ├── background.ts      # Service Worker / Background Script
│   └── popup/            # Extension Popup
│       ├── index.html
│       ├── main.ts
│       └── style.css
├── src/
│   ├── core/             # Kern-Funktionalität
│   │   ├── hmac-sync.ts  # Web Crypto API HMAC-SHA256
│   │   ├── rules-sync.ts # declarativeNetRequest Management
│   │   └── api.ts        # Server-Kommunikation
│   ├── storage/          # Speicherverwaltung
│   │   ├── credentials.ts    # Credential Management
│   │   └── domain-rules.ts   # Domain Rule Caching
│   ├── types/            # TypeScript Definitionen
│   └── utils/            # Hilfsfunktionen (Browser-Erkennung)
├── public/               # Statische Assets (Icons)
├── wxt.config.ts         # WXT Konfiguration
└── tsconfig.json         # TypeScript Konfiguration
```

## Wie es funktioniert

### 1. Deterministische Subdomain-Generierung

```typescript
// Täglich rotierende Subdomain basierend auf:
// - User ID
// - Besuchte Domain
// - Aktueller Tag (UTC)
const subdomain = HMAC_SHA256(userId + domain + dayTimestamp, secret)
```

### 2. Header-Modifikation

**Alle Browser:**
```
User-Agent: Mozilla/5.0... OpenPIMS/2.0 (https://[subdomain].openpims.de)
```

**User-Agent Format:**
- Not logged in: `OpenPIMS/2.0 ()`
- First request (wildcard): `OpenPIMS/2.0 (https://openpims.de)`
- Domain-specific: `OpenPIMS/2.0 (https://[subdomain].openpims.de)`

**Hinweis:** Die OpenPIMS-URL wird ausschließlich über den User-Agent übertragen. Custom Headers und Cookies werden nicht verwendet, um DSGVO-Konformität sicherzustellen.

### 3. Tägliche Rotation

Die Subdomains rotieren automatisch um Mitternacht UTC, um Tracking zu verhindern.

## Browser-spezifische Unterschiede

### Chrome/Edge/Brave (Manifest V3)
- Service Worker als Background Script
- `declarativeNetRequest` API für Header-Modifikation
- User-Agent für OpenPIMS-URL
- Chrome Alarms API für tägliche Rotation

### Firefox (Manifest V2)
- Persistent Background Script
- `declarativeNetRequest` API
- User-Agent für OpenPIMS-URL
- Chrome Alarms API für tägliche Rotation

### Safari (Manifest V2)
- Non-Persistent Background Script (iOS-kompatibel)
- `declarativeNetRequest` API
- User-Agent für OpenPIMS-URL
- Chrome Alarms API für tägliche Rotation
- Funktioniert auf macOS und iOS/iPadOS

## API Integration

### Extension Setup API
**Endpoint**: `GET /api/extension/setup` (requires authentication via cookies)

**Response**:
```json
{
    "userId": "123",
    "token": "secret_key_for_hmac",
    "domain": "openpims.de",
    "email": "user@example.com"
}
```

The extension retrieves these credentials automatically when the user clicks "Synchronisieren" in the extension popup. The server must verify the user's session via cookies before returning credentials.

## Testing

```bash
# Unit Tests
npm test

# Test mit UI
npm run test:ui

# Type Checking
npm run compile
```

## Migration von alten Extensions

### Von Chromium Extension (v1.x)

1. Credentials werden automatisch migriert
2. CryptoJS wurde durch Web Crypto API ersetzt
3. Webpack wurde durch WXT/Vite ersetzt

### Von Firefox Extension (v1.x)

1. Storage-Format ist kompatibel
2. webRequest API wird weiterhin für Firefox verwendet
3. Keine Migration nötig

### Von Safari Extension (v1.x)

1. Swift-Code nicht mehr nötig
2. Reine Web Extension
3. Xcode nur für finale Paketierung

## Performance

| Metrik | Alt (3 Repos) | Neu (WXT v2.0) | Verbesserung |
|--------|---------------|----------------|--------------|
| Lines of Code | ~855 | ~315 | -63% |
| Bundle Size (Chrome/Edge/Brave/Opera) | 135KB | 65.94 kB | -51% |
| Bundle Size (Firefox) | 150KB | 76.44 kB | -49% |
| Bundle Size (Safari) | 150KB | 76.44 kB | -49% |
| Build Time | 3x manuell | 1x automatisch | -66% |
| Maintenance | 3x Updates | 1x Update | -66% |
| Crypto Library | CryptoJS (52KB) | Web Crypto API (native) | -52KB |
| Logging Overhead | Verbose | Production-optimized | -4KB |
| Dead Code Removal | - | ~115 Zeilen | Code Cleanup |
| Notifications | Required | Removed (iOS-incompatible) | -1.1KB |
| UI System | Divider-based | Tab-based (3 tabs) | Better UX |

## Roadmap / Geplante Features

### 🎯 Pre-Computation aller PIMS-Domains (v2.1 - geplant)

**Problem:**
Aktuell werden Domain-spezifische Tokens erst beim ersten Besuch einer Domain erstellt. Das bedeutet:
- First Request hat nur generischen Token `OpenPIMS/2.0 (https://openpims.de)`
- Zweiter Browser muss alle Domains neu "lernen"

**Lösung:**
Bei Login/Sync lädt die Extension alle PIMS-verwalteten Domains (~100 pro User) vom Server und erstellt sofort alle HMAC-Tokens. Dadurch:
- ✅ First Request hat bereits domain-spezifischen Token
- ✅ Browser-übergreifend konsistente Tokens
- ✅ Offline-Robustheit (alle Tokens gecached)
- ✅ Performance-Optimierung (keine HMAC-Berechnung während Navigation)

## Troubleshooting

### Extension lädt nicht

```bash
# Clean build
rm -rf .output node_modules .wxt
npm install
npm run build
```

### Popup UI aktualisiert sich nicht nach Login

Die Extension verwendet einen 200ms Delay nach Login, um sicherzustellen, dass der Storage aktualisiert wurde. Falls das Problem weiterhin besteht:

```bash
# Extension neu laden
# Chrome: chrome://extensions/ -> Reload
# Firefox: about:debugging -> Reload
```

### Tägliche Rotation funktioniert nicht

Die Extension nutzt `chrome.alarms` API für zuverlässige tägliche Rotation um Mitternacht UTC. Falls Alarme nicht funktionieren, prüfen Sie die Browser-Konsole auf Fehler.

## Lizenz

MIT - Siehe LICENSE Datei

## Autor

Stefan Böck

## Changelog

### v2.0.0 (2025-10)
- ✅ Komplette Neuimplementierung mit WXT Framework
- ✅ TypeScript Migration
- ✅ Unified Codebase für alle Browser (Chrome/Firefox/Safari/Edge/Brave/Opera)
- ✅ Web Crypto API (native) statt CryptoJS (-52KB)
- ✅ Chrome Alarms API für zuverlässige tägliche Rotation
- ✅ Domain Rule Caching mit persistentem Storage
- ✅ User-Agent Header statt custom Headers oder Cookies
- ✅ Hot Module Reload Support
- ✅ Verbesserte Popup-UI (500px Höhe, responsive Layout)
- ✅ Error-Message als Banner direkt unter Header
- ✅ Fix: Message Handler async/sync für korrekte Popup-Updates
- ✅ User-Agent Format: `OpenPIMS/2.0 ()` für nicht-konfiguriert, `OpenPIMS/2.0 (url)` für konfiguriert
- ✅ DSGVO-Konformität: Keine Cookies auf Drittseiten
- ✅ iOS/iPadOS Support: Non-persistent background script
- ✅ Event-Driven: Keine RAM-Caches, nur Storage-basiert
- ✅ Opera Browser Support: Explizite Erkennung und Dokumentation
- ✅ Code Cleanup: Dead Code entfernt (~115 Zeilen)
  - Browser-Info UI entfernt (nicht notwendig)
  - Deprecated setupDailyRefresh() entfernt (doppelt mit alarms)
  - Unused validateCredentials() und isLoggedIn() entfernt
  - Alle Notifications entfernt (iOS-inkompatibel)
- ✅ Tab-basierte UI: 3 Tabs (Login / Manuell / Neu hier?)
  - "Neu hier?" Tab mit grünem Indikator für neue Benutzer
  - Direkte Registration auf Webseite
  - Klickbare Server-URL im Popup
  - Kompakte Darstellung für iOS Safari
- ✅ Bundle Size: 65.94 kB (Chrome), 76.44 kB (Firefox/Safari)

### v1.1.0 (Legacy)
- Separate Repositories für jeden Browser
- CryptoJS für Chrome
- Web Crypto für Firefox/Safari
- Keine automatische Rotation