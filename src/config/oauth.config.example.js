// Copy this file to oauth.config.js and fill in your OAuth client IDs.
export default {
  googleClientId: "GOOGLE_CLIENT_ID.apps.googleusercontent.com",
  discordClientId: "DISCORD_CLIENT_ID",
  githubClientId: "GITHUB_CLIENT_ID",
  microsoftClientId: "MICROSOFT_CLIENT_ID",
  // Must be registered in both provider consoles. We intercept in Electron, no server needed.
  redirectUri: "http://localhost:51789/callback"
};


