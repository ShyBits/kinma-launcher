# Pathline Launcher

Ein moderner Game Launcher für Desktop, ähnlich wie Steam, Epic Games Launcher oder Riot Games Launcher.

## Features

- 🎮 **Game Library**: Verwalte deine Spiele in einer übersichtlichen Bibliothek
- 🚀 **Game Launching**: Starte Spiele direkt aus dem Launcher
- 🛍️ **Game Store**: Entdecke neue Spiele (Mock-Store)
- ⚙️ **Settings**: Umfangreiche Einstellungsmöglichkeiten
- 🎨 **Modernes Design**: Schöne, moderne Benutzeroberfläche mit Dark Theme
- 📱 **Responsive**: Funktioniert auf verschiedenen Bildschirmgrößen
- 🔧 **Electron**: Native Desktop-App für Windows, macOS und Linux

## Installation

### Voraussetzungen

- Node.js (Version 16 oder höher)
- npm oder yarn

### Setup

1. **Abhängigkeiten installieren:**
   ```bash
   npm install
   ```

2. **App im Entwicklungsmodus starten:**
   ```bash
   npm run electron-dev
   ```

3. **App für Produktion bauen:**
   ```bash
   npm run electron-pack
   ```

## Verwendung

### Spiele hinzufügen

1. Klicke auf "Add Game" in der Sidebar oder verwende `Ctrl+N`
2. Fülle die Spieldaten aus:
   - **Game Name**: Name des Spiels (erforderlich)
   - **Developer**: Entwickler (optional)
   - **Game Executable**: Pfad zur .exe-Datei (erforderlich)
   - **Cover Image URL**: URL zum Spielbild (optional)
   - **Description**: Beschreibung (optional)

### Spiele verwalten

- **Spiel starten**: Klicke auf den Play-Button auf der Spielkarte
- **Spiel entfernen**: Verwende das Menü (drei Punkte) auf der Spielkarte
- **Suchen und filtern**: Nutze die Suchleiste und Filter in der Library

### Einstellungen

- **General**: Sprache, Auto-Start, System Tray
- **Appearance**: Theme-Einstellungen
- **Storage**: Datenpfad, Cache-Verwaltung
- **About**: App-Informationen und Updates

## Technische Details

### Tech Stack

- **Frontend**: React 18, React Router
- **Desktop**: Electron
- **Styling**: CSS3 mit modernen Features
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Storage**: Electron Store

### Projektstruktur

```
src/
├── components/          # Wiederverwendbare Komponenten
│   ├── TitleBar.js     # Fenster-Titelbar
│   ├── Sidebar.js      # Navigation
│   ├── GameCard.js     # Spielkarten
│   └── AddGameModal.js # Modal zum Hinzufügen von Spielen
├── pages/              # Hauptseiten
│   ├── Library.js      # Spielbibliothek
│   ├── Store.js        # Game Store
│   └── Settings.js     # Einstellungen
├── App.js              # Hauptkomponente
└── index.js            # App-Einstiegspunkt

public/
├── electron.js         # Electron Hauptprozess
├── preload.js          # Preload-Script für IPC
└── index.html          # HTML-Template
```

### Build-Konfiguration

Die App wird mit `electron-builder` gebaut und unterstützt:

- **Windows**: NSIS Installer
- **macOS**: DMG Package
- **Linux**: AppImage

## Entwicklung

### Verfügbare Scripts

- `npm start`: Startet React Dev Server
- `npm run electron`: Startet Electron (nach React Build)
- `npm run electron-dev`: Startet beide parallel im Dev-Modus
- `npm run build`: Baut React App für Produktion
- `npm run electron-pack`: Baut komplette Desktop-App

### Debugging

- Entwicklertools sind im Dev-Modus automatisch geöffnet
- Logs können in den Settings eingesehen werden
- IPC-Kommunikation zwischen React und Electron ist implementiert

## Lizenz

MIT License - Siehe LICENSE-Datei für Details.

## Beitragen

Beiträge sind willkommen! Bitte erstelle ein Issue oder einen Pull Request.

---

**Pathline Launcher** - Ein moderner Game Launcher für deinen Desktop! 🎮
