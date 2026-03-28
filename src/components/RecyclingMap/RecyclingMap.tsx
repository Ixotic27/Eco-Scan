import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation, Loader2, AlertCircle, Filter, RefreshCw, X, Map as MapIcon, Phone, Clock, ExternalLink } from 'lucide-react';
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

// Determine stock image based on amenity type
const getFacilityImage = (amenity: string) => {
  if (amenity === 'recycling') {
    return 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80&w=600';
  }
  return 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&q=80&w=600';
};

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
  const [selectedFacility, setSelectedFacility] = useState<RecyclingLocation | null>(null);

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

    const cached = getCachedLocation();
    if (cached) {
      setUserLocation(cached);
      setLocationSource('gps');
      setIsLocating(false);
      fetchCenters(cached[0], cached[1], radius);
      return;
    }

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
          try {
            const coords = await getLocationFromIP();
            cacheLocation(coords[0], coords[1]);
            setUserLocation(coords);
            setLocationSource('ip');
            fetchCenters(coords[0], coords[1], radius);
          } catch {
            setLocationError('Unable to determine your location. Please try again.');
          } finally {
            setIsLocating(false);
          }
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
      );
    } else {
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

  useEffect(() => { resolveLocation(); }, []); // eslint-disable-line

  useEffect(() => {
    if (userLocation) fetchCenters(userLocation[0], userLocation[1], radius);
  }, [radius]); // eslint-disable-line

  const handleRefresh = () => {
    try { sessionStorage.removeItem(LOCATION_CACHE_KEY); } catch {}
    resolveLocation();
  };

  const mapCenter: [number, number] = userLocation ?? [20.5937, 78.9629];

  return (
    <div className="space-y-4 relative">
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
              📡 IP Check
            </span>
          )}
          {locationSource === 'gps' && (
            <span className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
              📍 GPS
            </span>
          )}
          {!isFetching && hasFetchedOnce && (
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${locations.length > 0 ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-gray-500 bg-gray-100 dark:bg-gray-700'}`}>
              {locations.length > 0 ? `${locations.length} found` : 'No centers'}
            </span>
          )}
          {isFetching && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Loader2 size={13} className="animate-spin" /> Searching...
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={isLocating || isFetching}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-green-100 hover:text-green-700 transition-all disabled:opacity-50"
          >
            {isLocating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={resolveLocation}
            disabled={isLocating}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-green-600 transition-colors disabled:opacity-50"
          >
            <Navigation size={15} />
            <span className="hidden sm:inline">My Location</span>
          </button>
        </div>
      </div>

      {locationError && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-amber-700 dark:text-amber-400 text-sm flex-1">{locationError}</p>
        </div>
      )}

      {/* Map Container */}
      <div className="w-full rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-lg relative" style={{ height: '520px' }}>
        <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {userLocation && <MapFlyTo center={userLocation} />}

          {userLocation && (
            <>
              <Marker position={userLocation} icon={userIcon} />
              <Circle
                center={userLocation}
                radius={radius}
                pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.05, weight: 2, dashArray: '6 4' }}
              />
            </>
          )}

          {locations.map(loc => (
            <Marker 
              key={loc.id} 
              position={[loc.lat, loc.lon]} 
              icon={loc.amenity === 'recycling' ? recyclingIcon : wasteIcon}
              eventHandlers={{ click: () => setSelectedFacility(loc) }}
            />
          ))}
        </MapContainer>

        {/* Floating Detail Card Modal */}
        {selectedFacility && (
          <div className="absolute inset-0 z-[1000] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedFacility(null)}>
            <div 
              className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200"
              onClick={e => e.stopPropagation()}
            >
              <div className="relative h-48 w-full">
                <img src={getFacilityImage(selectedFacility.amenity)} alt={selectedFacility.name} className="w-full h-full object-cover" />
                <button 
                  onClick={() => setSelectedFacility(null)}
                  className="absolute top-3 right-3 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors backdrop-blur-md"
                >
                  <X size={20} />
                </button>
                <div className="absolute top-3 left-3 px-3 py-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-full text-xs font-bold text-green-700 dark:text-green-400 capitalize flex items-center gap-1 shadow-sm">
                  {selectedFacility.amenity === 'recycling' ? '♻️ Recycling Center' : '🗑️ Waste Disposal'}
                </div>
              </div>

              <div className="p-5">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 leading-tight">{selectedFacility.name}</h3>
                {selectedFacility.distance !== undefined && (
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400 mb-4">{selectedFacility.distance.toFixed(1)} km away from you</p>
                )}

                <div className="space-y-3 mb-5">
                  {selectedFacility.address && (
                    <div className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300">
                      <MapIcon size={16} className="text-gray-400 mt-0.5" />
                      <span>{selectedFacility.address}</span>
                    </div>
                  )}
                  {selectedFacility.opening_hours && (
                    <div className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-300">
                      <Clock size={16} className="text-gray-400" />
                      <span>{selectedFacility.opening_hours}</span>
                    </div>
                  )}
                  {selectedFacility.phone && (
                    <div className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-300">
                      <Phone size={16} className="text-gray-400" />
                      <a href={`tel:${selectedFacility.phone}`} className="text-blue-600 dark:text-blue-400 hover:underline">{selectedFacility.phone}</a>
                    </div>
                  )}
                </div>

                {selectedFacility.materials && selectedFacility.materials.length > 0 && (
                  <div className="mb-5">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Accepted Materials</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedFacility.materials.map(m => (
                        <span key={m} className="px-2.5 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-xs font-medium capitalize border border-green-100 dark:border-green-800">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button 
                  onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedFacility.lat},${selectedFacility.lon}`)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                >
                  <ExternalLink size={18} />
                  Get Directions
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {hasFetchedOnce && !isFetching && locations.length === 0 && userLocation && (
        <div className="text-center py-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <MapPin size={32} className="mx-auto mb-2 text-gray-300" />
          <p className="font-semibold text-gray-600 dark:text-gray-400">No recycling centers found within {radius / 1000} km of your location</p>
          <button
            onClick={() => setRadius(r => r === 10000 ? 10000 : r === 5000 ? 10000 : 5000)}
            className="mt-3 text-sm text-green-600 font-medium hover:underline"
          >
            Expand to {radius === 2000 ? '5 km' : '10 km'} →
          </button>
        </div>
      )}

      {locations.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nearby Facilities ({locations.length})</h3>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {locations.map(loc => (
              <div 
                key={loc.id} 
                className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-green-400 transition-colors cursor-pointer group"
                onClick={() => setSelectedFacility(loc)}
              >
                <div className="text-xl flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform">{loc.amenity === 'recycling' ? '♻️' : '🗑️'}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 dark:text-white text-sm truncate">{loc.name}</p>
                  {loc.address && <p className="text-xs text-gray-500 truncate">{loc.address}</p>}
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
