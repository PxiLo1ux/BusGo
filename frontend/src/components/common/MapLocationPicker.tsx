import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { X, MapPin, Navigation, Search } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapLocationPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectLocation: (location: { name: string; lat: number; lng: number }) => void;
    title: string;
}

// Nepal popular locations for quick access
const popularLocations = [
    { name: 'Kathmandu', lat: 27.7172, lng: 85.3240 },
    { name: 'Pokhara', lat: 28.2096, lng: 83.9856 },
    { name: 'Chitwan', lat: 27.5291, lng: 84.3542 },
    { name: 'Lumbini', lat: 27.4833, lng: 83.2833 },
    { name: 'Biratnagar', lat: 26.4525, lng: 87.2718 },
    { name: 'Birgunj', lat: 27.0104, lng: 84.8821 },
    { name: 'Dharan', lat: 26.8120, lng: 87.2838 },
    { name: 'Butwal', lat: 27.7006, lng: 83.4485 },
    { name: 'Hetauda', lat: 27.4287, lng: 85.0322 },
    { name: 'Janakpur', lat: 26.7288, lng: 85.9263 },
];

function LocationMarker({ position, setPosition }: { position: [number, number] | null; setPosition: (pos: [number, number]) => void }) {
    useMapEvents({
        click(e) {
            setPosition([e.latlng.lat, e.latlng.lng]);
        },
    });

    return position ? <Marker position={position} /> : null;
}

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
    const map = useMap();
    useEffect(() => {
        map.setView([lat, lng], 13);
    }, [lat, lng, map]);
    return null;
}

export default function MapLocationPicker({ isOpen, onClose, onSelectLocation, title }: MapLocationPickerProps) {
    const [position, setPosition] = useState<[number, number] | null>(null);
    const [locationName, setLocationName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [center, setCenter] = useState<[number, number]>([27.7172, 85.3240]); // Kathmandu default

    // Reverse geocode to get place name
    useEffect(() => {
        if (!position) return;

        const fetchPlaceName = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position[0]}&lon=${position[1]}&zoom=14`
                );
                const data = await response.json();
                const name = data.address?.city || data.address?.town || data.address?.village || data.address?.county || 'Selected Location';
                setLocationName(name);
            } catch (error) {
                setLocationName('Selected Location');
            } finally {
                setIsLoading(false);
            }
        };
        fetchPlaceName();
    }, [position]);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setIsLoading(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)},Nepal&limit=1`
            );
            const data = await response.json();
            if (data.length > 0) {
                const { lat, lon, display_name } = data[0];
                const newPos: [number, number] = [parseFloat(lat), parseFloat(lon)];
                setPosition(newPos);
                setCenter(newPos);
                setLocationName(display_name.split(',')[0]);
            }
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickSelect = (loc: typeof popularLocations[0]) => {
        setPosition([loc.lat, loc.lng]);
        setCenter([loc.lat, loc.lng]);
        setLocationName(loc.name);
    };

    const handleConfirm = () => {
        if (position && locationName) {
            onSelectLocation({ name: locationName, lat: position[0], lng: position[1] });
            onClose();
        }
    };

    const handleCurrentLocation = () => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
                    setPosition(newPos);
                    setCenter(newPos);
                },
                (err) => console.error('Geolocation error:', err)
            );
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-primary-400" />
                        {title}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b border-white/10">
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="Search for a location..."
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500"
                            />
                        </div>
                        <button onClick={handleSearch} className="px-4 py-2.5 bg-primary-500 text-white rounded-xl font-medium">
                            Search
                        </button>
                        <button onClick={handleCurrentLocation} className="p-2.5 bg-slate-700 text-white rounded-xl" title="Use current location">
                            <Navigation className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Quick Select */}
                <div className="p-4 border-b border-white/10">
                    <p className="text-slate-400 text-sm mb-2">Popular locations:</p>
                    <div className="flex flex-wrap gap-2">
                        {popularLocations.map((loc) => (
                            <button
                                key={loc.name}
                                onClick={() => handleQuickSelect(loc)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${locationName === loc.name
                                        ? 'bg-primary-500 text-white'
                                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                    }`}
                            >
                                {loc.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Map */}
                <div className="h-[350px]">
                    <MapContainer center={center} zoom={8} style={{ height: '100%', width: '100%' }}>
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        />
                        <LocationMarker position={position} setPosition={setPosition} />
                        <RecenterMap lat={center[0]} lng={center[1]} />
                    </MapContainer>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 flex items-center justify-between">
                    <div>
                        {position && (
                            <p className="text-white">
                                <span className="text-slate-400">Selected:</span>{' '}
                                <span className="font-medium">{isLoading ? 'Loading...' : locationName}</span>
                            </p>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 bg-slate-700 text-white rounded-xl">
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!position || !locationName || isLoading}
                            className="px-6 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl disabled:opacity-50"
                        >
                            Confirm Location
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
