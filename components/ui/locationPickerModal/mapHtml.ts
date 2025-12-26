/**
 * Leaflet map HTML template for the location picker.
 *
 * Key features:
 * - zoomSnap: 0 enables fractional zoom levels for smooth radius adjustment
 * - Fixed circle overlay that represents the search radius
 * - Center marker dot
 * - Communication with React Native via postMessage
 */
export const MAP_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/protomaps-leaflet@4.0.0/dist/protomaps-leaflet.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { margin: 0; padding: 0; overflow: hidden; font-family: 'Noto Sans Arabic', sans-serif; }
    #map { height: 100vh; width: 100vw; }
    .leaflet-control-attribution { display: none !important; }

    .center-marker {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 1000;
      pointer-events: none;
    }
    .center-marker-dot {
      width: 16px;
      height: 16px;
      background: #007AFF;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }

    .radius-circle-overlay {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 70vmin;
      height: 70vmin;
      border: 2px solid #007AFF;
      border-radius: 50%;
      background: rgba(0, 122, 255, 0.12);
      z-index: 999;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="radius-circle-overlay"></div>
  <div class="center-marker">
    <div class="center-marker-dot"></div>
  </div>
  <script>
    var map;
    var isInitialized = false;
    var MIN_ZOOM = 5;
    var MAX_ZOOM = 18; // OSM tiles max zoom
    var moveDebounceTimer = null;
    var sliderActive = false;

    // Debug logging function
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

    // Capture and report errors
    window.addEventListener('error', function(e) {
      debugLog('JavaScript Error', {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno
      });
    });

    function getCircleRadiusPx() {
      var containerSize = Math.min(window.innerWidth, window.innerHeight);
      return containerSize * 0.35;
    }

    function getMetersPerPixel(zoom, lat) {
      return 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, zoom);
    }

    function getRadiusAtZoom(zoom, lat) {
      var metersPerPx = getMetersPerPixel(zoom, lat);
      var radiusMeters = getCircleRadiusPx() * metersPerPx;
      return radiusMeters / 1000;
    }

    function getZoomForRadius(targetRadiusKm, lat) {
      var circleRadiusPx = getCircleRadiusPx();
      var targetRadiusMeters = targetRadiusKm * 1000;
      var cosLat = Math.cos(lat * Math.PI / 180);
      var zoom = Math.log2(circleRadiusPx * 156543.03392 * cosLat / targetRadiusMeters);
      return zoom;
    }

    function calculateMaxZoomFor1km(lat) {
      return getZoomForRadius(1, lat);
    }

    function updateMaxZoom() {
      if (!map) return;
      var center = map.getCenter();
      var maxZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, calculateMaxZoomFor1km(center.lat)));
      map.setMaxZoom(maxZoom);
    }

    function initMap(lat, lng, radiusKm) {
      if (isInitialized) return;
      isInitialized = true;

      debugLog('Initializing map', { lat: lat, lng: lng, radiusKm: radiusKm });

      // Clamp to valid OSM tile range
      var initialMaxZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, calculateMaxZoomFor1km(lat)));

      try {
        map = L.map('map', {
          zoomControl: false,
          attributionControl: false,
          minZoom: MIN_ZOOM,
          maxZoom: initialMaxZoom,
          zoomSnap: 0,
          zoomDelta: 0.5,
          wheelPxPerZoomLevel: 120,
          bounceAtZoomLimits: false
        }).setView([lat, lng], 10);

        debugLog('Leaflet map created successfully');

        // Add Arabic map layer from Cloudflare R2 (protomaps-leaflet handles PMTiles internally)
        var pmtilesUrl = 'https://images.souqjari.com/maps/middle-east-arabic.pmtiles';
        debugLog('Adding protomaps layer', { url: pmtilesUrl });

        var layer = protomapsL.leafletLayer({
          url: pmtilesUrl,
          lang: 'ar',
          theme: 'light',
          maxZoom: 18,
          minZoom: MIN_ZOOM
        });
        layer.addTo(map);

        debugLog('Protomaps layer added to map');

        // Add tile loading event listeners
        map.on('tileload', function() {
          debugLog('Tile loaded successfully');
        });

        map.on('tileerror', function(e) {
          debugLog('Tile load error', { error: e });
        });

      } catch (error) {
        debugLog('Error in initMap', {
          message: error.message,
          stack: error.stack
        });
      }

      var initialZoom = getZoomForRadius(radiusKm, lat);
      initialZoom = Math.max(MIN_ZOOM, Math.min(initialMaxZoom, initialZoom));
      map.setZoom(initialZoom, { animate: false });

      map.on('moveend', function() {
        updateMaxZoom();

        if (moveDebounceTimer) clearTimeout(moveDebounceTimer);
        moveDebounceTimer = setTimeout(function() {
          var center = map.getCenter();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'mapMoved',
            lat: center.lat,
            lng: center.lng
          }));
        }, 300);
      });

      map.on('zoomend', function() {
        if (sliderActive) return;
        sendRadiusUpdate();
      });

      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
    }

    function getVisibleRadiusKm() {
      if (!map) return 25;

      var center = map.getCenter();
      var zoom = map.getZoom();
      var radiusKm = getRadiusAtZoom(zoom, center.lat);

      return Math.max(1, Math.min(200, radiusKm));
    }

    function sendRadiusUpdate() {
      if (sliderActive) return;
      var radiusKm = getVisibleRadiusKm();
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'radiusChanged',
        radius: radiusKm
      }));
    }

    function setZoomForRadius(targetRadiusKm) {
      if (!map) return;

      var center = map.getCenter();
      var maxZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, calculateMaxZoomFor1km(center.lat)));
      var targetZoom = getZoomForRadius(targetRadiusKm, center.lat);

      targetZoom = Math.max(MIN_ZOOM, Math.min(maxZoom, targetZoom));

      map.setZoom(targetZoom, { animate: false });
    }

    function onSliderStart() {
      sliderActive = true;
    }

    function onSliderChange(radiusKm) {
      setZoomForRadius(radiusKm);
    }

    function onSliderEnd(radiusKm) {
      setZoomForRadius(radiusKm);

      setTimeout(function() {
        sliderActive = false;
      }, 300);
    }

    function moveToLocation(lat, lng) {
      if (!map) return;
      var maxZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, calculateMaxZoomFor1km(lat)));
      map.setMaxZoom(maxZoom);

      var currentZoom = map.getZoom();
      if (currentZoom > maxZoom) {
        map.setView([lat, lng], maxZoom, { animate: true, duration: 0.3 });
      } else {
        map.setView([lat, lng], currentZoom, { animate: true, duration: 0.3 });
      }
    }

    function getCenter() {
      if (!map) return;
      var center = map.getCenter();
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'centerResponse',
        lat: center.lat,
        lng: center.lng
      }));
    }
  </script>
</body>
</html>
`;
