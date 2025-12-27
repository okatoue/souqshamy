# Syria-Only PMTiles: Comparison & Implementation

This guide compares Syria-only vs multi-country PMTiles and shows how to implement either option.

## Quick Comparison

| Aspect | Syria Only | Multi-Country (Current) |
|--------|------------|-------------------------|
| **File Size** | ~200-400 MB | ~1 GB |
| **Generation Time** | 5-10 minutes | 30-60 minutes |
| **Coverage** | Syria boundaries only | Lebanon + Syria + Jordan |
| **Bandwidth/View** | ~30-50 KB | ~50-100 KB |
| **Border Areas** | ❌ Shows grey | ✅ Shows neighboring areas |
| **Cost** | Lower | ~2.5x higher (still free tier) |
| **User Experience** | Good for Syria-only users | Better for all users |

## Recommendation Based on Use Case

### Choose **Syria-Only** if:

✅ **90%+ of users are within Syria**
- Users rarely near borders
- Minimal need to see neighboring cities
- User base concentrated in central Syria

✅ **File size/cost is a major concern**
- Limited R2 storage budget
- Optimizing for lowest possible bandwidth
- Want fastest possible generation/updates

✅ **You plan to add other regional files later**
- Separate files for each country
- Let users choose their region
- Download only what they need

### Choose **Multi-Country** (Current) if:

✅ **Users are spread across the region**
- Syrian users near Lebanon/Jordan borders
- Users who travel between countries
- Expats in neighboring countries

✅ **Better UX is more important than file size**
- Want seamless experience near borders
- Don't want users to see grey areas
- File size isn't a concern (1 GB is still small)

✅ **You want simplicity**
- One file for all users
- No need to manage multiple regional files
- Easier maintenance and updates

### My Recommendation

**Keep multi-country** but implement map bounds (which you just did!). Here's why:

1. **File size isn't an issue in practice:**
   - Users only download tiles they view (~50-100 KB per session)
   - Total file size doesn't matter due to range requests
   - Free tier covers ~100,000 map views/month

2. **Better UX:**
   - No grey areas near borders
   - Damascus users can see Lebanese border cities
   - Aleppo users can see Turkish border areas (if extended)

3. **Simpler to maintain:**
   - One file, one update process
   - No edge cases for border users
   - No need to detect user location for file selection

4. **Map bounds solve the grey problem:**
   - Users can't scroll into truly empty areas
   - Bounds match your PMTiles coverage
   - Professional feel

## How to Generate Syria-Only PMTiles

If you want to try Syria-only, here's how:

### Step 1: Generate with Planetiler

```bash
# Generate Syria-only PMTiles
java -Xmx8g -jar planetiler.jar \
  --download \
  --area=syria \
  --languages=ar,en \
  --output=syria-only-arabic.pmtiles
```

**Processing time:** 5-10 minutes
**Expected size:** 200-400 MB

### Step 2: Upload to R2

```bash
# Upload Syria-only file
wrangler r2 object put images/maps/syria-only-arabic.pmtiles \
  --file=syria-only-arabic.pmtiles

# Verify
wrangler r2 object head images/maps/syria-only-arabic.pmtiles
```

### Step 3: Update Map Bounds

Change bounds in all map files to Syria-only:

```javascript
// Syria-only bounds
var bounds = L.latLngBounds(
  [32.3, 35.5],  // SW: Southern Syria
  [37.3, 42.4]   // NE: Northern Syria
);
```

### Step 4: Update PMTiles URL

In all map HTML files, change the URL:

```javascript
// OLD
url: 'https://images.souqjari.com/maps/middle-east-arabic.pmtiles'

// NEW
url: 'https://images.souqjari.com/maps/syria-only-arabic.pmtiles'
```

### Step 5: Test

Test with users near borders (Daraa, Quneitra, Deir ez-Zor) to ensure acceptable experience.

## Map Bounds Explained

### What You Just Implemented (Multi-Country Bounds)

```javascript
var bounds = L.latLngBounds(
  [29.0, 34.5],  // SW: Southern Jordan (Aqaba area)
  [37.5, 43.0]   // NE: Northern Syria (Qamishli area)
);

map = L.map('map', {
  maxBounds: bounds,
  maxBoundsViscosity: 1.0  // Hard boundary (0.0 = soft, 1.0 = hard)
});
```

**How it works:**
- Users **cannot pan** outside the defined rectangle
- Map "bounces back" if they try to drag beyond bounds
- Prevents seeing grey tiles outside coverage area
- `maxBoundsViscosity: 1.0` creates a hard wall (cannot scroll past at all)

**Coordinates explained:**
```
[37.5, 43.0]  ───────────────  NE Corner
     │                              │
     │        Your Coverage         │
     │           Area               │
     │                              │
[29.0, 34.5]  ───────────────  SW Corner
     │                              │
   Lat                            Lng
```

### Alternative: Syria-Only Bounds

If you switch to Syria-only PMTiles, use these bounds:

```javascript
// Syria-only coverage
var bounds = L.latLngBounds(
  [32.3, 35.5],  // SW: Daraa/Quneitra area
  [37.3, 42.4]   // NE: Hasaka/Qamishli area
);
```

### Visualize Your Bounds

Use this tool to see your coverage area:
**http://boundingbox.klokantech.com/**

1. Draw a rectangle on the map
2. Select "CSV" format
3. Coordinates are: `minLon,minLat,maxLon,maxLat`
4. Convert to Leaflet format: `[[minLat, minLon], [maxLat, maxLon]]`

## Cost Analysis

### Syria-Only

**Storage:**
- File size: ~300 MB
- R2 storage: Free (within 10 GB tier)

**Bandwidth:**
- Per view: ~30-50 KB
- 10 GB free = ~200,000 views/month
- Cost if exceeding: $0.01/GB

**Total: $0/month** for typical usage

### Multi-Country (Current)

**Storage:**
- File size: ~1 GB
- R2 storage: Free (within 10 GB tier)

**Bandwidth:**
- Per view: ~50-100 KB
- 10 GB free = ~100,000 views/month
- Cost if exceeding: $0.01/GB

**Total: $0/month** for typical usage

**Difference:** ~$0.02-0.05/month beyond free tier (negligible)

## File Size Breakdown

### What Makes PMTiles Large?

| Layer | Size Contribution | Notes |
|-------|-------------------|-------|
| Roads | 40-50% | Most detailed, many features |
| Buildings | 20-30% | Only at high zoom levels |
| Labels | 10-15% | Place names, multilingual |
| Boundaries | 5-10% | Admin borders |
| Landuse | 5-10% | Parks, forests, etc. |
| Water | 3-5% | Rivers, lakes |

**Syria-only vs Multi-country:**
- Syria is ~40% of the total coverage area
- File size doesn't scale linearly (shared water, admin boundaries)
- Syria-only = ~30-40% of multi-country size

## Performance Comparison

### Generation Time

**Syria-only:**
- Download OSM data: ~1 minute (~500 MB)
- Process: 4-9 minutes
- **Total: 5-10 minutes**

**Multi-country:**
- Download OSM data: ~3 minutes (~2.5 GB)
- Process: 27-57 minutes
- **Total: 30-60 minutes**

### App Loading Time

**Both options:** Effectively the same!
- PMTiles uses range requests
- Only downloads visible tiles
- Initial load: 200-500ms regardless of total file size
- User never downloads the full file

**Conclusion:** File size doesn't affect loading speed in the app.

## Migration Path

If you want to test Syria-only without disrupting current users:

### Option 1: A/B Test

```javascript
// Serve different files based on user location
const pmtilesUrl = userIsInCentralSyria
  ? 'https://images.souqjari.com/maps/syria-only-arabic.pmtiles'
  : 'https://images.souqjari.com/maps/middle-east-arabic.pmtiles';
```

### Option 2: Gradual Rollout

1. Generate Syria-only PMTiles
2. Upload as separate file
3. Test with small % of users
4. Monitor feedback (especially border area users)
5. Decide based on results

### Option 3: Hybrid Approach

Keep both files, dynamically choose:
- **Syria-only** for users in Damascus, Homs, Hama, Aleppo
- **Multi-country** for users near borders (Daraa, Quneitra, Deir ez-Zor, Hasakah)

## Real-World Impact

### Scenario 1: User in Damascus

**Syria-only:**
- ✅ Perfect experience
- ✅ Can see all of Damascus
- ✅ Can see Homs, Hama
- ❌ Cannot see Beirut (if scrolling west)

**Multi-country:**
- ✅ Perfect experience
- ✅ Can see all of Damascus
- ✅ Can see Homs, Hama
- ✅ Can see Beirut (smooth experience)

**Winner:** Tie, but multi-country is safer

---

### Scenario 2: User in Daraa (near Jordan border)

**Syria-only:**
- ⚠️ Can see Daraa city
- ❌ Cannot see Jordanian side (Ramtha, Irbid)
- ❌ Grey tiles when scrolling south
- ❌ Bad experience for border trade/travel

**Multi-country:**
- ✅ Can see Daraa city
- ✅ Can see Ramtha, Irbid in Jordan
- ✅ Smooth experience near border
- ✅ Good for border trade/travel

**Winner:** Multi-country (significantly better)

---

### Scenario 3: Syrian expat in Beirut

**Syria-only:**
- ❌ Cannot see Beirut at all
- ❌ Cannot see Damascus either (out of bounds)
- ❌ Unusable

**Multi-country:**
- ✅ Can see Beirut
- ✅ Can see Damascus
- ✅ Fully usable

**Winner:** Multi-country (Syria-only fails completely)

## Summary & Recommendation

### If your user base is:

**>95% in central Syria (Damascus, Aleppo, Homs, Hama)**
→ Consider Syria-only
- Saves ~600 MB
- Faster generation
- Minimal UX impact

**Mixed across region or near borders**
→ **Stick with multi-country** (recommended)
- Better UX for all users
- No edge cases
- Minimal cost difference
- Simpler maintenance

### What You Just Implemented

✅ **Map bounds** for multi-country coverage
- Prevents scrolling into truly empty areas (Iraq, Turkey, etc.)
- Keeps users within your PMTiles coverage
- Professional, polished feel

**Next steps:**
1. Test the bounds in your app
2. Verify users can't scroll outside Lebanon/Syria/Jordan region
3. If you want to try Syria-only, follow the generation guide above
4. A/B test with small user group before fully switching

### Final Recommendation

**Keep multi-country with bounds** (what you have now). The extra 600 MB file size:
- Doesn't affect loading speed (range requests)
- Costs $0 in practice (free tier covers it)
- Provides significantly better UX for border areas
- Is simpler to maintain

Only switch to Syria-only if >95% of users are in central Syria AND you need to minimize costs.

---

## Quick Commands Reference

### Generate Syria-Only

```bash
java -Xmx8g -jar planetiler.jar --download --area=syria --languages=ar,en --output=syria-only-arabic.pmtiles
```

### Syria-Only Bounds

```javascript
var bounds = L.latLngBounds([32.3, 35.5], [37.3, 42.4]);
```

### Multi-Country Bounds (Current)

```javascript
var bounds = L.latLngBounds([29.0, 34.5], [37.5, 43.0]);
```

### Test Your Bounds

```bash
# Start test server
npx serve .

# Open in browser, try scrolling outside bounds
# Should bounce back to within bounds
```
