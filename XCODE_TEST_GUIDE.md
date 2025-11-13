# Safari Extension mit Xcode testen

## Projekt wurde erstellt!

Das Xcode-Projekt wurde automatisch geöffnet in:
```
.output/safari-app/OpenPIMS/OpenPIMS.xcodeproj
```

## Schritt-für-Schritt in Xcode

### 1. Signing konfigurieren

**Für macOS (App):**
1. Wähle in der Target-Liste: **"macOS (App)"**
2. Tab **"Signing & Capabilities"**
3. **Team:** Wähle "Stefan Boeck" aus dem Dropdown
4. ☑ **"Automatically manage signing"** aktivieren

**Für macOS (Extension):**
1. Wähle: **"macOS (Extension)"**
2. Tab **"Signing & Capabilities"**
3. **Team:** "Stefan Boeck"
4. ☑ **"Automatically manage signing"**

### 2. App starten

**Oben in der Toolbar:**
1. **Schema auswählen:** "macOS (App)" (neben Stop-Button)
2. **Device auswählen:** "My Mac" (falls nicht schon ausgewählt)
3. **▶ Run Button klicken** (oder ⌘R)

**Was passiert:**
- Xcode baut die App
- Safari wird automatisch gestartet
- Die Extension ist automatisch geladen (im Debug-Modus)

### 3. Extension aktivieren

**Safari sollte sich automatisch öffnen mit:**
- Eine Notification: "OpenPIMS Extension kann verwendet werden"

**Falls nicht automatisch aktiviert:**
1. **Safari → Einstellungen** (⌘,)
2. Tab **"Erweiterungen"**
3. ☑ **OpenPIMS** aktivieren
4. ☑ **"In Symbolleiste anzeigen"** aktivieren

### 4. Extension konfigurieren

1. **OpenPIMS Icon klicken** (in Safari Toolbar)

2. **Login:**
   - **Option A:** Tab "Login" → "Synchronisieren"
   - **Option B:** Tab "Manuell" → Credentials eingeben

3. **Warte auf:** "Erfolgreich angemeldet!"

### 5. Testen

**In Safari öffnen:**
```
https://httpbin.org/headers
```

**Erwartetes Ergebnis:**
```json
{
  "headers": {
    "User-Agent": "Mozilla/5.0... OpenPIMS/2.0 (https://[subdomain].openpims.de)"
  }
}
```

### 6. Debuggen mit Xcode Console

**Während die App läuft:**

1. **Xcode Console** (unten im Xcode-Fenster)
   - Falls nicht sichtbar: View → Debug Area → Show Debug Area (⌘⇧Y)

2. **Console zeigt:**
   ```
   [OpenPIMS] Background script loaded
   [OpenPIMS] Loaded credentials
   [OpenPIMS] Domain rule created for: httpbin.org
   ```

3. **Falls Fehler:**
   - Fehler werden in rot angezeigt
   - Zeigen genau wo das Problem ist

### 7. Web Inspector für Extension

**Parallel zu Xcode:**

1. **Safari → Entwickler → Web Extension Background Content**

2. **Wähle "OpenPIMS"**

3. **Console Tab:**
   ```javascript
   // Rules prüfen
   chrome.declarativeNetRequest.getDynamicRules().then(rules => {
       console.log('Rules:', rules);
       rules.forEach(r => {
           console.log('Rule', r.id);
           console.log('  condition:', r.condition);
       });
   });
   ```

4. **Prüfe:**
   - ✅ `excludedResourceTypes` vorhanden?
   - ✅ Keine `resourceTypes`?

### 8. Breakpoints setzen (fortgeschritten)

**In Xcode kannst du KEINE Breakpoints in JavaScript setzen!**

Aber du kannst:
1. **Swift-Code debuggen** (SafariWebExtensionHandler.swift)
2. **Console.log im JavaScript nutzen**
3. **Web Inspector für JavaScript-Debugging**

### 9. App stoppen

**In Xcode:**
- ■ Stop Button klicken (oder ⌘.)
- Safari bleibt offen, aber Extension wird deaktiviert

### 10. Änderungen testen

**Nach Code-Änderungen:**

1. **Extension neu bauen:**
   ```bash
   npm run build:safari
   ```

2. **In Xcode:**
   - ■ Stop (falls läuft)
   - ▶ Run (neu starten)

3. **Safari lädt Extension automatisch neu**

## Unterschied: Xcode vs. "Extension laden"

| Methode | Xcode Run | Extension laden |
|---------|-----------|----------------|
| **Signing** | Automatisch | Nicht nötig (unsigned) |
| **Safari Start** | Automatisch | Manuell |
| **Extension Reload** | Automatisch | Manuell (Safari restart) |
| **Debugging** | Xcode Console + Web Inspector | Nur Web Inspector |
| **App Store** | Ja (über Archive) | Nein |
| **Speed** | Langsamer (Build + Sign) | Schneller |

**Empfehlung:**
- **Entwicklung/Testing:** "Extension laden" (schneller)
- **Final Test vor Store:** Xcode (wie echte User)
- **Archive für Store:** Nur Xcode

## Häufige Xcode-Probleme

### Problem: "No signing certificate found"
**Lösung:**
1. Xcode → Preferences → Accounts
2. Apple ID hinzufügen
3. Team auswählen in Signing & Capabilities

### Problem: "App läuft, aber Extension nicht aktiv"
**Lösung:**
1. Safari → Einstellungen → Erweiterungen
2. OpenPIMS manuell aktivieren
3. Safari neu starten

### Problem: "Build failed"
**Lösung:**
1. Prüfe Xcode Errors (links im Navigator)
2. Meist: Signing-Problem
3. Clean Build Folder (Product → Clean Build Folder)

### Problem: "Extension ändert User-Agent nicht"
**Debug:**
1. Web Inspector → Console
2. `chrome.declarativeNetRequest.getDynamicRules()`
3. Prüfe ob Rules erstellt wurden

## Quick-Test Workflow

```bash
# Terminal
cd /Users/portalix/Projects/extensions
npm run build:safari

# Xcode (wenn schon offen)
# ■ Stop
# ▶ Run

# Safari (öffnet automatisch)
# https://httpbin.org/headers

# Prüfe User-Agent
```

## Schema-Varianten

**Xcode hat 4 Schemas:**

1. **macOS (App)** ← Nutze dieses für Desktop-Test
   - Startet macOS Safari
   - Extension für macOS

2. **iOS (App)**
   - Benötigt iOS Simulator oder Gerät
   - Extension für iOS Safari
   - Komplizierter zu testen

3. **macOS (Extension)** - Nicht direkt runnable
4. **iOS (Extension)** - Nicht direkt runnable

**Für deinen Test:** Nutze **"macOS (App)"**

## Console Output verstehen

**Normaler Start:**
```
Building...
Build succeeded
Launching OpenPIMS
Safari.app launched
```

**Extension Console (Web Inspector):**
```
[OpenPIMS] Background script loaded
[OpenPIMS] Loaded credentials: {userId: "123", ...}
[OpenPIMS] Creating wildcard rule
[OpenPIMS] Creating domain rule for: httpbin.org
[OpenPIMS] Rule created with ID: 1000
```

**Bei Erfolg (httpbin.org):**
- User-Agent enthält `OpenPIMS/2.0 (https://...)`

**Bei Fehler:**
```
Error: Invalid call to declarativeNetRequest.updateDynamicRules()
The 'resourceTypes' value is invalid
```

## Nächste Schritte nach erfolgreichem Test

Falls der Test **ERFOLGREICH** ist:

1. **README aktualisieren:**
   - Safari Status: "Voll unterstützt" ✅
   - Cookie-Fallback entfernen

2. **Version 2.1 bauen:**
   - Mit User-Agent statt Cookie
   - Für alle Browser

3. **Store Updates:**
   - Chrome/Firefox/Edge: v2.1
   - Safari App Store: v2.1

Falls der Test **FEHLSCHLÄGT**:

1. **Cookie-Fallback behalten**
2. **README bleibt wie es ist**
3. **Dokumentieren:** Safari Bug bestätigt trotz Fix-Versuch