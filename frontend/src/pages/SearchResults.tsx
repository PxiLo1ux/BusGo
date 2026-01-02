import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Bus, Clock, Users, Star, ChevronLeft, Filter, Wifi, Wind, Tv, Loader2, AlertCircle, Search, MapPin, Calendar, Edit2 } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { searchApi } from '../services/api';

interface Schedule {
    id: string;
    busName: string;
    busType: string;
    operator: string;
    driverPhone: string;
    origin: string;
    destination: string;
    departureTime: string;
    arrivalTime: string;
    price: number;
    dynamicPrice: number;
    availableSeats: number;
    totalSeats: number;
    amenities: string[];
    hasToilet: boolean;
    rating: number;
    totalReviews: number;
}

const getAmenityIcon = (amenity: string) => {
    switch (amenity.toLowerCase()) {
        case 'wifi': return <Wifi className="w-4 h-4" />;
        case 'ac': return <Wind className="w-4 h-4" />;
        case 'tv': return <Tv className="w-4 h-4" />;
        default: return null;
    }
};

const getBusTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
        case 'tourist': return 'bg-primary-500/20 text-primary-400';
        case 'deluxe': return 'bg-secondary-500/20 text-secondary-400';
        default: return 'bg-slate-700 text-slate-400';
    }
};

export default function SearchResults() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState('price');
    const [filterType, setFilterType] = useState('all');
    const [isEditingSearch, setIsEditingSearch] = useState(false);

    const origin = searchParams.get('origin') || 'Kathmandu';
    const destination = searchParams.get('destination') || 'Pokhara';
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // Editable search form state
    const [editOrigin, setEditOrigin] = useState(origin);
    const [editDestination, setEditDestination] = useState(destination);
    const [editDate, setEditDate] = useState(date);

    useEffect(() => {
        const fetchSchedules = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await searchApi.searchBuses(origin, destination, date);
                setSchedules(response.data.schedules || []);
            } catch (err: any) {
                console.error('Search failed:', err);
                setError(err.response?.data?.message || 'Failed to search buses');
            } finally {
                setIsLoading(false);
            }
        };
        fetchSchedules();
    }, [origin, destination, date]);

    const handleSearchUpdate = () => {
        navigate(`/search?origin=${encodeURIComponent(editOrigin)}&destination=${encodeURIComponent(editDestination)}&date=${editDate}`);
        setIsEditingSearch(false);
    };

    const filteredSchedules = schedules
        .filter(s => filterType === 'all' || s.busType?.toLowerCase() === filterType)
        .sort((a, b) => {
            if (sortBy === 'price') return a.dynamicPrice - b.dynamicPrice;
            if (sortBy === 'time') return new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime();
            if (sortBy === 'rating') return b.rating - a.rating;
            return 0;
        });

    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const getDuration = (dep: string, arr: string) => {
        const duration = Math.floor((new Date(arr).getTime() - new Date(dep).getTime()) / (1000 * 60));
        return `${Math.floor(duration / 60)}h ${duration % 60}m`;
    };

    return (
        <div className="min-h-screen bg-slate-900">
            <Header />
            <main className="pt-24 pb-16">
                <div className="container mx-auto px-4 lg:px-8">
                    <div className="mb-8">
                        <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors">
                            <ChevronLeft className="w-5 h-5" /> Back to Home
                        </Link>

                        {/* Editable Search Section */}
                        <div className="glass rounded-2xl p-6 mb-6">
                            {isEditingSearch ? (
                                <div className="grid md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-2">From</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-500" />
                                            <input type="text" value={editOrigin} onChange={(e) => setEditOrigin(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-2">To</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-500" />
                                            <input type="text" value={editDestination} onChange={(e) => setEditDestination(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-2">Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} min={new Date().toISOString().split('T')[0]}
                                                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white" />
                                        </div>
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <button onClick={handleSearchUpdate} className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2">
                                            <Search className="w-5 h-5" /> Search
                                        </button>
                                        <button onClick={() => setIsEditingSearch(false)} className="py-3 px-4 bg-slate-700 text-white rounded-xl">Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <h1 className="text-2xl md:text-3xl font-display font-bold text-white mb-2">
                                            <span className="text-gradient">{origin}</span>
                                            <span className="mx-3 text-slate-500">→</span>
                                            <span className="text-gradient">{destination}</span>
                                        </h1>
                                        <p className="text-slate-400">{formatDate(date)}</p>
                                    </div>
                                    <button onClick={() => { setEditOrigin(origin); setEditDestination(destination); setEditDate(date); setIsEditingSearch(true); }}
                                        className="px-4 py-2 bg-primary-500/20 text-primary-400 rounded-xl flex items-center gap-2 hover:bg-primary-500/30 transition-colors">
                                        <Edit2 className="w-4 h-4" /> Modify Search
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                            <span>{filteredSchedules.length} buses found</span>
                        </div>
                    </div>

                    {/* Filters & Sort */}
                    <div className="glass rounded-2xl p-4 mb-8">
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Filter className="w-5 h-5 text-slate-400" />
                                <span className="text-slate-400">Filter:</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {['all', 'tourist', 'deluxe', 'standard'].map((type) => (
                                    <button key={type} onClick={() => setFilterType(type)}
                                        className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${filterType === type ? 'bg-primary-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                                        {type === 'all' ? 'All Types' : type}
                                    </button>
                                ))}
                            </div>
                            <div className="ml-auto flex items-center gap-2">
                                <span className="text-slate-400">Sort by:</span>
                                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                                    className="px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500">
                                    <option value="price">Price: Low to High</option>
                                    <option value="time">Departure Time</option>
                                    <option value="rating">Rating</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Results */}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
                        </div>
                    ) : error ? (
                        <div className="text-center py-20">
                            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">Search Failed</h3>
                            <p className="text-slate-400">{error}</p>
                        </div>
                    ) : filteredSchedules.length === 0 ? (
                        <div className="text-center py-20">
                            <Bus className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">No Buses Found</h3>
                            <p className="text-slate-400 mb-4">Try a different date or route</p>
                            <button onClick={() => setIsEditingSearch(true)} className="px-6 py-3 bg-primary-500 text-white rounded-xl">Modify Search</button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredSchedules.map((schedule) => (
                                <div key={schedule.id} className="glass rounded-2xl p-6 hover:border-primary-500/50 border border-transparent transition-all group">
                                    <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                                                    <Bus className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-semibold text-white">{schedule.busName}</h3>
                                                    <p className="text-slate-400 text-sm">{schedule.operator}</p>
                                                </div>
                                                <span className={`ml-auto px-3 py-1 rounded-lg text-sm font-medium ${getBusTypeColor(schedule.busType)}`}>
                                                    {schedule.busType}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-6 mb-4">
                                                <div className="text-center">
                                                    <p className="text-2xl font-bold text-white">{formatTime(schedule.departureTime)}</p>
                                                    <p className="text-slate-400 text-sm">{schedule.origin}</p>
                                                </div>
                                                <div className="flex-1 flex flex-col items-center">
                                                    <Clock className="w-4 h-4 text-slate-500 mb-1" />
                                                    <div className="w-full h-0.5 bg-slate-700 relative">
                                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary-500 rounded-full" />
                                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-secondary-500 rounded-full" />
                                                    </div>
                                                    <p className="text-slate-500 text-sm mt-1">{getDuration(schedule.departureTime, schedule.arrivalTime)}</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-2xl font-bold text-white">{formatTime(schedule.arrivalTime)}</p>
                                                    <p className="text-slate-400 text-sm">{schedule.destination}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 flex-wrap">
                                                <div className="flex items-center gap-1">
                                                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                                    <span className="text-white font-medium">{schedule.rating.toFixed(1)}</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-slate-400">
                                                    <Users className="w-4 h-4" />
                                                    <span>{schedule.availableSeats} seats left</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    {schedule.amenities?.slice(0, 3).map((a, i) => (
                                                        <span key={i} className="flex items-center gap-1 px-2 py-1 bg-slate-800 rounded-lg text-slate-400 text-sm" title={a}>
                                                            {getAmenityIcon(a)} {a}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="lg:border-l lg:border-white/10 lg:pl-6 flex flex-col items-end gap-3">
                                            {schedule.dynamicPrice !== schedule.price && (
                                                <p className="text-slate-500 line-through text-sm">Rs. {schedule.price.toLocaleString()}</p>
                                            )}
                                            <p className="text-3xl font-bold text-gradient">Rs. {schedule.dynamicPrice.toLocaleString()}</p>
                                            <button onClick={() => navigate(`/seats/${schedule.id}`)} className="px-8 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl btn-glow group-hover:scale-105 transition-transform">
                                                Select Seats
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}
