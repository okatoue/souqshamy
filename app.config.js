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

  return {
    ...config,
    android: {
      ...config.android,
      // Point to the google-services.json file
      googleServicesFile: googleServicesFile,
    },
    plugins: [
      // Remove withGoogleServices - we're using built-in support now
      "./plugins/withDeepLinkHandler",
      "expo-router",
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#ffffff",
          "dark": {
            "backgroundColor": "#000000"
          }
        }
      ],
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "نحتاج إلى موقعك لعرض الإعلانات القريبة منك",
          "locationWhenInUsePermission": "نحتاج إلى موقعك لعرض الإعلانات القريبة منك"
        }
      ],
      [
        "expo-notifications",
        {
          "color": "#18AEF2"
        }
      ]
    ],
  };
};
