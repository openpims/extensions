# Safari Extension Test - Schritt für Schritt

## Voraussetzungen
✅ Extension wurde bereits gebaut mit `excludedResourceTypes` Fix
✅ Build ist in `.output/safari-mv2/`

## Schritt 1: Extension in Safari laden

### Option A: Via Xcode (empfohlen für vollständigen Test)

1. **Safari Extension Converter ausführen:**
   ```bash
   cd /Users/portalix/Projects/extensions

   # Altes Xcode-Projekt löschen (falls vorhanden)
   rm -rf .output/safari-app

   # Neues Xcode-Projekt erstellen
   xcrun safari-web-extension-converter \
     --bundle-identifier de.openpims.extension.test \
     --force \
     --project-location .output/safari-app \
     .output/safari-mv2
   ```

2. **Xcode-Projekt öffnen:**
   ```bash
   open .output/safari-app/OpenPIMS/OpenPIMS.xcodeproj
   ```

3. **In Xcode:**
   - Wähle das Schema "OpenPIMS (macOS)"
   - Klicke auf ▶ (Run) Button
   - Safari wird automatisch gestartet

4. **Safari aktiviert die Extension automatisch im Debug-Modus**

### Option B: Unpacked Extension laden (schneller für Tests)

1. **Safari öffnen**

2. **Developer-Menü aktivieren** (falls nicht schon aktiv):
   - Safari → Einstellungen (⌘,)
   - Tab "Erweitert"
   - ☑ "Menü 'Entwickler' in der Menüleiste anzeigen"

3. **Extension laden:**
   - Safari → Entwickler → Unsigned Extensions zulassen
   - Safari → Entwickler → Extension laden
   - Wähle: `/Users/portalix/Projects/extensions/.output/safari-mv2`

4. **Extension aktivieren:**
   - Safari → Einstellungen → Erweiterungen
   - ☑ OpenPIMS aktivieren

## Schritt 2: Extension konfigurieren

1. **OpenPIMS Popup öffnen:**
   - Klicke auf das OpenPIMS Icon in der Safari Toolbar
   - Falls Icon nicht sichtbar: Safari → Einstellungen → Erweiterungen → OpenPIMS Toolbar-Icon aktivieren

2. **Login:**
   - **Option A - Automatisch:** Tab "Login" → "Synchronisieren" klicken
   - **Option B - Manuell:** Tab "Manuell" → Credentials eingeben:
     - User ID: [deine User ID]
     - Secret: [dein Secret]
     - App Domain: openpims.de
     - Server URL: https://openpims.de

3. **Warte auf "Erfolgreich angemeldet!"**

## Schritt 3: User-Agent testen

### Test 1: httpbin.org (einfachster Test)

1. **Öffne in Safari:**
   ```
   https://httpbin.org/headers
   ```

2. **Erwartetes Ergebnis:**
   ```json
   {
     "headers": {
       "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Safari/605.1.15 OpenPIMS/2.0 (https://[32-char-subdomain].openpims.de)"
     }
   }
   ```

3. **Prüfe:**
   - ✅ Enthält `OpenPIMS/2.0`?
   - ✅ Enthält `https://[subdomain].openpims.de`?
   - ✅ Subdomain ist 32 Zeichen lang?

### Test 2: echo.test (dein eigener Server)

1. **Öffne in Safari:**
   ```
   https://x.echo.test/get
   ```

2. **Prüfe `user_agent` Feld in der Response**

### Test 3: Safari Web Inspector

1. **Safari → Entwickler → Web-Inspektor einblenden** (⌘⌥I)

2. **Tab "Netzwerk"**

3. **Seite neu laden** (⌘R)

4. **Klicke auf den ersten Request (das HTML-Dokument)**

5. **Im Detail-Bereich:**
   - Suche nach "User-Agent" Header
   - Sollte `OpenPIMS/2.0 (https://...)` enthalten

## Schritt 4: Debugging (falls es nicht funktioniert)

### Check 1: Extension Console

1. **Safari → Entwickler → Web Extension Background Content**
2. **Wähle "OpenPIMS"**
3. **Console Tab:**
   - Suche nach Fehlern
   - Sollte zeigen: `[OpenPIMS] Loaded credentials`
   - Sollte zeigen: `[OpenPIMS] Domain rule created for: httpbin.org`

### Check 2: Dynamic Rules prüfen

In der Extension Console:
```javascript
chrome.declarativeNetRequest.getDynamicRules().then(rules => {
    console.log('Active rules:', rules.length);
    rules.forEach(rule => {
        console.log('Rule', rule.id, ':', rule);
    });
});
```

**Erwartetes Ergebnis:**
```javascript
Active rules: 2
Rule 1: {
  id: 1,
  priority: 1,
  action: {
    type: "modifyHeaders",
    requestHeaders: [{
      header: "User-Agent",
      operation: "set",
      value: "Mozilla/5.0... OpenPIMS/2.0 (https://openpims.de)"
    }]
  },
  condition: {
    urlFilter: "*://*/*",
    excludedResourceTypes: [...]  // ← Sollte excludedResourceTypes haben!
  }
}

Rule 1000: {
  id: 1000,
  priority: 100,
  action: {
    type: "modifyHeaders",
    requestHeaders: [{
      header: "User-Agent",
      operation: "set",
      value: "Mozilla/5.0... OpenPIMS/2.0 (https://[subdomain].openpims.de)"
    }]
  },
  condition: {
    urlFilter: "*://httpbin.org/*",
    excludedResourceTypes: [...]  // ← WICHTIG: excludedResourceTypes!
  }
}
```

**Prüfe:**
- ✅ `excludedResourceTypes` vorhanden? (NICHT `resourceTypes`)
- ✅ Array enthält alle Types außer main_frame?

### Check 3: Storage prüfen

In der Extension Console:
```javascript
chrome.storage.local.get(null, (data) => {
    console.log('Storage:', data);
});
```

**Erwartetes Ergebnis:**
```javascript
{
  credentials: {
    userId: "123",
    secret: "...",
    appDomain: "openpims.de",
    serverUrl: "https://openpims.de",
    isLoggedIn: true
  },
  domainRules: {
    rules: {
      "httpbin.org": {
        ruleId: 1000,
        createdDay: 20077,
        hash: "https://[subdomain].openpims.de"
      }
    }
  }
}
```

### Check 4: Browser Detection

In der Extension Console:
```javascript
console.log('Browser:', import.meta.env.BROWSER);
```

**Erwartetes Ergebnis:**
```
Browser: safari
```

Falls `undefined`: Der Browser-Check funktioniert nicht richtig.

## Schritt 5: Erfolgs-Kriterien

### ✅ Test ERFOLGREICH wenn:

1. **httpbin.org zeigt:**
   ```
   User-Agent: Mozilla/5.0... OpenPIMS/2.0 (https://[32-char].openpims.de)
   ```

2. **Dynamic Rules zeigen:**
   - `excludedResourceTypes` array vorhanden
   - Mindestens 2 Rules (Wildcard + Domain-specific)

3. **Web Inspector zeigt:**
   - User-Agent Header enthält OpenPIMS/2.0

4. **Console zeigt keine Fehler:**
   - Keine roten Fehler
   - Erfolgsmeldungen für Rule Creation

### ❌ Test FEHLGESCHLAGEN wenn:

1. **User-Agent unverändert:**
   ```
   User-Agent: Mozilla/5.0... Version/26.1 Safari/605.1.15
   ```
   (kein OpenPIMS/2.0)

2. **Dynamic Rules zeigen:**
   - `resourceTypes` statt `excludedResourceTypes`
   - Oder: Keine Rules vorhanden

3. **Console zeigt Fehler:**
   - "Invalid call to declarativeNetRequest"
   - "The header ... is not recognized"

## Schritt 6: Vergleichstest mit ChangeTheHeaders

Um sicherzugehen dass Safari grundsätzlich funktioniert:

1. **ChangeTheHeaders installieren** (falls noch nicht)

2. **Neue Custom Header erstellen:**
   - Header: `Accept`
   - Value: `TEST-VALUE-123`
   - URL Domains: (leer lassen)
   - Resource Types: (leer lassen) ← WICHTIG!
   - Enabled: ☑

3. **httpbin.org besuchen**

4. **Sollte zeigen:**
   ```json
   {
     "Accept": "TEST-VALUE-123"
   }
   ```

Falls ChangeTheHeaders funktioniert aber OpenPIMS nicht:
- Problem ist in unserem Code
- Browser funktioniert grundsätzlich

Falls ChangeTheHeaders auch nicht funktioniert:
- Safari hat ein generelles Problem
- Evtl. Extension-Permissions nicht erteilt

## Schnell-Test (1 Minute)

```bash
# 1. Build
npm run build:safari

# 2. In Safari laden (Entwickler → Extension laden)
# Wähle: .output/safari-mv2

# 3. Popup öffnen → Login

# 4. Browser öffnen
open "https://httpbin.org/headers"

# 5. Prüfe User-Agent in der JSON-Response
```

**Erwartetes Ergebnis:**
```json
"User-Agent": "Mozilla/5.0... OpenPIMS/2.0 (https://[subdomain].openpims.de)"
```

## Troubleshooting

### Problem: "Extension kann nicht geladen werden"
**Lösung:**
- Safari → Entwickler → Unsigned Extensions zulassen
- Neustart Safari

### Problem: "OpenPIMS Icon nicht sichtbar"
**Lösung:**
- Safari → Einstellungen → Erweiterungen
- OpenPIMS aktivieren
- "Symbolleiste anzeigen" aktivieren

### Problem: "Login funktioniert nicht"
**Lösung:**
- Prüfe dass du bei openpims.de eingeloggt bist
- Oder nutze "Manuell" Tab mit korrekten Credentials

### Problem: "User-Agent unverändert"
**Debugging:**
1. Extension Console öffnen
2. `chrome.declarativeNetRequest.getDynamicRules()` prüfen
3. Schaue ob `excludedResourceTypes` verwendet wird
4. Prüfe auf Fehler in Console

### Problem: "Rules werden erstellt aber nicht angewendet"
**Das ist der ursprüngliche Safari Bug!**
- Bedeutet: `excludedResourceTypes` Fix funktioniert noch nicht
- Oder: Safari Version zu alt
- Oder: Safari hat einen Regression-Bug

## Erfolg melden!

Falls der Test erfolgreich ist:
```bash
# Screenshot machen von httpbin.org Response
# Zeigt User-Agent mit OpenPIMS/2.0

# Console-Output speichern
chrome.declarativeNetRequest.getDynamicRules()
# Zeigt excludedResourceTypes

# README aktualisieren
# Safari Status von "Eingeschränkt" auf "Voll unterstützt"
```

Falls der Test fehlschlägt:
- Cookie-Fallback bleibt die Lösung
- Safari Bug ist bestätigt
- README bleibt wie es ist mit Cookie-Lösung