import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Wallet, Search, ChevronDown, Map } from 'lucide-react';
import MapLocationPicker from '../common/MapLocationPicker';

// Nepal destinations
const DESTINATIONS = [
    'Kathmandu', 'Pokhara', 'Chitwan', 'Lumbini', 'Nagarkot', 'Bhaktapur',
    'Biratnagar', 'Birgunj', 'Dharan', 'Butwal', 'Hetauda', 'Janakpur',
];

// Route data for distance/time/cost calculations
const ROUTE_DATA: Record<string, { distance: number; time: number; baseFare: number }> = {
    'Kathmandu-Pokhara': { distance: 200, time: 360, baseFare: 800 },
    'Kathmandu-Chitwan': { distance: 150, time: 300, baseFare: 600 },
    'Kathmandu-Lumbini': { distance: 280, time: 420, baseFare: 1000 },
    'Kathmandu-Nagarkot': { distance: 32, time: 60, baseFare: 200 },
    'Kathmandu-Bhaktapur': { distance: 13, time: 30, baseFare: 100 },
    'Kathmandu-Biratnagar': { distance: 400, time: 600, baseFare: 1500 },
    'Pokhara-Chitwan': { distance: 150, time: 270, baseFare: 550 },
    'Pokhara-Lumbini': { distance: 200, time: 330, baseFare: 750 },
};

const getRouteData = (origin: string, destination: string) => {
    const key1 = `${origin}-${destination}`;
    const key2 = `${destination}-${origin}`;
    return ROUTE_DATA[key1] || ROUTE_DATA[key2] || { distance: 100, time: 180, baseFare: 500 };
};

export default function MapSection() {
    const navigate = useNavigate();
    const [origin, setOrigin] = useState('Kathmandu');
    const [destination, setDestination] = useState('Pokhara');
    const [routeInfo, setRouteInfo] = useState({ distance: 200, time: 360, baseFare: 800 });
    const [isOriginOpen, setIsOriginOpen] = useState(false);
    const [isDestOpen, setIsDestOpen] = useState(false);
    const [mapPickerOpen, setMapPickerOpen] = useState<'origin' | 'destination' | null>(null);
    const [date, setDate] = useState(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    });

    const updateRouteInfo = useCallback(() => {
        if (origin && destination && origin !== destination) {
            const data = getRouteData(origin, destination);
            setRouteInfo(data);
        }
    }, [origin, destination]);

    useEffect(() => { updateRouteInfo(); }, [updateRouteInfo]);

    const formatTime = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    const handleSearch = () => navigate(`/search?origin=${origin}&destination=${destination}&date=${date}`);

    const handleMapSelect = (location: { name: string; lat: number; lng: number }) => {
        if (mapPickerOpen === 'origin') {
            setOrigin(location.name);
        } else if (mapPickerOpen === 'destination') {
            setDestination(location.name);
        }
        setMapPickerOpen(null);
    };

    return (
        <section id="search" className="py-20 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
            <div className="container mx-auto px-4 lg:px-8">
                <div className="text-center max-w-2xl mx-auto mb-12">
                    <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
                        Plan Your <span className="text-gradient">Journey</span>
                    </h2>
                    <p className="text-slate-400">Select your pickup and destination to see available routes, travel time, and estimated fares.</p>
                </div>

                <div className="grid lg:grid-cols-2 gap-8 items-start">
                    {/* Map Container */}
                    <div className="glass rounded-3xl overflow-hidden order-2 lg:order-1">
                        <div className="aspect-video relative bg-slate-800">
                            <iframe
                                src={`https://www.google.com/maps/embed/v1/directions?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8'}&origin=${origin},Nepal&destination=${destination},Nepal&mode=driving`}
                                width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade" className="absolute inset-0"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-800/90 backdrop-blur"
                                style={{ display: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? 'none' : 'flex' }}>
                                <div className="text-center p-8">
                                    <MapPin className="w-16 h-16 text-primary-500 mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold text-white mb-2">{origin} → {destination}</h3>
                                    <p className="text-slate-400">Add Google Maps API key to enable interactive map</p>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 p-6">
                            <div className="text-center">
                                <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center mx-auto mb-2"><MapPin className="w-6 h-6 text-primary-400" /></div>
                                <p className="text-2xl font-bold text-white">{routeInfo.distance}</p>
                                <p className="text-sm text-slate-400">Kilometers</p>
                            </div>
                            <div className="text-center">
                                <div className="w-12 h-12 bg-secondary-500/20 rounded-xl flex items-center justify-center mx-auto mb-2"><Clock className="w-6 h-6 text-secondary-400" /></div>
                                <p className="text-2xl font-bold text-white">{formatTime(routeInfo.time)}</p>
                                <p className="text-sm text-slate-400">Travel Time</p>
                            </div>
                            <div className="text-center">
                                <div className="w-12 h-12 bg-accent-500/20 rounded-xl flex items-center justify-center mx-auto mb-2"><Wallet className="w-6 h-6 text-accent-400" /></div>
                                <p className="text-2xl font-bold text-white">Rs. {routeInfo.baseFare}</p>
                                <p className="text-sm text-slate-400">Starting From</p>
                            </div>
                        </div>
                    </div>

                    {/* Search Form */}
                    <div className="glass rounded-3xl p-8 order-1 lg:order-2">
                        <h3 className="text-2xl font-display font-bold text-white mb-6">Book Your Ticket</h3>

                        {/* Origin */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-300 mb-2">Pickup Location</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <button onClick={() => { setIsOriginOpen(!isOriginOpen); setIsDestOpen(false); }}
                                        className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white text-left flex items-center justify-between hover:border-primary-500/50 transition-colors">
                                        <span className="flex items-center gap-3"><MapPin className="w-5 h-5 text-primary-500" />{origin}</span>
                                        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isOriginOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isOriginOpen && (
                                        <div className="absolute z-20 mt-2 w-full bg-slate-800 border border-white/10 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                            {DESTINATIONS.filter(d => d !== destination).map((dest) => (
                                                <button key={dest} onClick={() => { setOrigin(dest); setIsOriginOpen(false); }}
                                                    className={`w-full px-4 py-3 text-left hover:bg-primary-500/20 transition-colors ${origin === dest ? 'bg-primary-500/10 text-primary-400' : 'text-white'}`}>
                                                    {dest}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => setMapPickerOpen('origin')} className="p-3 bg-primary-500/20 hover:bg-primary-500/30 text-primary-400 rounded-xl" title="Pick from map">
                                    <Map className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Destination */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-300 mb-2">Destination</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <button onClick={() => { setIsDestOpen(!isDestOpen); setIsOriginOpen(false); }}
                                        className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white text-left flex items-center justify-between hover:border-primary-500/50 transition-colors">
                                        <span className="flex items-center gap-3"><MapPin className="w-5 h-5 text-secondary-500" />{destination}</span>
                                        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isDestOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isDestOpen && (
                                        <div className="absolute z-20 mt-2 w-full bg-slate-800 border border-white/10 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                            {DESTINATIONS.filter(d => d !== origin).map((dest) => (
                                                <button key={dest} onClick={() => { setDestination(dest); setIsDestOpen(false); }}
                                                    className={`w-full px-4 py-3 text-left hover:bg-primary-500/20 transition-colors ${destination === dest ? 'bg-primary-500/10 text-primary-400' : 'text-white'}`}>
                                                    {dest}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => setMapPickerOpen('destination')} className="p-3 bg-secondary-500/20 hover:bg-secondary-500/30 text-secondary-400 rounded-xl" title="Pick from map">
                                    <Map className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Date */}
                        <div className="mb-8">
                            <label className="block text-sm font-medium text-slate-300 mb-2">Travel Date</label>
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary-500 transition-colors" />
                        </div>

                        <button onClick={handleSearch}
                            className="w-full px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold text-lg rounded-xl transition-all duration-300 btn-glow flex items-center justify-center gap-2">
                            <Search className="w-5 h-5" /> Search Buses
                        </button>

                        <div className="mt-8 pt-6 border-t border-white/10">
                            <p className="text-sm text-slate-400 mb-3">Popular Routes:</p>
                            <div className="flex flex-wrap gap-2">
                                {['Kathmandu → Pokhara', 'Kathmandu → Chitwan', 'Pokhara → Lumbini'].map((route) => (
                                    <button key={route} onClick={() => { const [o, d] = route.split(' → '); setOrigin(o); setDestination(d); }}
                                        className="px-3 py-1.5 bg-white/5 hover:bg-primary-500/20 border border-white/10 rounded-lg text-sm text-slate-300 hover:text-primary-400 transition-colors">
                                        {route}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Map Picker Modal */}
            <MapLocationPicker
                isOpen={mapPickerOpen !== null}
                onClose={() => setMapPickerOpen(null)}
                onSelectLocation={handleMapSelect}
                title={mapPickerOpen === 'origin' ? 'Select Pickup Location' : 'Select Destination'}
            />
        </section>
    );
}
