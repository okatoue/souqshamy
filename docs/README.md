# Map Tiles Documentation

Complete documentation for the PMTiles-based offline map implementation in SouqJari.

## Quick Links

- **[MAP-TILES-IMPLEMENTATION.md](./MAP-TILES-IMPLEMENTATION.md)** - Main documentation
  - Complete overview of the implementation
  - Configuration details
  - Troubleshooting guide
  - Map component usage

- **[R2-CORS-SETUP.md](./R2-CORS-SETUP.md)** - CORS configuration
  - Required R2 bucket CORS policy
  - Setup instructions
  - Verification steps

- **[PMTILES-GENERATION-GUIDE.md](./PMTILES-GENERATION-GUIDE.md)** - PMTiles generation
  - How to generate/update PMTiles files
  - Using Planetiler
  - Advanced customization

## What You Need to Know

### If maps are not working:

1. **Read:** [MAP-TILES-IMPLEMENTATION.md - Troubleshooting](./MAP-TILES-IMPLEMENTATION.md#troubleshooting)
2. **Check:** CORS configuration in [R2-CORS-SETUP.md](./R2-CORS-SETUP.md)
3. **Verify:** Configuration matches the examples in main docs

### If you need to update the map data:

1. **Read:** [PMTILES-GENERATION-GUIDE.md](./PMTILES-GENERATION-GUIDE.md)
2. **Run:** Planetiler to generate new PMTiles
3. **Upload:** New file to Cloudflare R2

### If you're implementing maps in a new component:

1. **Read:** [MAP-TILES-IMPLEMENTATION.md - Map Components](./MAP-TILES-IMPLEMENTATION.md#map-components)
2. **Copy:** Configuration from existing components
3. **Test:** In browser first, then React Native

## Current Status

✅ **All maps working correctly**

- PMTiles file: `middle-east-arabic.pmtiles` (1 GB)
- Hosted on: Cloudflare R2
- CORS: Properly configured
- Features: Roads, Arabic labels, boundaries, buildings
- Platforms: iOS and Android

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    React Native App                         │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Location      │  │ Product      │  │ Location        │  │
│  │ Picker Modal  │  │ Map Modal    │  │ Preview Card    │  │
│  └───────┬───────┘  └──────┬───────┘  └────────┬────────┘  │
│          │                 │                    │           │
│          └─────────────────┴────────────────────┘           │
│                            │                                │
│                    ┌───────▼────────┐                       │
│                    │  React Native  │                       │
│                    │    WebView     │                       │
│                    └───────┬────────┘                       │
└────────────────────────────┼────────────────────────────────┘
                             │
                             │ HTTPS (range requests)
                             │
                    ┌────────▼─────────┐
                    │  Cloudflare R2   │
                    │   (with CORS)    │
                    └────────┬─────────┘
                             │
                  ┌──────────▼──────────────┐
                  │  PMTiles File (1 GB)    │
                  │  - Roads (Arabic)       │
                  │  - Labels (Arabic)      │
                  │  - Boundaries           │
                  │  - Buildings            │
                  │  - Water, Land, POIs    │
                  └─────────────────────────┘
```

## Key Technologies

- **PMTiles** - Vector tile format for offline maps
- **Leaflet** - JavaScript mapping library
- **protomaps-leaflet** - PMTiles renderer for Leaflet
- **React Native WebView** - Renders maps in native app
- **Cloudflare R2** - Object storage for PMTiles file

## Quick Reference

### Map Configuration

```javascript
var layer = protomapsL.leafletLayer({
  url: 'https://images.souqjari.com/maps/middle-east-arabic.pmtiles',
  lang: 'ar',      // Arabic labels
  flavor: 'light', // Light theme
  maxZoom: 18,
  minZoom: 5
});
```

### WebView Props

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

### CORS Policy

```json
{
  "AllowedOrigins": ["*"],
  "AllowedMethods": ["GET", "HEAD"],
  "AllowedHeaders": ["Range", "Content-Type"],
  "ExposeHeaders": ["Content-Range", "Content-Length", "Accept-Ranges", "ETag"],
  "MaxAgeSeconds": 3600
}
```

## Common Issues & Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| Grey tiles | Check CORS → [R2-CORS-SETUP.md](./R2-CORS-SETUP.md) |
| No roads/labels | Check config uses `flavor: 'light'` and `lang: 'ar'` |
| Works in browser, not RN | Check WebView props (see main docs) |
| Slow loading | Normal first load, should be fast after |

## Need Help?

1. Check [MAP-TILES-IMPLEMENTATION.md - Troubleshooting](./MAP-TILES-IMPLEMENTATION.md#troubleshooting)
2. Review recent git commits for fixes
3. Check debug logs: `npx react-native log-ios` or `log-android`

## Contributing

When modifying map code:

1. Test in browser first (faster iteration)
2. Check both iOS and Android
3. Verify debug logs show no errors
4. Update documentation if changing configuration

## License & Attribution

Maps based on:
- **OpenStreetMap data** - © OpenStreetMap contributors
- **Protomaps basemap schema** - © Protomaps
- **Natural Earth** - Public domain

See PMTiles file metadata for detailed attribution.
