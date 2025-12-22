const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin to copy google-services.json to android/app during prebuild
 */
module.exports = function withGoogleServices(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const sourceFile = path.join(projectRoot, 'google-services.json');
      const destDir = path.join(projectRoot, 'android', 'app');
      const destFile = path.join(destDir, 'google-services.json');

      if (fs.existsSync(sourceFile)) {
        // Ensure directory exists
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }

        // Copy the file
        fs.copyFileSync(sourceFile, destFile);
        console.log('[withGoogleServices] Copied google-services.json to android/app/');
      } else {
        console.warn('[withGoogleServices] google-services.json not found in project root');
      }

      return config;
    },
  ]);
};
