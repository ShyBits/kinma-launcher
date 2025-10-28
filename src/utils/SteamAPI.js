import steamConfig from '../config/steam.config';

// Steam API Integration for Kinma Launcher
class SteamAPI {
  constructor() {
    this.apiKey = steamConfig.apiKey;
    this.steamId = steamConfig.steamId;
    this.baseURL = steamConfig.baseURL;
  }

  // Resolve vanity URL to Steam ID64
  async resolveVanityURL(vanityUrl) {
    if (!this.apiKey) {
      throw new Error('Steam API Key not configured');
    }

    try {
      const response = await fetch(
        `${this.baseURL}/ISteamUser/ResolveVanityURL/v0001/?key=${this.apiKey}&vanityurl=${vanityUrl}&format=json`
      );
      const data = await response.json();
      
      if (data.response.success === 1) {
        return data.response.steamid;
      } else {
        throw new Error('Vanity URL not found');
      }
    } catch (error) {
      console.error('Error resolving vanity URL:', error);
      throw error;
    }
  }

  // Set Steam API Key and User ID
  async initialize(apiKey, steamId) {
    this.apiKey = apiKey;
    this.steamId = steamId;
    
    // Verify connection
    try {
      const result = await this.getOwnedGames();
      return { success: true, gamesCount: result.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Auto-initialize with vanity URL if Steam ID not set
  async autoInitialize() {
    if (!this.steamId && steamConfig.vanityUrl) {
      console.log('Auto-resolving Steam ID from vanity URL:', steamConfig.vanityUrl);
      this.steamId = await this.resolveVanityURL(steamConfig.vanityUrl);
      console.log('Resolved Steam ID64:', this.steamId);
    }
  }

  // Get user's owned games
  async getOwnedGames() {
    // Auto-initialize if needed
    if (!this.steamId) {
      await this.autoInitialize();
    }
    
    if (!this.steamId || !this.apiKey) {
      throw new Error('Steam API not initialized');
    }

    // Since we're in a client-side environment, we'll use a mock implementation
    // In production, this should call your backend which then calls Steam API
    const response = await fetch(`${this.baseURL}/IPlayerService/GetOwnedGames/v0001/?key=${this.apiKey}&steamid=${this.steamId}&format=json`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch Steam games');
    }

    const data = await response.json();
    return data.response.games || [];
  }

  // Get game details
  async getGameDetails(appId) {
    try {
      const response = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}`);
      const data = await response.json();
      return data[appId].data;
    } catch (error) {
      console.error('Error fetching game details:', error);
      return null;
    }
  }

  // Get game stats
  async getGameStats(appId) {
    if (!this.apiKey || !this.steamId) {
      throw new Error('Steam API not initialized');
    }

    try {
      const response = await fetch(`${this.baseURL}/ISteamUserStats/GetUserStatsForGame/v0002/?appid=${appId}&key=${this.apiKey}&steamid=${this.steamId}`);
      const data = await response.json();
      return data.playerstats || null;
    } catch (error) {
      return null;
    }
  }

  // Get player achievements
  async getPlayerAchievements(appId) {
    if (!this.apiKey || !this.steamId) {
      throw new Error('Steam API not initialized');
    }

    try {
      const response = await fetch(`${this.baseURL}/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${appId}&key=${this.apiKey}&steamid=${this.steamId}`);
      const data = await response.json();
      return data.playerstats || null;
    } catch (error) {
      return null;
    }
  }

  // Get workshop items for a game
  async getWorkshopItems(appId, numItems = 50) {
    try {
      const response = await fetch(`https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/?appid=${appId}&numitems=${numItems}`);
      const data = await response.json();
      return data.response.publishedfiledetails || [];
    } catch (error) {
      console.error('Error fetching workshop items:', error);
      return [];
    }
  }

  // Get workshop item details
  async getWorkshopItemDetails(itemId) {
    try {
      const response = await fetch(`https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/?publishedfileids[0]=${itemId}`);
      const data = await response.json();
      return data.response.publishedfiledetails[0] || null;
    } catch (error) {
      console.error('Error fetching workshop item details:', error);
      return null;
    }
  }

  // Get player's recent games
  async getRecentlyPlayedGames(count = 5) {
    if (!this.steamId || !this.apiKey) {
      throw new Error('Steam API not initialized');
    }

    try {
      const response = await fetch(`${this.baseURL}/IPlayerService/GetRecentlyPlayedGames/v0001/?key=${this.apiKey}&steamid=${this.steamId}&count=${count}&format=json`);
      const data = await response.json();
      return data.response.games || [];
    } catch (error) {
      return [];
    }
  }

  // Launch Steam game
  async launchGame(gameId) {
    // This would typically be handled by Steam client
    // In Electron, we can use child_process to launch
    const { shell } = window.require('electron');
    
    // Launch via Steam URI
    shell.openExternal(`steam://run/${gameId}`);
    
    return { success: true, gameId };
  }

  // Get game image URL
  getGameImageURL(appId, hash) {
    return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;
  }

  // Get game logo URL
  getGameLogoURL(appId) {
    return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/logo.png`;
  }
}

// Create singleton instance
const steamAPI = new SteamAPI();

export default steamAPI;

