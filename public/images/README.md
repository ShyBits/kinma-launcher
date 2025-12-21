# Image Assets Directory

This folder contains all image assets used throughout the Kinma Launcher app.

## Directory Structure

```
public/
├── images/
│   ├── games/                          # Game assets
│   │   ├── pathline-banner.png         # Full game banners (1920x1080 recommended)
│   │   ├── pathline-logo.png           # Game logos (128x128, 256x256)
│   │   ├── cyber-arena-banner.jpg
│   │   ├── cyber-arena-logo.png
│   │   └── ... (other games)
│   └── items/                          # Marketplace item images
│       ├── legendary-sword.jpg         # Item images (512x512 recommended)
│       ├── magic-potion.jpg
│       ├── health-elixir.jpg
│       ├── dragon-armor.jpg
│       └── ... (other item images)
└── assets/
    └── icon.png                         # App icon for Electron (256x256)
```

## Naming Convention

### Game Images
- **Banners**: `{game-name}-banner.{ext}` - Full-width display images
- **Logos**: `{game-name}-logo.{ext}` - Square logos for thumbnails and icons

### Item Images
- **Items**: `{item-name}.{ext}` - Direct item images

### Examples
- `pathline-banner.png` - Full banner for Pathline game
- `pathline-logo.png` - Square logo for Pathline game
- `cyber-arena-banner.jpg` - Banner image
- `cyber-arena-logo.png` - Logo image

## Image References in Code

Images in the `public` folder can be referenced using absolute paths starting with `/`:

- **Game banners**: `/images/games/game-name-banner.png`
- **Game logos**: `/images/games/game-name-logo.png`
- **Item images**: `/images/items/item-name.jpg`
- **App icon**: `/assets/icon.png`

## Image Requirements

### Game Banners
- **Resolution**: 1920x1080 (16:9 aspect ratio) recommended
- **Format**: JPG or PNG
- **Use**: Hero displays, game cards, featured sections

### Game Logos
- **Resolution**: 128x128, 256x256, or 512x512 (1:1 aspect ratio)
- **Format**: PNG with transparency
- **Use**: Thumbnails, icons, small displays

### Item Images
- **Resolution**: 512x512 (1:1 aspect ratio) recommended
- **Format**: JPG or PNG
- **Use**: Marketplace listings, inventory displays

### App Icon
- **Resolution**: 256x256 pixels minimum
- **Format**: PNG
- **Use**: Electron app icon in taskbar/system

## Adding Images

1. **Game banners**: Place in `public/images/games/` with naming `{game-name}-banner.{ext}`
2. **Game logos**: Place in `public/images/games/` with naming `{game-name}-logo.{ext}`
3. **Item images**: Place in `public/images/items/` with naming `{item-name}.{ext}`
4. **App icon**: Place at `public/assets/icon.png`

## Current Files

- `games/pathline-banner.png` - Your Pathline banner image (already exists)