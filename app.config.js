// Dynamic Expo configuration
// This allows reading google-services.json from EAS secrets

const fs = require('fs');
const path = require('path');

module.exports = ({ config }) => {
  // Check for google-services.json from EAS secret (file path) or local file
  let googleServicesFile = null;

  // EAS provides file secrets as paths in environment variables
  if (process.env.GOOGLE_SERVICES_JSON) {
    googleServicesFile = process.env.GOOGLE_SERVICES_JSON;
    console.log('[app.config.js] Using google-services.json from EAS secret');
  } else if (fs.existsSync(path.join(__dirname, 'google-services.json'))) {
    googleServicesFile = './google-services.json';
    console.log('[app.config.js] Using local google-services.json');
  }

  // Filter out withGoogleServices from plugins if present (we use googleServicesFile now)
  const filteredPlugins = (config.plugins || []).filter(plugin => {
    const pluginName = Array.isArray(plugin) ? plugin[0] : plugin;
    return pluginName !== './plugins/withGoogleServices';
  });

  return {
    ...config,
    android: {
      ...config.android,
      // Point to the google-services.json file for FCM
      googleServicesFile: googleServicesFile,
    },
    // Keep all original plugins except withGoogleServices
    plugins: filteredPlugins,
  };
};
