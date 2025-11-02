# Game Creation System

## Overview
The game creation system now saves all uploaded files (banners, logos, title images) to organized folders in the Electron app's user data directory.

## File Structure

### Saved Files Location
```
D:\Future Projects\Kinma Launcher\games\{game-id}/
├── banner.{ext}
├── logo.{ext}
└── title.{ext}
```

### Storage Format
- **LocalStorage**: Stores game metadata (name, description, developer, etc.)
- **File System**: Stores actual image files in organized folders

## How It Works

### 1. Game Creation Process
When you create a game in Game Studio:
1. Fill out the form with game details
2. Upload images (banner, logo, title)
3. Click "Create Game"
4. Files are saved to: `{userData}/games/{game-id}/`
5. Game metadata is saved to localStorage
6. Game appears in your library and Game Studio dashboard

### 2. File Organization
Each game gets its own folder:
- Folder name: `{game-name-lowercase-with-dashes}` (e.g., "my-game")
- Contains: banner.jpg, logo.png, title.png (or appropriate extensions)

### 3. Security
- Files are stored in the app's user data directory
- Each game is isolated in its own folder
- No dummy data - only real games you've created

## API

### Electron Handler: `save-game-files`
Saves uploaded game files to disk:
```javascript
const result = await window.electronAPI.saveGameFiles(gameId, {
  banner: { dataURL: 'data:image/png;base64,...', name: 'banner.png' },
  logo: { dataURL: 'data:image/png;base64,...', name: 'logo.png' }
});
```

### Electron Handler: `get-game-folder-path`
Gets the path to a game's folder:
```javascript
const path = await window.electronAPI.getGameFolderPath(gameId);
```

## Custom Games Data Structure

Stored in localStorage as `customGames`:
```json
[
  {
    "id": "custom-1234567890",
    "gameId": "my-awesome-game",
    "name": "My Awesome Game",
    "developer": "You",
    "version": "1.0.0",
    "banner": "/games/my-awesome-game/banner.jpg",
    "logo": "/games/my-awesome-game/logo.png",
    "description": "Game description...",
    "tags": ["Adventure", "RPG"],
    "size": "5.2 GB",
    "releaseDate": "Jan 2025",
    "fullFormData": { /* ... */ }
  }
]
```

## Features
- ✅ Files saved to organized folder structure
- ✅ No dummy/placeholder games
- ✅ Persistent storage across app restarts
- ✅ Isolated game folders for security
- ✅ Full game data preservation
- ✅ Download, pause, cancel support
- ✅ Appears in sidebar and game library

## Notes
- Files are only saved in Electron app (not in web dev server)
- Each game's files are stored in isolated folders
- Game Studio dashboard shows only real games you've created
- Files persist even after app updates

