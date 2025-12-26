# Map Tiles Implementation - Complete Documentation

This document explains the map tiles implementation in the SouqJari React Native app, the issues we encountered, and how they were resolved.

## Overview

The app uses **PMTiles** (Protomaps Tiles) for offline-capable, vector-based maps with Arabic language support. Maps are rendered using Leaflet and protomaps-leaflet in a WebView component.

### Key Technologies

- **PMTiles**: Self-contained vector tile format for offline maps
- **Leaflet**: JavaScript library for interactive maps
- **protomaps-leaflet**: Plugin for rendering PMTiles in Leaflet
- **Cloudflare R2**: Object storage hosting the PMTiles file
- **React Native WebView**: Renders the HTML/JavaScript maps in the native app

## File Structure

```
components/
├── ui/locationPickerModal/
│   ├── mapHtml.ts                    # Location picker map (with radius overlay)
│   └── LocationPickerModal.tsx       # Modal component with search
├── product-details/
│   ├── mapHtml.ts                    # Product location selector map
│   ├── mapModal.tsx                  # Full-screen map modal
│   └── LocationPreviewCard.tsx       # Static map preview card
```

## Map Configuration

### Current Working Configuration

All maps use this configuration:

```javascript
var layer = protomapsL.leafletLayer({
  url: 'https://images.souqjari.com/maps/middle-east-arabic.pmtiles',
  lang: 'ar',      // Arabic labels
  flavor: 'light', // Light theme (NOT 'theme')
  maxZoom: 18,
  minZoom: 5
});
```

### Library Versions

```html
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/protomaps-leaflet@latest/dist/protomaps-leaflet.js"></script>
```

**Important:** We use `@latest` for protomaps-leaflet to ensure we get version 5.x with all features.

## PMTiles File Details

**URL:** `https://images.souqjari.com/maps/middle-east-arabic.pmtiles`

**Specifications:**
- **Size:** 1,047,446,323 bytes (~1 GB)
- **Format:** MVT (Mapbox Vector Tiles)
- **Schema:** Protomaps Basemap v4.13.4
- **Generated with:** Planetiler 0.9.0
- **Coverage:** Middle East region
- **OSM Data:** December 25, 2025
- **Zoom Levels:** 0-15

**Data Layers:**
- `boundaries` - Country/region borders
- `buildings` - Building footprints (zoom 11-15)
- `earth` - Land polygons with multilingual names
- `landcover` - Vegetation and land cover
- `landuse` - Land usage types (parks, residential, etc.)
- `places` - Cities and place names with Arabic labels (`name:ar`)
- `pois` - Points of interest with Arabic labels
- `roads` - Roads and highways with Arabic labels
- `water` - Water bodies with Arabic labels

All label-supporting layers include the `name:ar` field for proper Arabic rendering.

## WebView Configuration

All WebView components must include these props for proper functionality:

```tsx
<WebView
  source={{ html: MAP_HTML }}
  javaScriptEnabled={true}           // Required for Leaflet
  domStorageEnabled={true}           // Required for protomaps-leaflet
  originWhitelist={['*']}            // Allow all origins (WebView uses null/file://)
  allowFileAccess={true}             // Allow local file access
  allowUniversalAccessFromFileURLs={true}  // Allow cross-origin requests
  mixedContentMode="always"          // Allow HTTPS PMTiles from inline HTML
  scrollEnabled={false}              // Prevent WebView scroll (use map pan instead)
  onMessage={handleWebViewMessage}   // Communication with React Native
  onError={handleWebViewError}       // Error handling
/>
```

## CORS Configuration (Cloudflare R2)

The R2 bucket hosting the PMTiles file **must** have this CORS policy:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["Range", "Content-Type"],
    "ExposeHeaders": ["Content-Range", "Content-Length", "Accept-Ranges", "ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

**Critical Points:**
- `AllowedOrigins: ["*"]` - Required because WebView origin is `null` or `file://`
- `AllowedMethods: ["HEAD"]` - PMTiles needs HEAD requests for metadata
- `AllowedHeaders: ["Range"]` - PMTiles uses range requests (HTTP 206)
- `ExposeHeaders` - **CRITICAL** - These headers must be exposed for PMTiles to work

Apply via Cloudflare Dashboard or Wrangler CLI:
```bash
wrangler r2 bucket cors put images --cors-rules '[...]'
```

## Issues Encountered and Solutions

### Issue 1: Grey Tiles (No Map Display)

**Symptoms:**
- Map container renders but shows grey/blank
- No tiles loading
- Network requests failing or CORS errors

**Root Cause:** Missing or incomplete CORS configuration on R2 bucket

**Solution:** Applied complete CORS policy with `ExposeHeaders` (see above)

**Verification:**
```bash
curl -I -H "Range: bytes=0-16383" \
  https://images.souqjari.com/maps/middle-east-arabic.pmtiles
```

Expected headers:
- `HTTP/1.1 206 Partial Content`
- `Access-Control-Allow-Origin: *`
- `Access-Control-Expose-Headers: Content-Range, ...`
- `Accept-Ranges: bytes`

---

### Issue 2: Land/Water Only (No Roads or Labels)

**Symptoms:**
- Base map geometry renders (land = grey, water = blue)
- No roads, city labels, borders, or buildings
- PMTiles file loads successfully (206 responses)

**Root Cause:** Incorrect protomaps-leaflet configuration parameter

**What We Had (Wrong):**
```javascript
var layer = protomapsL.leafletLayer({
  url: pmtilesUrl,
  labelLang: 'ar',  // ❌ Parameter doesn't exist
  theme: 'light'    // ❌ Deprecated in v4.0+
});
```

**Solution (Correct):**
```javascript
var layer = protomapsL.leafletLayer({
  url: pmtilesUrl,
  lang: 'ar',       // ✅ Correct parameter name
  flavor: 'light'   // ✅ Correct parameter (v4.0+)
});
```

**Why This Happened:**
- protomaps-leaflet v4.0+ replaced `theme` with `flavor` (breaking change)
- The correct parameter is `lang`, not `labelLang`
- With wrong parameters, the library fell back to rendering only basic geometry

**Reference:** [protomaps-leaflet CHANGELOG v4.0.0](https://github.com/protomaps/protomaps-leaflet/blob/main/CHANGELOG.md)

---

### Issue 3: WebView Not Loading Maps

**Symptoms:**
- Maps work in browser but not in React Native
- Console shows security errors
- No tiles loading in WebView

**Root Cause:** Incomplete WebView configuration

**Solution:** Added required WebView props (see WebView Configuration section above)

**Key Props:**
- `domStorageEnabled={true}` - protomaps-leaflet uses local storage
- `originWhitelist={['*']}` - WebView HTML has `null` origin
- `allowUniversalAccessFromFileURLs={true}` - Allows HTTPS requests from inline HTML
- `mixedContentMode="always"` - Allows loading HTTPS PMTiles from non-HTTPS WebView

---

## Debugging Tools

### Debug Logging

All maps include debug logging that reports to React Native console:

```javascript
function debugLog(message, data) {
  console.log('[MapDebug]', message, data || '');
  try {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'debug',
      message: message,
      data: data || null
    }));
  } catch (e) {}
}
```

**View logs:**
```bash
npx react-native log-ios
# or
npx react-native log-android
```

**Expected log sequence:**
```
[WebView Debug] Initializing map { lat: 33.5, lng: 36.3, ... }
[WebView Debug] Leaflet map created successfully
[WebView Debug] Adding protomaps layer { url: "https://..." }
[WebView Debug] Protomaps layer added to map
[WebView Debug] Tile loaded successfully
```

### Testing Maps in Browser

For quick testing without rebuilding the app:

1. Create `test.html` with your map configuration
2. Serve via HTTP (required for CORS):
   ```bash
   npx serve .
   # Open http://localhost:3000/test.html
   ```
3. Check browser console for errors
4. Verify tiles load in Network tab (should see 206 responses)

**Note:** Don't open HTML files directly (`file://`) - CORS won't work.

---

## Map Components

### 1. Location Picker Modal (`locationPickerModal/mapHtml.ts`)

**Features:**
- Full-screen interactive map
- Fixed radius circle overlay
- Center marker dot
- Search functionality
- Adjustable radius via zoom
- "Use Current Location" button

**Usage:**
```tsx
<LocationPickerModal
  visible={showModal}
  currentLocation="Damascus"
  currentRadius={5}
  currentCoordinates={{ latitude: 33.5, longitude: 36.3 }}
  onConfirm={(location, coords, radius) => { /* ... */ }}
  onClose={() => setShowModal(false)}
/>
```

**Communication:**
- `mapReady` - Map initialized
- `mapMoved` - User panned map (sends new center)
- `radiusChanged` - User zoomed (sends new radius)
- `centerResponse` - Response to `getCenter()` request

---

### 2. Product Details Map Modal (`product-details/mapModal.tsx`)

**Features:**
- Point selector (single marker)
- Click to select location
- Search functionality
- No radius overlay

**Usage:**
```tsx
<MapModal
  visible={showModal}
  currentLocation="Damascus"
  onSelectLocation={(location, coords) => { /* ... */ }}
  onClose={() => setShowModal(false)}
/>
```

**Communication:**
- `mapReady` - Map initialized
- `locationTapped` - User clicked map (sends coordinates)

---

### 3. Location Preview Card (`product-details/LocationPreviewCard.tsx`)

**Features:**
- Static map preview (no interaction)
- Radius circle overlay
- Tap to open full map
- Shows address

**Usage:**
```tsx
<LocationPreviewCard
  location="Damascus, Syria"
  coordinates={{ latitude: 33.5, longitude: 36.3 }}
  radius={1000}  // meters
  onPress={() => setShowModal(true)}
  tapHintText="Tap to edit"
/>
```

**Note:** This map is non-interactive (`dragging: false`, `pointerEvents: "none"`).

---

## Performance Considerations

### File Size
- PMTiles: ~1 GB for Middle East region
- Hosted on Cloudflare R2 (fast CDN)
- Only downloads tiles visible in viewport (via range requests)

### Typical Usage
- **Per map view:** 50-100 KB downloaded
- **Zoom level 10 (city view):** ~20-30 tiles
- **Zoom level 15 (street view):** ~50-80 tiles

### Caching
- Tiles are cached by Cloudflare CDN
- Browser/WebView caches previously loaded tiles
- Subsequent views are nearly instant

### Bandwidth Costs (Cloudflare R2)
- **Free tier:** 10 GB/month egress
- **Typical usage:** 10 GB ≈ 100,000 map views/month
- **Beyond free tier:** $0.01/GB

---

## Troubleshooting

### "Map shows grey tiles only"

**Check:**
1. CORS configuration includes `ExposeHeaders`
2. Network tab shows 206 responses (not 403)
3. Browser console for CORS errors

**Fix:** Apply complete CORS policy to R2 bucket

---

### "No roads or labels, only land/water"

**Check:**
1. Using `flavor: 'light'` not `theme: 'light'`
2. Using `lang: 'ar'` not `labelLang: 'ar'`
3. Using protomaps-leaflet `@latest` (v5.x)

**Fix:** Update configuration (see Map Configuration section)

---

### "Map works in browser but not React Native"

**Check:**
1. WebView has all required props (see WebView Configuration)
2. `javaScriptEnabled={true}`
3. `domStorageEnabled={true}`
4. `originWhitelist={['*']}`

**Fix:** Add missing WebView props

---

### "Map loads slowly"

**Normal behavior:**
- First load: ~500ms - 2s (downloads initial tiles)
- Subsequent loads: <100ms (cached)

**If unusually slow:**
1. Check network speed
2. Verify Cloudflare CDN is caching (check `cf-cache-status` header)
3. Consider reducing initial zoom level

---

### "Arabic labels not showing"

**Check:**
1. Using `lang: 'ar'` in configuration
2. PMTiles file includes `name:ar` fields (ours does)
3. Arabic font (Noto Sans Arabic) is loading

**Our PMTiles file includes Arabic labels - this should work out of the box.**

---

## Generating PMTiles (Advanced)

If you need to regenerate or customize the PMTiles file, see `PMTILES-GENERATION-GUIDE.md` for detailed instructions using Planetiler.

**Quick summary:**
```bash
# Download Planetiler
wget https://github.com/onthegomap/planetiler/releases/latest/download/planetiler.jar

# Generate Middle East PMTiles with Arabic
java -Xmx8g -jar planetiler.jar \
  --download \
  --area=middle-east \
  --languages=ar,en \
  --output=middle-east-arabic.pmtiles

# Upload to R2
wrangler r2 object put images/maps/middle-east-arabic.pmtiles \
  --file=middle-east-arabic.pmtiles
```

---

## Future Enhancements

Potential improvements:

1. **Offline Support**
   - Download PMTiles file to device storage
   - Serve locally from file system
   - Reduce data usage

2. **Custom Styling**
   - Create custom `flavor` definitions
   - Match app's color scheme
   - Dark mode support

3. **Search Integration**
   - Use local geocoding (from PMTiles)
   - Reduce dependency on external APIs
   - Faster search results

4. **Tile Updates**
   - Automated PMTiles regeneration
   - Monthly OSM data updates
   - Incremental updates

---

## References

- [Protomaps Documentation](https://docs.protomaps.com/)
- [PMTiles Specification](https://github.com/protomaps/PMTiles)
- [protomaps-leaflet GitHub](https://github.com/protomaps/protomaps-leaflet)
- [Leaflet Documentation](https://leafletjs.com/)
- [React Native WebView](https://github.com/react-native-webview/react-native-webview)
- [Cloudflare R2 CORS](https://developers.cloudflare.com/r2/api/s3/api/#cors)
- [Planetiler](https://github.com/onthegomap/planetiler)

---

## Summary

The map implementation uses PMTiles for efficient, offline-capable vector maps with Arabic language support. The key requirements are:

1. ✅ **Correct CORS on R2** - Must expose headers for range requests
2. ✅ **Correct protomaps-leaflet config** - Use `lang: 'ar'` and `flavor: 'light'`
3. ✅ **Proper WebView configuration** - Enable all necessary security permissions
4. ✅ **Complete PMTiles file** - Must include all data layers with Arabic labels

All maps are now working correctly with roads, Arabic labels, borders, and full map features.
