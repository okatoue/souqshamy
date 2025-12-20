import Constants from 'expo-constants';

/**
 * Get the app version string from Expo config
 * Includes build number if available
 */
export function getAppVersion(): string {
    const version = Constants.expoConfig?.version || '1.0.0';
    const buildNumber =
        Constants.expoConfig?.ios?.buildNumber ||
        Constants.expoConfig?.android?.versionCode?.toString() ||
        '';

    return buildNumber ? `${version} (${buildNumber})` : version;
}

/**
 * Get the app name from Expo config
 */
export function getAppName(): string {
    return Constants.expoConfig?.name || 'SouqJari';
}

/**
 * Get combined app info (name and version)
 */
export function getAppInfo(): { name: string; version: string } {
    return {
        name: getAppName(),
        version: getAppVersion(),
    };
}
