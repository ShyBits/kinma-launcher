// Steam Configuration Example
// Copy this file to 'steam.config.js' and fill in your credentials

export const steamConfig = {
  // Get your API Key from: https://steamcommunity.com/dev/apikey
  apiKey: 'YOUR_STEAM_API_KEY_HERE',
  
  // Get your Steam ID64 from: https://steamid.io
  steamId: 'YOUR_STEAM_ID_HERE',
  
  // API endpoints (usually don't need to change these)
  baseURL: 'https://api.steampowered.com',
  storeURL: 'https://store.steampowered.com',
  communityURL: 'https://steamcommunity.com'
};

export default steamConfig;

