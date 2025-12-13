// plugins/withDeepLinkHandler.js
// Expo config plugin that modifies MainActivity to capture deep link URLs
// before React Native processes them, storing them in SharedPreferences.

const { withMainActivity, withAndroidManifest } = require('@expo/config-plugins');

/**
 * Add code to MainActivity to capture and store the initial Intent URL
 */
function addDeepLinkCapture(mainActivity) {
  // Add import for SharedPreferences if not present
  if (!mainActivity.includes('import android.content.SharedPreferences')) {
    mainActivity = mainActivity.replace(
      'import android.os.Bundle;',
      `import android.os.Bundle;
import android.content.SharedPreferences;
import android.net.Uri;`
    );
  }

  // Find the onCreate method and add our URL capture code
  // We need to capture the Intent data BEFORE super.onCreate() calls React Native
  const onCreateRegex = /(@Override\s+protected void onCreate\(Bundle savedInstanceState\)\s*\{)/;

  if (onCreateRegex.test(mainActivity)) {
    mainActivity = mainActivity.replace(
      onCreateRegex,
      `@Override
  protected void onCreate(Bundle savedInstanceState) {
    // Capture deep link URL BEFORE React Native processes it
    captureDeepLinkUrl();`
    );
  }

  // Add the capture method if not present
  if (!mainActivity.includes('captureDeepLinkUrl')) {
    // Find the closing brace of the class and add our method before it
    const lastBraceIndex = mainActivity.lastIndexOf('}');
    const captureMethod = `

  /**
   * Captures the deep link URL from the Intent and stores it in SharedPreferences.
   * This runs BEFORE React Native processes the Intent, ensuring we capture the full URL
   * including hash fragments.
   */
  private void captureDeepLinkUrl() {
    try {
      android.content.Intent intent = getIntent();
      if (intent != null) {
        Uri data = intent.getData();
        if (data != null) {
          String url = data.toString();
          android.util.Log.d("DeepLinkHandler", "Captured deep link URL: " + url);

          // Store the URL in SharedPreferences
          SharedPreferences prefs = getSharedPreferences("DeepLinkPrefs", MODE_PRIVATE);
          SharedPreferences.Editor editor = prefs.edit();
          editor.putString("initialUrl", url);
          editor.putLong("timestamp", System.currentTimeMillis());
          editor.apply();
        }
      }
    } catch (Exception e) {
      android.util.Log.e("DeepLinkHandler", "Error capturing deep link URL", e);
    }
  }
`;
    mainActivity = mainActivity.slice(0, lastBraceIndex) + captureMethod + mainActivity.slice(lastBraceIndex);
  }

  return mainActivity;
}

const withDeepLinkHandler = (config) => {
  // Modify MainActivity
  config = withMainActivity(config, (config) => {
    if (config.modResults.language === 'java') {
      config.modResults.contents = addDeepLinkCapture(config.modResults.contents);
    } else if (config.modResults.language === 'kt' || config.modResults.language === 'kotlin') {
      // For Kotlin, we'd need different syntax - leaving as TODO
      console.warn('[withDeepLinkHandler] Kotlin MainActivity not yet supported');
    }
    return config;
  });

  return config;
};

module.exports = withDeepLinkHandler;
