const { withDangerousMod, withAppBuildGradle, withProjectBuildGradle } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin to:
 * 1. Copy google-services.json to android/app during prebuild
 * 2. Add google-services gradle plugin to process the file
 */

// Add google-services plugin to root build.gradle
function withGoogleServicesProjectGradle(config) {
  return withProjectBuildGradle(config, (config) => {
    const contents = config.modResults.contents;

    // Check if google-services is already added
    if (contents.includes('com.google.gms.google-services')) {
      return config;
    }

    // Add to buildscript dependencies if using old style
    if (contents.includes('buildscript')) {
      config.modResults.contents = contents.replace(
        /buildscript\s*\{[\s\S]*?dependencies\s*\{/,
        (match) => `${match}\n        classpath 'com.google.gms:google-services:4.4.2'`
      );
    }

    // Add to plugins block if using new style
    if (contents.includes('plugins {')) {
      config.modResults.contents = config.modResults.contents.replace(
        /plugins\s*\{/,
        `plugins {\n    id("com.google.gms.google-services") version "4.4.2" apply false`
      );
    }

    console.log('[withGoogleServices] Added google-services to project build.gradle');
    return config;
  });
}

// Add google-services plugin to app build.gradle
function withGoogleServicesAppGradle(config) {
  return withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;

    // Check if google-services is already applied
    if (contents.includes('com.google.gms.google-services')) {
      return config;
    }

    // Add plugin to plugins block
    if (contents.includes('plugins {')) {
      config.modResults.contents = contents.replace(
        /plugins\s*\{/,
        `plugins {\n    id("com.google.gms.google-services")`
      );
    } else {
      // Add apply plugin at the end if no plugins block
      config.modResults.contents = contents + '\napply plugin: "com.google.gms.google-services"\n';
    }

    console.log('[withGoogleServices] Added google-services to app build.gradle');
    return config;
  });
}

// Copy google-services.json file
function withGoogleServicesFile(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const sourceFile = path.join(projectRoot, 'google-services.json');
      const destDir = path.join(projectRoot, 'android', 'app');
      const destFile = path.join(destDir, 'google-services.json');

      if (fs.existsSync(sourceFile)) {
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        fs.copyFileSync(sourceFile, destFile);
        console.log('[withGoogleServices] Copied google-services.json to android/app/');
      } else {
        console.warn('[withGoogleServices] google-services.json not found in project root');
      }

      return config;
    },
  ]);
}

// Main plugin - combines all modifications
module.exports = function withGoogleServices(config) {
  config = withGoogleServicesProjectGradle(config);
  config = withGoogleServicesAppGradle(config);
  config = withGoogleServicesFile(config);
  return config;
};
