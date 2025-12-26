# Cloudflare R2 CORS Configuration for PMTiles

This document explains how to configure CORS on your Cloudflare R2 bucket to support PMTiles map tiles in a React Native WebView.

## Why CORS Configuration is Critical

PMTiles files require **range requests** to function properly. The protomaps-leaflet library needs to:
1. Make HEAD requests to read the PMTiles file header
2. Make GET requests with Range headers to fetch specific tile data
3. Read response headers like `Content-Range`, `Content-Length`, and `Accept-Ranges`

Without proper CORS configuration, the browser/WebView will block these requests and you'll see grey tiles instead of your map.

## Required CORS Configuration

Your R2 bucket needs the following CORS policy:

```json
[
  {
    "AllowedOrigins": [
      "*"
    ],
    "AllowedMethods": [
      "GET",
      "HEAD"
    ],
    "AllowedHeaders": [
      "Range",
      "Content-Type"
    ],
    "ExposeHeaders": [
      "Content-Range",
      "Content-Length",
      "Accept-Ranges",
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

### Configuration Breakdown

- **AllowedOrigins**: `["*"]` allows requests from any origin
  - For React Native WebView with inline HTML, the origin is often `null` or `file://`
  - Using `*` (wildcard) ensures compatibility with all platforms (iOS, Android, web)
  - For production, you can restrict this to specific origins:
    ```json
    "AllowedOrigins": [
      "https://souqjari.com",
      "https://*.souqjari.com",
      "exp://*",
      "http://localhost:*"
    ]
    ```
    Note: Some origins like `null`, `file://`, and wildcard subdomains may not work. Test thoroughly.

- **AllowedMethods**: `["GET", "HEAD"]`
  - `GET` - Required to download tile data
  - `HEAD` - Required to read PMTiles metadata without downloading the full file

- **AllowedHeaders**: `["Range", "Content-Type"]`
  - `Range` - PMTiles uses range requests to fetch specific byte ranges
  - `Content-Type` - Standard HTTP header

- **ExposeHeaders**: `["Content-Range", "Content-Length", "Accept-Ranges", "ETag"]`
  - **CRITICAL**: These headers must be exposed for PMTiles to work
  - `Content-Range` - Tells the client which bytes are in the response
  - `Content-Length` - Total file size
  - `Accept-Ranges` - Indicates the server supports range requests
  - `ETag` - For caching

- **MaxAgeSeconds**: `3600`
  - How long browsers can cache the CORS preflight response (1 hour)

## How to Apply CORS Configuration to R2

### Using Cloudflare Dashboard

1. Log in to your Cloudflare Dashboard
2. Navigate to **R2** → **Your Bucket** (e.g., `images`)
3. Go to **Settings** → **CORS Policy**
4. Click **Add CORS Policy** or **Edit**
5. Paste the JSON configuration above
6. Click **Save**

### Using Wrangler CLI

If you're using the Wrangler CLI, you can configure CORS with:

```bash
wrangler r2 bucket cors put images --cors-rules '[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["Range", "Content-Type"],
    "ExposeHeaders": ["Content-Range", "Content-Length", "Accept-Ranges", "ETag"],
    "MaxAgeSeconds": 3600
  }
]'
```

Replace `images` with your bucket name.

## Verifying CORS Configuration

After applying the CORS configuration, test it with curl:

```bash
# Test HEAD request
curl -I -H "Origin: http://localhost" \
  https://images.souqjari.com/maps/middle-east-arabic.pmtiles

# Test Range request
curl -I -H "Origin: http://localhost" \
  -H "Range: bytes=0-16383" \
  https://images.souqjari.com/maps/middle-east-arabic.pmtiles
```

Expected response headers:
```
HTTP/2 206 Partial Content
access-control-allow-origin: *
access-control-expose-headers: Content-Range, Content-Length, Accept-Ranges, ETag
accept-ranges: bytes
content-range: bytes 0-16383/[total-size]
content-length: 16384
```

## Testing in Browser

Open the included `test-pmtiles.html` file in a browser (served via HTTP, not file://):

```bash
npx serve .
# Then open http://localhost:3000/test-pmtiles.html
```

Check the diagnostic console on the page for:
- ✅ "Protomaps layer added successfully"
- ✅ "Tile loaded successfully"
- ✅ "Range request status: 206"

If you see errors, check the console for CORS-related messages.

## Troubleshooting

### Grey Tiles After CORS Configuration

If you still see grey tiles after configuring CORS:

1. **Clear cache**: The browser may have cached the failed CORS preflight
   - In React Native: Rebuild the app or clear app data
   - In browser: Hard refresh (Cmd/Ctrl + Shift + R)

2. **Check debug logs**: Look for `[WebView Debug]` messages in your React Native logs:
   ```bash
   npx react-native log-ios
   # or
   npx react-native log-android
   ```

3. **Verify CORS headers**: Use browser DevTools → Network tab:
   - Look for requests to `*.pmtiles`
   - Check Response Headers for `access-control-*` headers
   - Status should be `206 Partial Content` for range requests

4. **Test with public PMTiles**: Temporarily use a known-working PMTiles URL:
   ```javascript
   url: 'https://build.protomaps.com/20230901.pmtiles'
   ```
   If this works, the issue is with your R2 CORS configuration.

5. **Check PMTiles file integrity**: Ensure the file was uploaded correctly:
   ```bash
   # Download first 16KB and check it's a valid PMTiles file
   curl -r 0-16383 https://images.souqjari.com/maps/middle-east-arabic.pmtiles > test.pmtiles
   # Should start with "PMTiles" magic bytes
   hexdump -C test.pmtiles | head -3
   ```

### Common CORS Errors

- **"No 'Access-Control-Allow-Origin' header is present"**
  → CORS not configured or origin not allowed

- **"CORS header 'Access-Control-Allow-Origin' does not match '*'"**
  → Your AllowedOrigins is too restrictive (try `["*"]`)

- **"Request header field Range is not allowed"**
  → Add "Range" to AllowedHeaders

- **"Cannot read property 'Content-Range' of null"**
  → Add "Content-Range" to ExposeHeaders

## React Native WebView Specifics

React Native WebView has special requirements:

1. **Origin is often `null`**: When using inline HTML (`source={{ html: ... }}`), the origin is `null`, which some CORS configs reject. Using `AllowedOrigins: ["*"]` is the most reliable solution.

2. **WebView Settings Required**:
   ```tsx
   <WebView
     javaScriptEnabled={true}
     domStorageEnabled={true}
     originWhitelist={['*']}
     allowFileAccess={true}
     allowUniversalAccessFromFileURLs={true}
     mixedContentMode="always"
   />
   ```

3. **Platform Differences**:
   - iOS uses WKWebView (stricter CORS enforcement)
   - Android uses Chromium WebView (more lenient)
   - Always test on both platforms

## Security Considerations

### Production Recommendations

For production, consider:

1. **Restrict origins**: Instead of `["*"]`, use specific domains:
   ```json
   "AllowedOrigins": ["https://souqjari.com", "https://app.souqjari.com"]
   ```
   Note: This may not work for React Native apps. Test thoroughly.

2. **Use R2 Custom Domain**: Instead of `r2.dev` URLs, use your own domain:
   - Reduces CORS complexity
   - Better for branding
   - Can use Cloudflare WAF rules

3. **Enable Cloudflare Cache**: PMTiles files are large and immutable:
   - Cache them at the edge for better performance
   - Reduce R2 bandwidth costs

4. **Monitor usage**: Set up alerts for unusual traffic patterns

## Additional Resources

- [PMTiles Specification](https://github.com/protomaps/PMTiles)
- [protomaps-leaflet Documentation](https://github.com/protomaps/protomaps-leaflet)
- [Cloudflare R2 CORS Documentation](https://developers.cloudflare.com/r2/api/s3/api/#cors)
- [React Native WebView Props](https://github.com/react-native-webview/react-native-webview/blob/master/docs/Reference.md)
