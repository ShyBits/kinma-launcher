# Steam Integration Setup Guide

## ✅ Dein API Key ist bereits konfiguriert!

Dein Steam Web API Key wurde in die Konfiguration eingetragen:
**Key:** `6AC630D0F1C3699D2ABA70762FE60A5C`

## 📋 Nächste Schritte

### 1. Steam ID64 hinzufügen

Du musst noch deine Steam ID64 hinzufügen:

1. Gehe zu [steamid.io](https://steamid.io)
2. Gib deinen Steam-Username oder Profil-URL ein
3. Kopiere die **Steam ID64** (nicht die Custom URL!)
4. Öffne `src/config/steam.config.js`
5. Füge deine Steam ID hinzu:

```javascript
export const steamConfig = {
  apiKey: '6AC630D0F1C3699D2ABA70762FE60A5C',
  steamId: 'DEINE_STEAM_ID64_HIER', // ← Hier eingeben
  // ...
};
```

### 2. Verwendung im Launcher

Die Steam API wird automatisch initialisiert wenn du:

#### Option A: Automatisch beim Start
```javascript
// In App.js
import steamAPI from './utils/SteamAPI';

useEffect(() => {
  // Launcher startet automatisch mit Steam
  steamAPI.getOwnedGames()
    .then(games => console.log('Steam Spiele:', games))
    .catch(err => console.log('Steam nicht verfügbar'));
}, []);
```

#### Option B: Manuell verbinden
```javascript
// In Settings oder Menu
const connectSteam = async () => {
  const result = await steamAPI.initialize('API_KEY', 'STEAM_ID');
  if (result.success) {
    console.log(`${result.gamesCount} Steam Spiele gefunden!`);
  }
};
```

## 🎮 Features die jetzt verfügbar sind:

✅ **Steam Library Import**
- Alle deine Steam Spiele werden geladen
- Spiele Details (Reviews, Screenshots, etc.)
- Launch via Steam

✅ **Workshop Browser**
- Browse Workshop Content
- Download Mods, Maps, Skins
- Subscribe to Items

✅ **In-Game Overlay**
- Shift + O zum Öffnen
- FPS Monitor
- Chat System
- Friends Status

✅ **Community Tab**
- Workshop als erster Tab
- Globus-Icon (wie gewünscht)
- Steam Workshop Integration

## 🔐 Sicherheit

⚠️ **WICHTIG:** Dein API Key sollte NICHT in Git committed werden!

Die aktuelle Konfiguration verwendet:
- `src/config/steam.config.js` (bereits in `.gitignore`)
- Kann über Environment Variables überschrieben werden

### Produktion Setup:

1. **Entwicklungsmodus:**
   ```bash
   # .env.local
   REACT_APP_STEAM_API_KEY=6AC630D0F1C3699D2ABA70762FE60A5C
   REACT_APP_STEAM_ID=deine-steam-id
   ```

2. **Build:**
   ```bash
   npm run build
   ```

3. **Production:**
   - Verwende Environment Variables
   - Oder Backend für API Requests

## 🚀 Schnellstart

1. Steam ID hinzufügen (siehe Schritt 1 oben)
2. Launcher starten:
   ```bash
   npm run electron-dev
   ```
3. Gehe zu Settings
4. Klicke "Connect to Steam"
5. Fertig! 🎉

## 🐛 Troubleshooting

**"Steam API not initialized"**
- Lösung: Steam ID64 hinzufügen

**"CORS Error"**
- Lösung: Nutze ein Backend oder Proxy
- Oder: Nutze Electron's native Requests (kein CORS)

**"Workshop Items nicht gefunden"**
- Lösung: Stelle sicher dass Spiel Workshop hat
- Workshop muss im Launcher unterstützt sein

## 📊 Dein aktueller Status

- ✅ API Key konfiguriert: `6AC630D0F1C3699D2ABA70762FE60A5C`
- ⏳ Steam ID benötigt: Füge deine Steam ID64 hinzu
- ✅ Workshop Feature: Implementiert
- ✅ Overlay System: Bereit
- ✅ Community Tab: Globus-Icon aktiv

---

**Viel Spaß mit deiner Steam Integration! 🎮**

