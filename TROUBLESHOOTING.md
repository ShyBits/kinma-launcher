# Troubleshooting: Images Not Showing

## Current Image Structure
- ✅ Banner: `public/images/games/pathline-banner.jpg`
- ✅ Logo: `public/images/games/pathline-logo.png`

## How to See Changes

### Option 1: Hard Refresh in Electron
1. Open the Electron app
2. Navigate to Market page
3. Press **Ctrl+Shift+R** to hard refresh

### Option 2: Restart the App
1. Close the Electron app completely
2. Run `start.bat`
3. Select mode 1 (Development)
4. Wait for app to load

### Option 3: Check Browser Console
1. Open DevTools (F12)
2. Go to Console tab
3. Look for 404 errors on image files
4. If you see errors, the path is incorrect

## How Market Page Works
- The banner image only shows AFTER you select a game
- Click on any game card to see its banner
- The banner is used as background in the selected game's marketplace

## File Naming Convention
- **Banners**: `{game-name}-banner.jpg` (1920x1080 recommended)
- **Logos**: `{game-name}-logo.png` (square, 256x256 recommended)
- **Items**: `{item-name}.jpg` (512x512 recommended)

## Verify Image Paths
All images in `public` folder are served from root:
- Banner: `/images/games/pathline-banner.jpg`
- Logo: `/images/games/pathline-logo.png`

