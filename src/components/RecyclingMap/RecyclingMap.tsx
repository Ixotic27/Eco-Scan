import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation, Loader2, AlertCircle, Filter, RefreshCw } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface OverpassCenter {
  id: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
}

interface RecyclingLocation {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: string;
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

// Build Overpass API query for recycling/waste facilities near a point
function buildOverpassQuery(lat: number, lon: number, radius: number): string {
  return `
    [out:json][timeout:30];
    (
      node["amenity"="recycling"](around:${radius},${lat},${lon});
      node["amenity"="waste_disposal"](around:${radius},${lat},${lon});
      node["amenity"="waste_transfer_station"](around:${radius},${lat},${lon});
      node["recycling_type"="centre"](around:${radius},${lat},${lon});
      way["amenity"="recycling"](around:${radius},${lat},${lon});
      way["amenity"="waste_disposal"](around:${radius},${lat},${lon});
    );
    out center body;
  `.trim();
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseOverpassResult(element: any, userLat: number, userLon: number): RecyclingLocation {
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  const tags = element.tags ?? {};

  const amenity = tags.amenity ?? 'recycling';
  const name =
    tags.name ||
    tags['name:en'] ||
    (amenity === 'recycling' ? 'Recycling Point' :
     amenity === 'waste_disposal' ? 'Waste Disposal' :
     'Waste Facility');

  const materialKeys = Object.keys(tags).filter(k => k.startsWith('recycling:') && tags[k] === 'yes');
  const materials = materialKeys.map(k => k.replace('recycling:', '').replace(/_/g, ' '));

  return {
    id: String(element.id),
    name,
    lat,
    lon,
    type: amenity,
    amenity,
    address: [tags['addr:street'], tags['addr:city']].filter(Boolean).join(', ') || tags.description || '',
    opening_hours: tags.opening_hours || '',
    phone: tags.phone || tags['contact:phone'] || '',
    materials: materials.length > 0 ? materials : [],
    distance: haversineDistance(userLat, userLon, lat, lon),
  };
}

// Component to fly map to new center
function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 14, { duration: 1.5 });
  }, [center, map]);
  return null;
}

// Custom icons
const userIcon = L.divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;background:#22c55e;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(34,197,94,0.3)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const recyclingIcon = L.divIcon({
  className: '',
  html: `<div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;background:#059669;border:2px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:14px">♻️</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const wastIcon = L.divIcon({
  className: '',
  html: `<div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;background:#dc2626;border:2px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:14px">🗑️</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const RecyclingMap: React.FC = () => {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locations, setLocations] = useState<RecyclingLocation[]>([]);
  const [radius, setRadius] = useState(5000);
  const [isLocating, setIsLocating] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchNearbyLocations = useCallback(async (lat: number, lon: number, rad: number) => {
    setIsFetching(true);
    setFetchError(null);
    try {
      const query = buildOverpassQuery(lat, lon, rad);
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (!response.ok) throw new Error('Overpass API error');
      const data = await response.json();
      const parsed: RecyclingLocation[] = (data.elements ?? [])
        .filter((el: any) => (el.lat || el.center?.lat) && (el.lon || el.center?.lon))
        .map((el: any) => parseOverpassResult(el, lat, lon))
        .sort((a: RecyclingLocation, b: RecyclingLocation) => (a.distance ?? 99) - (b.distance ?? 99));
      setLocations(parsed);
    } catch (err) {
      setFetchError('Failed to fetch recycling centers. Please check your connection.');
      console.error(err);
    } finally {
      setIsFetching(false);
    }
  }, []);

  const getUserLocation = useCallback(() => {
    setIsLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        setIsLocating(false);
        fetchNearbyLocations(coords[0], coords[1], radius);
      },
      (err) => {
        setIsLocating(false);
        setLocationError(
          err.code === 1
            ? 'Location access denied. Please enable location in your browser settings.'
            : 'Could not get your location. Please try again.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [radius, fetchNearbyLocations]);

  // Auto-get location on mount
  useEffect(() => {
    getUserLocation();
  }, []); // eslint-disable-line

  // Refetch when radius changes (if we already have location)
  useEffect(() => {
    if (userLocation) {
      fetchNearbyLocations(userLocation[0], userLocation[1], radius);
    }
  }, [radius]); // eslint-disable-line

  const mapCenter: [number, number] = userLocation ?? [20.5937, 78.9629]; // India fallback

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex flex-wrap items-center gap-3">
        {/* Radius Selector */}
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Radius:</span>
          <div className="flex gap-1">
            {RADIUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                id={`radius-${opt.label.replace(' ', '')}`}
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

        <div className="ml-auto flex items-center gap-2">
          {/* Location status */}
          {isFetching && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Loader2 size={14} className="animate-spin" />
              Loading centers...
            </div>
          )}
          {!isFetching && locations.length > 0 && (
            <span className="text-xs text-green-600 font-medium bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
              {locations.length} centers found
            </span>
          )}
          <button
            id="refresh-location-btn"
            onClick={getUserLocation}
            disabled={isLocating}
            className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
          >
            {isLocating
              ? <Loader2 size={16} className="animate-spin" />
              : <NavigationIcon />
            }
            {isLocating ? 'Locating...' : 'My Location'}
          </button>
        </div>
      </div>

      {/* Error messages */}
      {locationError && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-amber-700 dark:text-amber-400 text-sm">{locationError}</p>
        </div>
      )}
      {fetchError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 dark:text-red-400 text-sm">{fetchError}</p>
          <button onClick={() => userLocation && fetchNearbyLocations(userLocation[0], userLocation[1], radius)} className="ml-auto">
            <RefreshCw size={14} className="text-red-500" />
          </button>
        </div>
      )}

      {/* Map */}
      <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-lg" style={{ height: '420px' }}>
        <MapContainer center={mapCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {userLocation && <MapController center={userLocation} />}
          {/* User location marker */}
          {userLocation && (
            <>
              <Marker position={userLocation} icon={userIcon}>
                <Popup>📍 <strong>You are here</strong></Popup>
              </Marker>
              <Circle
                center={userLocation}
                radius={radius}
                pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.05, weight: 1.5, dashArray: '5 5' }}
              />
            </>
          )}
          {/* Recycling center markers */}
          {locations.map(loc => (
            <Marker
              key={loc.id}
              position={[loc.lat, loc.lon]}
              icon={loc.amenity === 'recycling' ? recyclingIcon : wastIcon}
            >
              <Popup>
                <div className="min-w-[180px] space-y-1">
                  <p className="font-semibold text-sm">{loc.name}</p>
                  {loc.distance !== undefined && (
                    <p className="text-xs text-gray-500">{loc.distance.toFixed(2)} km away</p>
                  )}
                  {loc.address && <p className="text-xs text-gray-600">{loc.address}</p>}
                  {loc.opening_hours && <p className="text-xs text-green-600">🕐 {loc.opening_hours}</p>}
                  {loc.phone && <p className="text-xs text-blue-600">📞 {loc.phone}</p>}
                  {loc.materials && loc.materials.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {loc.materials.slice(0, 4).map(m => (
                        <span key={m} className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded capitalize">{m}</span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-400 capitalize">Type: {loc.amenity.replace(/_/g, ' ')}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Center List */}
      {locations.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Nearby Facilities ({locations.length})
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {locations.map(loc => (
              <div key={loc.id} className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 transition-colors">
                <div className="text-xl flex-shrink-0 mt-0.5">
                  {loc.amenity === 'recycling' ? '♻️' : '🗑️'}
                </div>
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

      {!isFetching && !locationError && locations.length === 0 && userLocation && (
        <div className="text-center py-8 text-gray-500">
          <MapPin size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No recycling centers found within {radius / 1000} km.</p>
          <p className="text-xs mt-1">Try increasing the radius.</p>
        </div>
      )}
    </div>
  );
};

function NavigationIcon() {
  return <Navigation size={16} />;
}

export default RecyclingMap;
