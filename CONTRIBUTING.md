# Contributing to OpenPIMS Extension

Vielen Dank für dein Interesse, zu OpenPIMS beizutragen! 🎉

## Code of Conduct

Dieses Projekt und alle Teilnehmer halten sich an unseren [Code of Conduct](CODE_OF_CONDUCT.md). Durch deine Teilnahme erwartest du, diesen Code zu respektieren.

## Wie kann ich beitragen?

### 🐛 Bugs melden

Bevor du einen Bug meldest:
1. Überprüfe die [Issues](https://github.com/openpims/extensions/issues), ob der Bug bereits gemeldet wurde
2. Stelle sicher, dass du die neueste Version verwendest
3. Sammle Informationen über den Bug:
   - Browser und Version
   - Schritte zur Reproduktion
   - Erwartetes vs. tatsächliches Verhalten
   - Screenshots (wenn relevant)
   - Browser-Konsole Logs

### 💡 Feature Requests

Wir freuen uns über neue Ideen! Bitte:
1. Überprüfe, ob die Idee bereits vorgeschlagen wurde
2. Erstelle ein Issue mit dem Label "enhancement"
3. Beschreibe den Use Case und warum das Feature nützlich wäre

### 📝 Pull Requests

1. **Fork das Repository** und erstelle deinen Feature Branch:
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Schreibe sauberen Code:**
   - Folge dem bestehenden Code-Stil
   - Nutze TypeScript Types
   - Kommentiere komplexen Code
   - Halte Funktionen klein und fokussiert

3. **Teste deine Änderungen:**
   ```bash
   # Type checking
   npm run compile

   # Unit tests
   npm test

   # Test in allen Browsern
   npm run dev
   ```

4. **Commit deine Änderungen:**
   ```bash
   git commit -m 'feat: Add amazing feature'
   ```

   Nutze [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` Neues Feature
   - `fix:` Bugfix
   - `docs:` Dokumentation
   - `style:` Formatierung
   - `refactor:` Code-Refactoring
   - `test:` Tests
   - `chore:` Wartung

5. **Push zu deinem Fork:**
   ```bash
   git push origin feature/amazing-feature
   ```

6. **Öffne einen Pull Request** mit:
   - Klarer Beschreibung der Änderungen
   - Referenz zu relevanten Issues
   - Screenshots (bei UI-Änderungen)

## Development Setup

### Voraussetzungen

- Node.js 18+
- npm oder pnpm
- Git

### Installation

```bash
# Repository klonen
git clone https://github.com/openpims/extensions.git
cd extensions

# Dependencies installieren
npm install

# Development Server starten
npm run dev
```

### Projekt-Struktur

```
extensions/
├── entrypoints/        # Extension Entry Points
│   ├── background.ts   # Service Worker / Background Script
│   └── popup/          # Popup UI
├── src/
│   ├── core/          # Core Funktionalität
│   ├── storage/       # Browser Storage
│   └── types/         # TypeScript Types
├── public/            # Statische Assets
└── wxt.config.ts      # WXT Konfiguration
```

### Browser-spezifisches Testing

**Chrome/Edge/Brave:**
```bash
npm run dev:chrome
# Öffne chrome://extensions/
# Aktiviere Developer Mode
# Extension wird automatisch geladen
```

**Firefox:**
```bash
npm run dev:firefox
# Öffne about:debugging
# Extension wird automatisch geladen
```

**Safari:**
```bash
npm run dev:safari
# Aktiviere Develop Menu
# Allow Unsigned Extensions
```

## Code Guidelines

### TypeScript

- Verwende explizite Types
- Vermeide `any`
- Nutze Interfaces für Objekt-Strukturen
- Exportiere Types aus `src/types/`

### Async/Await

- Verwende immer async/await statt Promises
- Handle Errors mit try/catch
- Web Crypto API ist immer async!

### Browser APIs

- Nutze `browser.*` statt `chrome.*` (WXT polyfill)
- Test in allen Ziel-Browsern
- Beachte Manifest V2 vs V3 Unterschiede

### Performance

- Bundle Size < 80KB pro Browser
- HMAC Calculation < 5ms
- Popup Load < 100ms
- Keine synchronen Storage-Operationen

## Testing

### Unit Tests

```bash
# Einmal ausführen
npm test

# Watch Mode
npm run test:watch

# Coverage Report
npm run test:coverage
```

### Neue Tests schreiben

Tests gehören in `src/__tests__/`:
```typescript
// src/__tests__/core/hmac-sync.test.ts
import { describe, it, expect } from 'vitest';
import { generateOpenPIMSUrl } from '../../core/hmac-sync';

describe('HMAC Generation', () => {
  it('should generate deterministic URLs', async () => {
    const url = await generateOpenPIMSUrl(...);
    expect(url).toMatch(/^https:\/\/[a-f0-9]{32}\.openpims\.de$/);
  });
});
```

## Release Process

1. Version in `package.json` updaten
2. CHANGELOG aktualisieren
3. Build für alle Browser:
   ```bash
   npm run build
   npm run zip
   ```
4. Tag erstellen:
   ```bash
   git tag v2.0.1
   git push origin v2.0.1
   ```

## Fragen?

- Erstelle ein [Issue](https://github.com/openpims/extensions/issues)
- Kontakt: support@openpims.de
- Website: [openpims.de](https://openpims.de)

## Lizenz

Durch deinen Beitrag stimmst du zu, dass deine Contributions unter der [Apache 2.0 License](LICENSE) lizenziert werden.