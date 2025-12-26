# PMTiles Generation Guide - Creating Complete Map Data

This guide explains how to generate a complete PMTiles file for the Middle East with Arabic labels, roads, boundaries, and all map features.

## The Problem

Your current PMTiles file (1GB) only shows:
- ✅ Land polygons (grey)
- ✅ Water bodies (blue)
- ❌ Roads and highways
- ❌ City and place labels
- ❌ Borders and boundaries
- ❌ Buildings and POIs

This indicates the PMTiles was generated with minimal data layers, likely only containing basic land/water polygons.

## Diagnostic Tests

Before regenerating, run these tests to confirm the issue:

### 1. Compare with Official Basemap
```bash
npx serve .
# Open http://localhost:3000/test-comparison.html
```

This shows your PMTiles side-by-side with the official Protomaps basemap. If the official map shows full details but yours doesn't, your PMTiles needs regeneration.

### 2. Inspect PMTiles Metadata
```bash
npx serve .
# Open http://localhost:3000/inspect-pmtiles.html
```

This will show you exactly what data layers are in your PMTiles file. You should see layers like:
- `transportation` or `roads`
- `place` or `place_labels`
- `boundary` or `admin`
- `building`
- `water`, `landuse`, `landcover`
- `poi` (points of interest)

## Solution Options

### Option 1: Use Official Protomaps Basemap (Quickest)

**Pros:**
- Works immediately
- Professionally maintained
- Optimized file size
- Automatic updates

**Cons:**
- Global coverage (large file)
- No customization
- External dependency

**Implementation:**

1. **Download or use hosted version:**

   ```bash
   # Option A: Use hosted (recommended for testing)
   # No download needed, use directly:
   https://build.protomaps.com/20230901.pmtiles
   ```

2. **Update your map configuration:**

   ```javascript
   var layer = protomapsL.leafletLayer({
     url: 'https://build.protomaps.com/20230901.pmtiles',
     lang: 'ar',
     theme: 'light'
   });
   ```

3. **For production, download and self-host:**

   ```bash
   # Download the latest build (warning: ~100GB for global)
   # Or use regional extracts from https://maps.protomaps.com/builds/

   # Upload to R2
   wrangler r2 object put images/maps/protomaps-latest.pmtiles --file=protomaps.pmtiles
   ```

### Option 2: Generate Regional Extract with Planetiler (Recommended)

**Pros:**
- Custom region (smaller file size)
- Full control over data
- Arabic labels included
- Open source and free

**Cons:**
- Requires setup and processing time
- Need sufficient RAM (8GB+ recommended)
- Initial learning curve

#### Step 1: Install Planetiler

```bash
# Download latest Planetiler JAR
wget https://github.com/onthegomap/planetiler/releases/latest/download/planetiler.jar

# Or use Docker
docker pull ghcr.io/onthegomap/planetiler/planetiler:latest
```

#### Step 2: Download OpenStreetMap Data

```bash
# Download Middle East extract from Geofabrik
wget https://download.geofabrik.de/asia/middle-east-latest.osm.pbf

# This file contains all OSM data for the Middle East
# Size: ~2-3 GB
```

#### Step 3: Generate PMTiles

```bash
# Using JAR (Linux/Mac/Windows)
java -Xmx8g -jar planetiler.jar \
  --download \
  --area=middle-east \
  --output=middle-east-complete.pmtiles

# Or using Docker
docker run -v "$(pwd)/data":/data ghcr.io/onthegomap/planetiler/planetiler:latest \
  --download \
  --area=middle-east \
  --output=/data/middle-east-complete.pmtiles
```

**Advanced Options for Arabic Labels:**

```bash
java -Xmx8g -jar planetiler.jar \
  --download \
  --area=middle-east \
  --languages=ar,en \
  --output=middle-east-arabic.pmtiles
```

This process takes 30-60 minutes depending on your system.

#### Step 4: Upload to Cloudflare R2

```bash
# Upload the generated file
wrangler r2 object put images/maps/middle-east-complete.pmtiles \
  --file=middle-east-complete.pmtiles

# Verify upload
wrangler r2 object head images/maps/middle-east-complete.pmtiles
```

#### Step 5: Update Your App

Replace the URL in your map configurations:

```javascript
var layer = protomapsL.leafletLayer({
  url: 'https://images.souqjari.com/maps/middle-east-complete.pmtiles',
  lang: 'ar',
  theme: 'light'
});
```

### Option 3: Generate with Tilemaker (Alternative)

**Similar to Planetiler but different approach:**

```bash
# Install tilemaker
git clone https://github.com/systemed/tilemaker.git
cd tilemaker
make

# Download OpenStreetMap data
wget https://download.geofabrik.de/asia/middle-east-latest.osm.pbf

# Generate tiles
./tilemaker --input middle-east-latest.osm.pbf \
           --output middle-east.pmtiles \
           --config resources/config-openmaptiles.json \
           --process resources/process-openmaptiles.lua
```

### Option 4: Use Protomaps Regional Builds

Protomaps provides regional extracts that are smaller than the global basemap:

```bash
# Browse available regions at:
# https://maps.protomaps.com/builds/

# Example: Download Middle East region
wget https://build.protomaps.com/middle-east-20230901.pmtiles

# Upload to R2
wrangler r2 object put images/maps/middle-east-protomaps.pmtiles \
  --file=middle-east-20230901.pmtiles
```

## Recommended Data Schema

Your PMTiles should include these layers for a complete map:

### Essential Layers

1. **water** - Water bodies (oceans, lakes, rivers)
2. **landuse** - Land usage (parks, forests, residential, commercial)
3. **landcover** - Land cover (grass, sand, rock)
4. **transportation** / **roads** - Roads, highways, paths
5. **buildings** - Building footprints
6. **places** / **place_labels** - City and place names
7. **boundaries** / **admin** - Administrative boundaries
8. **poi** / **poi_labels** - Points of interest

### Essential Fields for Arabic Support

Each feature should have:
- `name` - Default name (often in local language)
- `name:en` - English name
- `name:ar` - Arabic name
- `name:latin` - Transliterated name

OpenStreetMap data for the Middle East typically includes all these fields.

## Verifying Your Generated PMTiles

After generating, verify it has all data:

1. **Check file size:**
   - Minimal (landuse only): ~100-500 MB
   - Complete (all layers): ~1-3 GB for Middle East
   - If your file is 1GB but missing layers, something went wrong

2. **Inspect metadata:**
   ```bash
   npx serve .
   # Open http://localhost:3000/inspect-pmtiles.html
   # Paste your new PMTiles URL
   ```

   You should see:
   - ✅ 8-12 vector layers
   - ✅ transportation/roads layer
   - ✅ place/labels layer
   - ✅ boundaries layer

3. **Visual test:**
   ```bash
   # Open test-comparison.html
   # Replace right map URL with your new PMTiles
   # Compare with official Protomaps on the left
   ```

   You should see:
   - ✅ Roads at zoom 10+
   - ✅ City labels at zoom 8+
   - ✅ Country borders
   - ✅ Buildings at zoom 15+

## Troubleshooting

### "Generated file is huge (>10GB)"

This usually means you included too much detail or used global data:
- Use regional extracts, not `planet.osm.pbf`
- Limit max zoom: `--max-zoom=14` (roads/labels don't need zoom 18)
- Simplify geometries at lower zooms

### "No labels showing after regeneration"

Check that:
1. The `name:ar` fields exist in source OSM data
2. Planetiler/Tilemaker config includes multilingual support
3. The `lang: 'ar'` parameter is set in protomaps-leaflet
4. Metadata shows `place` or `place_labels` layer

### "Roads not showing"

Check that:
1. Metadata shows `transportation` or `roads` layer
2. Your zoom level is high enough (zoom 10+ for major roads)
3. The theme you're using includes road rendering

### "File works in browser but not in React Native"

This is a WebView caching issue:
1. Uninstall and reinstall the app
2. Clear app data
3. Rebuild with `--reset-cache`
4. Check that all WebView props are set (see main fix)

## Cost Considerations

### Storage (Cloudflare R2)

- Free tier: 10 GB storage
- Middle East PMTiles: ~1-3 GB
- Cost: **Free** (within limits)

### Bandwidth (Cloudflare R2)

- Free tier: 10 GB/month egress (downloads)
- PMTiles uses range requests (only downloads needed tiles)
- Typical usage: 50-100 KB per map view
- 10 GB = ~100,000 map views/month
- Beyond free tier: $0.01/GB

### Recommendation

Start with official Protomaps basemap to test, then generate your own regional PMTiles for production to reduce file size and bandwidth.

## Quick Start Commands

```bash
# 1. Test with official Protomaps (no generation needed)
# Update maps to use: https://build.protomaps.com/20230901.pmtiles

# 2. Generate your own (recommended)
# Download Planetiler
wget https://github.com/onthegomap/planetiler/releases/latest/download/planetiler.jar

# Generate Middle East PMTiles with Arabic support
java -Xmx8g -jar planetiler.jar \
  --download \
  --area=middle-east \
  --languages=ar,en \
  --output=middle-east-arabic-complete.pmtiles

# Upload to R2
wrangler r2 object put images/maps/middle-east-arabic-complete.pmtiles \
  --file=middle-east-arabic-complete.pmtiles

# 3. Verify
# Open inspect-pmtiles.html with your new URL
```

## References

- [Planetiler Documentation](https://github.com/onthegomap/planetiler)
- [Tilemaker Documentation](https://github.com/systemed/tilemaker)
- [Protomaps Basemaps](https://protomaps.com/docs/basemaps)
- [Geofabrik Downloads](https://download.geofabrik.de/)
- [OpenMapTiles Schema](https://openmaptiles.org/schema/)
