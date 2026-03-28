import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation, Loader2, AlertCircle, Filter, RefreshCw } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface RecyclingLocation {
  id: string;
  name: string;
  lat: number;
  lon: number;
  amenity: string;
  address?: string;
  opening_hours?: string;
  phone?: string;
  materials?: string[];
  distance?: number;
}

const RADIUS_OPTIONS = [
  { label: '2 km', value: 2000 },
  { label: '5 km', value: 5000 },
  { label: '10 km', value: 10000 },
];

const LOCATION_CACHE_KEY = 'ecoscan_user_location';

function buildOverpassQuery(lat: number, lon: number, radius: number): string {
  return `[out:json][timeout:30];(node["amenity"="recycling"](around:${radius},${lat},${lon});node["amenity"="waste_disposal"](around:${radius},${lat},${lon});node["amenity"="waste_transfer_station"](around:${radius},${lat},${lon});node["recycling_type"="centre"](around:${radius},${lat},${lon});way["amenity"="recycling"](around:${radius},${lat},${lon});way["amenity"="waste_disposal"](around:${radius},${lat},${lon}););out center body;`;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseElement(el: any, uLat: number, uLon: number): RecyclingLocation | null {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (!lat || !lon) return null;
  const tags = el.tags ?? {};
  const amenity = tags.amenity ?? 'recycling';
  const name = tags.name || tags['name:en'] || (amenity === 'recycling' ? 'Recycling Point' : amenity === 'waste_disposal' ? 'Waste Disposal' : 'Waste Facility');
  const materialKeys = Object.keys(tags).filter(k => k.startsWith('recycling:') && tags[k] === 'yes');
  return {
    id: String(el.id),
    name,
    lat,
    lon,
    amenity,
    address: [tags['addr:street'], tags['addr:city']].filter(Boolean).join(', ') || '',
    opening_hours: tags.opening_hours || '',
    phone: tags.phone || tags['contact:phone'] || '',
    materials: materialKeys.map(k => k.replace('recycling:', '').replace(/_/g, ' ')),
    distance: haversineDistance(uLat, uLon, lat, lon),
  };
}

async function getLocationFromIP(): Promise<[number, number]> {
  const r = await fetch('https://ipapi.co/json/');
  const d = await r.json();
  if (d.latitude && d.longitude) return [parseFloat(d.latitude), parseFloat(d.longitude)];
  throw new Error('IP fallback failed');
}

function getCachedLocation(): [number, number] | null {
  try {
    const raw = sessionStorage.getItem(LOCATION_CACHE_KEY);
    if (raw) {
      const { lat, lon, ts } = JSON.parse(raw);
      // Cache valid for 10 minutes
      if (Date.now() - ts < 10 * 60 * 1000) return [lat, lon];
    }
  } catch {}
  return null;
}

function cacheLocation(lat: number, lon: number) {
  try {
    sessionStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify({ lat, lon, ts: Date.now() }));
  } catch {}
}

function MapFlyTo({ center }: { center: [number, number] }) {
  const map = useMap();
  const prev = useRef<string>('');
  useEffect(() => {
    const key = center.join(',');
    if (key !== prev.current) {
      map.flyTo(center, 14, { duration: 1.2 });
      prev.current = key;
    }
  }, [center, map]);
  return null;
}

const userIcon = L.divIcon({
  className: '',
  html: `<div style="width:18px;height:18px;background:#22c55e;border:3px solid white;border-radius:50%;box-shadow:0 0 0 6px rgba(34,197,94,0.2)"></div>`,
  iconSize: [18, 18], iconAnchor: [9, 9],
});
const recyclingIcon = L.divIcon({
  className: '',
  html: `<div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;background:#059669;border:2.5px solid white;border-radius:50%;box-shadow:0 2px 10px rgba(0,0,0,0.3);font-size:16px">♻️</div>`,
  iconSize: [34, 34], iconAnchor: [17, 17],
});
const wasteIcon = L.divIcon({
  className: '',
  html: `<div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;background:#dc2626;border:2.5px solid white;border-radius:50%;box-shadow:0 2px 10px rgba(0,0,0,0.3);font-size:16px">🗑️</div>`,
  iconSize: [34, 34], iconAnchor: [17, 17],
});

const RecyclingMap: React.FC = () => {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationSource, setLocationSource] = useState<'gps' | 'ip' | null>(null);
  const [locations, setLocations] = useState<RecyclingLocation[]>([]);
  const [radius, setRadius] = useState(5000);
  const [isLocating, setIsLocating] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);

  const fetchCenters = useCallback(async (lat: number, lon: number, rad: number) => {
    setIsFetching(true);
    setFetchError(null);
    try {
      const resp = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `data=${encodeURIComponent(buildOverpassQuery(lat, lon, rad))}`,
      });
      if (!resp.ok) throw new Error('Overpass error');
      const data = await resp.json();
      const parsed = (data.elements ?? [])
        .map((el: any) => parseElement(el, lat, lon))
        .filter(Boolean)
        .sort((a: RecyclingLocation, b: RecyclingLocation) => (a.distance ?? 99) - (b.distance ?? 99));
      setLocations(parsed);
      setHasFetchedOnce(true);
    } catch {
      setFetchError('Could not load recycling centers. Check your connection.');
    } finally {
      setIsFetching(false);
    }
  }, []);

  const resolveLocation = useCallback(async () => {
    setIsLocating(true);
    setLocationError(null);

    // 1. Try sessionStorage cache first (avoids re-asking permission)
    const cached = getCachedLocation();
    if (cached) {
      setUserLocation(cached);
      setLocationSource('gps');
      setIsLocating(false);
      fetchCenters(cached[0], cached[1], radius);
      return;
    }

    // 2. Try browser GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          cacheLocation(coords[0], coords[1]);
          setUserLocation(coords);
          setLocationSource('gps');
          setIsLocating(false);
          fetchCenters(coords[0], coords[1], radius);
        },
        async () => {
          // 3. GPS denied/failed — fall back to IP silently
          try {
            const coords = await getLocationFromIP();
            cacheLocation(coords[0], coords[1]);
            setUserLocation(coords);
            setLocationSource('ip');
            fetchCenters(coords[0], coords[1], radius);
          } catch {
            setLocationError('Unable to determine your location. Please click "My Location" to try again.');
          } finally {
            setIsLocating(false);
          }
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
      );
    } else {
      // 3. No GPS API at all
      try {
        const coords = await getLocationFromIP();
        cacheLocation(coords[0], coords[1]);
        setUserLocation(coords);
        setLocationSource('ip');
        fetchCenters(coords[0], coords[1], radius);
      } catch {
        setLocationError('Geolocation is not supported by your browser.');
      } finally {
        setIsLocating(false);
      }
    }
  }, [radius, fetchCenters]);

  // Run once on mount
  useEffect(() => { resolveLocation(); }, []); // eslint-disable-line

  // Refetch when radius changes (only if we have location)
  useEffect(() => {
    if (userLocation) fetchCenters(userLocation[0], userLocation[1], radius);
  }, [radius]); // eslint-disable-line

  const handleRefresh = () => {
    // Clear cache so location is re-fetched
    try { sessionStorage.removeItem(LOCATION_CACHE_KEY); } catch {}
    resolveLocation();
  };

  const mapCenter: [number, number] = userLocation ?? [20.5937, 78.9629];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={16} className="text-gray-500 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Radius:</span>
          <div className="flex gap-1">
            {RADIUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setRadius(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  radius === opt.value
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {locationSource === 'ip' && (
            <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full">
              📡 Approximate (IP)
            </span>
          )}
          {locationSource === 'gps' && (
            <span className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
              📍 GPS
            </span>
          )}
          {!isFetching && hasFetchedOnce && (
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${locations.length > 0 ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-gray-500 bg-gray-100 dark:bg-gray-700'}`}>
              {locations.length > 0 ? `${locations.length} centers found` : 'No centers in range'}
            </span>
          )}
          {isFetching && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Loader2 size={13} className="animate-spin" /> Searching...
            </span>
          )}
          {/* Refresh button */}
          <button
            id="refresh-centers-btn"
            onClick={handleRefresh}
            disabled={isLocating || isFetching}
            title="Refresh location & centers"
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-700 dark:hover:text-green-400 transition-all disabled:opacity-50"
          >
            {isLocating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            <span className="hidden sm:inline">{isLocating ? 'Locating...' : 'Refresh'}</span>
          </button>
          <button
            id="my-location-btn"
            onClick={resolveLocation}
            disabled={isLocating}
            className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-green-600 transition-colors disabled:opacity-50"
          >
            <Navigation size={15} />
            <span className="hidden sm:inline">My Location</span>
          </button>
        </div>
      </div>

      {/* Error */}
      {locationError && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-amber-700 dark:text-amber-400 text-sm flex-1">{locationError}</p>
        </div>
      )}
      {fetchError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <AlertCircle size={16} className="text-red-500" />
          <p className="text-red-700 dark:text-red-400 text-sm flex-1">{fetchError}</p>
          <button onClick={() => userLocation && fetchCenters(userLocation[0], userLocation[1], radius)}>
            <RefreshCw size={14} className="text-red-500" />
          </button>
        </div>
      )}

      {/* Map */}
      <div className="w-full rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-lg" style={{ height: '520px' }}>
        <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {userLocation && <MapFlyTo center={userLocation} />}

          {/* Always show user location marker */}
          {userLocation && (
            <>
              <Marker position={userLocation} icon={userIcon}>
                <Popup>
                  <div>
                    <strong>📍 You are here</strong>
                    <br />
                    <span style={{ fontSize: 11, color: '#6b7280' }}>
                      {userLocation[0].toFixed(4)}, {userLocation[1].toFixed(4)}
                    </span>
                    {locationSource === 'ip' && (
                      <><br /><span style={{ fontSize: 11, color: '#d97706' }}>Approximate location (IP-based)</span></>
                    )}
                  </div>
                </Popup>
              </Marker>
              <Circle
                center={userLocation}
                radius={radius}
                pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.05, weight: 2, dashArray: '6 4' }}
              />
            </>
          )}

          {/* Center markers */}
          {locations.map(loc => (
            <Marker key={loc.id} position={[loc.lat, loc.lon]} icon={loc.amenity === 'recycling' ? recyclingIcon : wasteIcon}>
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <p style={{ fontWeight: 700, marginBottom: 4 }}>{loc.name}</p>
                  {loc.distance !== undefined && <p style={{ fontSize: 12, color: '#6b7280' }}>{loc.distance.toFixed(2)} km away</p>}
                  {loc.address && <p style={{ fontSize: 12, color: '#6b7280' }}>{loc.address}</p>}
                  {loc.opening_hours && <p style={{ fontSize: 12, color: '#16a34a' }}>🕐 {loc.opening_hours}</p>}
                  {loc.phone && <p style={{ fontSize: 12, color: '#2563eb' }}>📞 {loc.phone}</p>}
                  {loc.materials && loc.materials.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                      {loc.materials.slice(0, 5).map(m => (
                        <span key={m} style={{ fontSize: 10, background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: 99, textTransform: 'capitalize' }}>{m}</span>
                      ))}
                    </div>
                  )}
                  <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 4, textTransform: 'capitalize' }}>{loc.amenity.replace(/_/g, ' ')}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* No centers message — shown after location is found */}
      {hasFetchedOnce && !isFetching && locations.length === 0 && userLocation && (
        <div className="text-center py-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <MapPin size={32} className="mx-auto mb-2 text-gray-300" />
          <p className="font-semibold text-gray-600 dark:text-gray-400">No recycling centers found within {radius / 1000} km of your location</p>
          <p className="text-xs text-gray-400 mt-1">Try increasing the radius or check in a nearby city area.</p>
          <button
            onClick={() => setRadius(r => r === 10000 ? 10000 : r === 5000 ? 10000 : 5000)}
            className="mt-3 text-sm text-green-600 font-medium hover:underline"
          >
            Expand to {radius === 2000 ? '5 km' : '10 km'} →
          </button>
        </div>
      )}

      {/* Center list */}
      {locations.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nearby Facilities ({locations.length})</h3>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {locations.map(loc => (
              <div key={loc.id} className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 transition-colors">
                <div className="text-xl flex-shrink-0 mt-0.5">{loc.amenity === 'recycling' ? '♻️' : '🗑️'}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 dark:text-white text-sm truncate">{loc.name}</p>
                  {loc.address && <p className="text-xs text-gray-500 truncate">{loc.address}</p>}
                  {loc.opening_hours && <p className="text-xs text-green-600">{loc.opening_hours}</p>}
                </div>
                {loc.distance !== undefined && (
                  <span className="text-xs font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full flex-shrink-0">
                    {loc.distance.toFixed(1)} km
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecyclingMap;
