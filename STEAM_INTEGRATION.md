# Steam Integration Guide für Kinma Launcher

## 📋 Übersicht

Der Kinma Launcher unterstützt jetzt die Integration mit Steam:
- ✅ Steam Library Einbinden
- ✅ Eigenes In-Game Overlay System
- ✅ Workshop Content Browse & Download
- ✅ Steam Game Launch Support

## 🚀 Setup Anleitung

### 1. Steam Web API Key erhalten

1. Gehe zu [Steam Web API](https://steamcommunity.com/dev/apikey)
2. Melde dich mit deinem Steam-Account an
3. Erstelle einen neuen API Key
4. Kopiere den Key für die Verwendung im Launcher

### 2. Steam ID finden

1. Öffne Steam
2. Gehe zu Profil → Edit Profile
3. Deine Steam ID findest du im URL (oder nutze [SteamID.io](https://steamid.io))

### 3. Konfiguration im Launcher

```javascript
// In App.js oder Settings
import steamAPI from './utils/SteamAPI';

// API initialisieren
steamAPI.initialize('DEIN_API_KEY', 'DEINE_STEAM_ID')
  .then(result => {
    if (result.success) {
      console.log('Steam API verbunden!', result.gamesCount, 'Spiele gefunden');
    }
  });
```

## 🎮 Features im Detail

### Steam Library Integration

```javascript
// Alle Steam-Spiele laden
const games = await steamAPI.getOwnedGames();

// Spiel-Details abrufen
const gameDetails = await steamAPI.getGameDetails(appId);

// Spiel starten
await steamAPI.launchGame(appId);
```

### In-Game Overlay

Das eigene Overlay System wird mit `Shift + O` getriggert:

**Features:**
- 🎯 Game FPS & Performance Monitor
- 💬 In-Game Chat
- 👥 Friends Online Status
- ⚙️ Quick Settings
- 📸 Screenshot Capture
- 🏆 Achievement Viewer

**Hotkeys:**
- `Shift + O` - Overlay ein/aus
- `Alt + Tab` - Overlay minimieren
- `Alt + Q` - Zurück zu Home
- `Alt + M` - Discord-ähnliches Menü (optional)

### Workshop Content

Im Community-Tab findest du jetzt den Workshop:

**Features:**
- 🔍 Durchsuche alle Workshop Items
- 📦 Kategorien: Mods, Maps, Skins, Items
- ⭐ Sortierung: Popular, Rating, Recent, Downloads
- ❤️ Subscribe/Download Buttons
- 📊 Detaillierte Statistiken

**Verwendung:**
```javascript
// In WorkshopSection.js
const items = await steamAPI.getWorkshopItems(gameId);
const itemDetails = await steamAPI.getWorkshopItemDetails(itemId);
```

## 🛠️ Technische Details

### Steam API Wrapper

Die `SteamAPI` Klasse bietet folgende Methoden:

```javascript
// Initialisierung
steamAPI.initialize(apiKey, steamId)

// Spiele laden
steamAPI.getOwnedGames() → Promise<Game[]>

// Spiel-Details
steamAPI.getGameDetails(appId) → Promise<GameDetails>

// Workshop Items
steamAPI.getWorkshopItems(appId) → Promise<WorkshopItem[]>
steamAPI.getWorkshopItemDetails(itemId) → Promise<WorkshopDetails>

// Spiel starten
steamAPI.launchGame(gameId) → Promise<LaunchResult>

// Image URLs
steamAPI.getGameImageURL(appId, hash)
steamAPI.getGameLogoURL(appId)
```

### Overlay System

```javascript
// InGameOverlay.js
<InGameOverlay 
  isVisible={showOverlay}
  onClose={() => setShowOverlay(false)}
/>
```

**Tab-Struktur:**
- **Overlay**: Quick Actions, FPS Monitor
- **Chat**: In-Game Messaging
- **Friends**: Online Status
- **Settings**: Overlay Preferences

## 📝 Workshop Categories

- **Mods** - Game Modifications
- **Maps** - Custom Levels & Maps
- **Skins** - Character/Weapon Skins
- **Items** - Additional Items
- **Other** - Diverse Content

## 🔐 Sicherheit

- API Keys werden lokal gespeichert
- Keine Server-Kommunikation nötig
- Alle Requests gehen direkt an Steam
- CORS-Probleme müssen im Backend gelöst werden

## 🌐 Backend Requirements (Optional)

Für volle Funktionalität empfohlenes Backend:

```javascript
// API Routes
POST /steam/initialize
POST /steam/games
POST /steam/launch/:gameId
POST /steam/workshop/items
POST /steam/workshop/download/:itemId
```

## 🎨 UI Features

**Community Tab:**
- Erster Tab ist jetzt "Workshop"
- Globus-Icon für Community
- Filter Sidebar nur bei Posts (nicht Workshop)
- Suchen, Kategorisieren, Sortieren

**Navigation:**
- 🌐 Community (Globus-Icon)
- 🛒 Store  
- 👥 Friends
- 📊 Market
- 🔔 Notifications

## 📦 Installation

1. Stelle sicher, dass Steam installiert ist
2. Kopiere `src/utils/SteamAPI.js` in dein Projekt
3. Installiere Dependencies (falls nötig):
```bash
npm install
```
4. Starte den Launcher:
```bash
npm run electron-dev
```

## 🐛 Troubleshooting

**Problem:** "Steam API not initialized"
- Lösung: API Key und Steam ID richtig setzen

**Problem:** "Failed to fetch Steam games"
- Lösung: CORS-Proxy oder Backend verwenden

**Problem:** "Overlay öffnet sich nicht"
- Lösung: `Shift + O` muss im Game-Focus funktionieren

## 🔮 Future Features

- [ ] Steam Achievements Anzeige
- [ ] Steam Trading Cards Support
- [ ] Steam Inventory Integration
- [ ] Steam Market Price Tracker
- [ ] Auto-Update für Subscribed Items
- [ ] Steam Cloud Save Integration

## 📞 Support

Bei Fragen oder Problemen:
- GitHub Issues erstellen
- Oder nutze den Support Chat im Launcher

---

**Viel Spaß mit der Steam Integration! 🎮**

