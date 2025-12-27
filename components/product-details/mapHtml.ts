/**
 * Leaflet map HTML template for the product details location selector.
 *
 * Key features:
 * - Point selector (single marker) for selecting a specific coordinate
 * - No radius overlay (unlike the location picker modal)
 * - Communication with React Native via postMessage
 * - Click-to-select location functionality
 */
export const MAP_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/protomaps-leaflet@latest/dist/protomaps-leaflet.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { margin: 0; padding: 0; overflow: hidden; font-family: 'Noto Sans Arabic', sans-serif; }
    #map { height: 100vh; width: 100vw; }
    .leaflet-control-attribution { display: none !important; }
    .custom-marker {
      background: #007AFF;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map, marker;
    var isInitialized = false;
    var MAX_ZOOM = 16;
    var MIN_ZOOM = 5;

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

    function initMap(lat, lng) {
      if (isInitialized) return;
      isInitialized = true;

      debugLog('Initializing map', { lat: lat, lng: lng });

      try {
        // No bounds restrictions - dual layer approach eliminates grey areas
        map = L.map('map', {
          zoomControl: false,
          attributionControl: false,
          minZoom: MIN_ZOOM,
          maxZoom: MAX_ZOOM,
          bounceAtZoomLimits: false
          // maxBounds REMOVED - no longer needed with dual layer system
        }).setView([lat, lng], 12);

        debugLog('Leaflet map created successfully');

        // LAYER 1: World base layer (low detail, renders everywhere)
        var worldBaseUrl = 'https://images.souqjari.com/maps/world-base.pmtiles';
        debugLog('Adding world base layer', { url: worldBaseUrl });

        var worldBaseLayer = protomapsL.leafletLayer({
          url: worldBaseUrl,
          flavor: 'light',
          maxZoom: 8,
          minZoom: 0
        });
        worldBaseLayer.addTo(map);

        debugLog('World base layer added');

        // LAYER 2: Syria detail layer (high detail, Arabic labels)
        var syriaDetailUrl = 'https://images.souqjari.com/maps/middle-east-arabic.pmtiles';
        debugLog('Adding Syria detail layer', { url: syriaDetailUrl });

        var syriaDetailLayer = protomapsL.leafletLayer({
          url: syriaDetailUrl,
          lang: 'ar',
          flavor: 'light',
          maxZoom: MAX_ZOOM,
          minZoom: MIN_ZOOM
        });
        syriaDetailLayer.addTo(map);

        debugLog('Syria detail layer added');

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

      var markerIcon = L.divIcon({
        className: 'custom-marker',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      marker = L.marker([lat, lng], { icon: markerIcon }).addTo(map);

      // Hard zoom lock - prevent any zoom beyond limits
      map.on('zoom', function() {
        if (map.getZoom() > MAX_ZOOM) {
          map.setZoom(MAX_ZOOM);
        }
        if (map.getZoom() < MIN_ZOOM) {
          map.setZoom(MIN_ZOOM);
        }
      });

      map.on('click', function(e) {
        var lat = e.latlng.lat;
        var lng = e.latlng.lng;

        marker.setLatLng([lat, lng]);

        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'locationTapped',
          lat: lat,
          lng: lng
        }));
      });

      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
    }

    function moveToLocation(lat, lng, zoom) {
      if (!map) return;
      marker.setLatLng([lat, lng]);
      map.setView([lat, lng], Math.min(zoom || 12, MAX_ZOOM), { animate: true, duration: 0.3 });
    }
  </script>
</body>
</html>
`;
