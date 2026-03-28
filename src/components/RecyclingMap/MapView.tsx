import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Clock, Info, Phone, AlertCircle, Search, Loader2, WifiOff } from 'lucide-react';
import { RecyclingCenter } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;

const recyclingIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const dumpingIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface SearchResult {
  lat: string;
  lon: string;
  display_name: string;
}

const LocationMarker: React.FC<{ position: [number, number] }> = ({ position }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(position, 13);
  }, [position, map]);
  
  return (
    <>
      <Marker 
        position={position}
        icon={L.divIcon({
          className: 'bg-blue-500 rounded-full w-4 h-4 border-2 border-white shadow-lg',
          iconSize: [16, 16]
        })}
      >
        <Popup>You are here</Popup>
      </Marker>
      <Circle 
        center={position}
        radius={10000}
        pathOptions={{ 
          color: '#3B82F6',
          fillColor: '#3B82F6',
          fillOpacity: 0.1,
          weight: 1
        }}
      />
    </>
  );
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

const MapView: React.FC = () => {
  const { recyclingCenters } = useAppContext();
  const [selectedCenter, setSelectedCenter] = useState<RecyclingCenter | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number]>([20.5937, 78.9629]);
  const [locationError, setLocationError] = useState<string>('');
  const [nearbyCenters, setNearbyCenters] = useState<RecyclingCenter[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 second

  const updateCentersForLocation = (location: [number, number]) => {
    const nearby = recyclingCenters.filter(center => {
      const distance = calculateDistance(
        location[0], location[1],
        center.latitude, center.longitude
      );
      return distance <= 10;
    });
    setUserLocation(location);
    setNearbyCenters(nearby);
  };

  const searchLocation = async (retryAttempt = 0): Promise<SearchResult[]> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&countrycodes=in`,
        {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'RecyclingMapApp/1.0' // Nominatim requires a User-Agent
          }
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format');
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.');
        }
        
        if (retryAttempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryAttempt + 1)));
          return searchLocation(retryAttempt + 1);
        }
      }
      throw error;
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setShowSearchResults(true);
    setLocationError('');
    
    try {
      const data = await searchLocation();
      
      if (data.length === 0) {
        setLocationError('No results found. Please try a different search term.');
      } else {
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Error searching location:', error);
      let errorMessage = 'Failed to search location. ';
      
      if (error instanceof Error) {
        if (error.message.includes('timed out')) {
          errorMessage += 'The request timed out. Please check your internet connection and try again.';
        } else if (!navigator.onLine) {
          errorMessage += 'Please check your internet connection and try again.';
        } else {
          errorMessage += 'Please try again later.';
        }
      }
      
      setLocationError(errorMessage);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLocationSelect = (result: SearchResult) => {
    const newLocation: [number, number] = [parseFloat(result.lat), parseFloat(result.lon)];
    updateCentersForLocation(newLocation);
    setShowSearchResults(false);
    setSearchQuery(result.display_name.split(',')[0]); // Show only the main place name
  };
  
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: [number, number] = [position.coords.latitude, position.coords.longitude];
          updateCentersForLocation(location);
          setLocationError('');
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocationError('Could not get your location. Please use the search to find centers in your area.');
          setNearbyCenters(recyclingCenters);
        },
        { 
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    }
  }, [recyclingCenters]);
  
  const handleCenterClick = (center: RecyclingCenter) => {
    setSelectedCenter(center);
  };

  const nearbyRecyclingCenters = nearbyCenters.filter(c => c.type === 'recycling');
  const nearbyDumpingGrounds = nearbyCenters.filter(c => c.type === 'dumping');
  
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Waste Management Centers</h2>
            <p className="text-gray-600 mt-1">Find recycling and waste management facilities within 10km</p>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center text-sm">
              <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
              <span>Recycling</span>
            </div>
            <div className="flex items-center text-sm">
              <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
              <span>Dumping</span>
            </div>
          </div>
        </div>

        <div className="mb-4 relative">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for a city or place..."
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              {isSearching && (
                <div className="absolute right-3 top-2.5">
                  <Loader2 size={20} className="animate-spin text-gray-400" />
                </div>
              )}
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
              disabled={isSearching}
            >
              <Search size={20} className="mr-1" />
              Search
            </button>
          </form>

          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white rounded-lg shadow-lg border">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => handleLocationSelect(result)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                >
                  <p className="font-medium text-gray-800">{result.display_name.split(',')[0]}</p>
                  <p className="text-sm text-gray-500">{result.display_name}</p>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {locationError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <WifiOff className="text-red-500 mr-2 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-red-800 font-medium">Search Error</p>
              <p className="text-red-700 text-sm mt-1">{locationError}</p>
            </div>
          </div>
        )}
        
        {!locationError && nearbyCenters.length === 0 ? (
          <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-start">
            <AlertCircle className="text-gray-400 mr-2 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-gray-800 font-medium">No centers found nearby</p>
              <p className="text-gray-600 text-sm mt-1">
                We couldn't find any waste management centers within 10km of your location. 
                Try searching for a different area or contact your local municipality for waste disposal guidelines.
              </p>
            </div>
          </div>
        ) : nearbyCenters.length > 0 && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800">
              Found {nearbyRecyclingCenters.length} recycling {nearbyRecyclingCenters.length === 1 ? 'center' : 'centers'} and {nearbyDumpingGrounds.length} waste management {nearbyDumpingGrounds.length === 1 ? 'facility' : 'facilities'} within 10km
            </p>
          </div>
        )}
        
        <div className="bg-gray-100 rounded-lg overflow-hidden h-[400px] mb-6">
          <MapContainer 
            center={userLocation}
            zoom={13}
            className="h-full w-full"
            style={{ background: '#f3f4f6' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <LocationMarker position={userLocation} />
            
            {nearbyCenters.map((center) => (
              <Marker
                key={center.id}
                position={[center.latitude, center.longitude]}
                icon={center.type === 'recycling' ? recyclingIcon : dumpingIcon}
                eventHandlers={{
                  click: () => handleCenterClick(center),
                }}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-medium text-gray-900">{center.name}</h3>
                    <p className="text-sm text-gray-600">{center.address}</p>
                    <p className="text-xs text-gray-500 mt-1">{center.hours}</p>
                    {center.contact && (
                      <p className="text-xs text-blue-600 mt-1 flex items-center">
                        <Phone size={12} className="mr-1" />
                        {center.contact}
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
        
        {nearbyCenters.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-medium text-gray-800">Nearby Centers</h3>
            
            {nearbyCenters.map(center => {
              const distance = calculateDistance(
                userLocation[0], userLocation[1],
                center.latitude, center.longitude
              ).toFixed(1);
              
              return (
                <div 
                  key={center.id}
                  className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                    selectedCenter?.id === center.id 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => handleCenterClick(center)}
                >
                  <div className="flex justify-between">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full ${center.type === 'recycling' ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                      <h4 className="font-medium text-gray-800">{center.name}</h4>
                    </div>
                    <div className="flex items-center text-gray-500">
                      <Navigation size={14} className="mr-1" />
                      <span className="text-xs">{distance}km away</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mt-1">{center.address}</p>
                  
                  <div className="mt-2 flex items-center text-gray-500">
                    <Clock size={14} className="mr-1" />
                    <span className="text-xs">{center.hours}</span>
                  </div>
                  
                  {center.contact && (
                    <div className="mt-2 flex items-center text-blue-600">
                      <Phone size={14} className="mr-1" />
                      <span className="text-xs">{center.contact}</span>
                    </div>
                  )}
                  
                  <div className="mt-2 flex flex-wrap gap-1">
                    {center.materials.map(material => (
                      <span 
                        key={material} 
                        className={`text-xs px-2 py-1 rounded-full ${
                          center.type === 'recycling'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {material}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {selectedCenter?.type === 'recycling' && selectedCenter && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-800 flex items-center">
              <Info size={16} className="mr-2" />
              Did you recycle your item at {selectedCenter.name}?
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              Let us know and earn 5 points for your contribution!
            </p>
            <button className="mt-3 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg w-full transition-colors">
              I Recycled My Item Here
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapView;