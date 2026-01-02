import { useState, useEffect } from 'react';
import { Bus, CheckCircle, XCircle, Clock, Eye, FileText, Loader2, AlertCircle, Users, Wifi, Wind, Tv, Search, Filter, X, MapPin, Calendar, Star, Phone, Mail, Zap, Image, Grid3X3 } from 'lucide-react';
import { adminApi } from '../../services/api';
import BusSeatLayout from '../../components/BusSeatLayout';

interface BusData {
    id: string;
    name: string;
    plateNumber: string;
    type: string;
    capacity: number;
    approved: boolean;
    amenities: string[];
    hasToilet: boolean;
    createdAt: string;
    rating?: number;
    totalReviews?: number;
    photos?: string[];
    bluebookImage?: string;
    taxClearance?: string;
    insuranceDoc?: string;
    documentsVerified?: boolean;
    employedDriverName?: string;
    employedDriverPhone?: string;
    driver: {
        id: string;
        rating?: number;
        totalReviews?: number;
        user: { name: string; email: string; phone: string };
    };
    schedules?: Array<{
        id: string;
        route: { origin: string; destination: string };
        departureTime: string;
        status: string;
    }>;
}

export default function BusVerification() {
    const [buses, setBuses] = useState<BusData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBus, setSelectedBus] = useState<BusData | null>(null);
    const [notes, setNotes] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [detailTab, setDetailTab] = useState<'info' | 'routes' | 'photos' | 'docs' | 'seats'>('info');

    const fetchBuses = async () => {
        try {
            setIsLoading(true);
            const response = await adminApi.getAllBuses();
            setBuses(response.data.buses || []);
        } catch (err: any) {
            console.error('Failed to load buses:', err);
            setError(err.response?.data?.message || 'Failed to load buses');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchBuses(); }, []);

    // Filter buses based on search, status, and type
    const filteredBuses = buses.filter(b => {
        const matchesSearch = searchTerm === '' ||
            b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.driver?.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.schedules?.some(s =>
                s.route.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.route.destination.toLowerCase().includes(searchTerm.toLowerCase())
            );

        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'pending' && !b.approved) ||
            (statusFilter === 'approved' && b.approved);

        const matchesType = typeFilter === 'all' || b.type?.toUpperCase() === typeFilter;

        return matchesSearch && matchesStatus && matchesType;
    });

    // Get unique routes from all buses
    const allRoutes = [...new Set(buses.flatMap(b =>
        b.schedules?.map(s => `${s.route.origin} → ${s.route.destination}`) || []
    ))];

    const updateStatus = async (id: string, approved: boolean) => {
        setIsUpdating(true);
        try {
            await adminApi.approveBus(id, approved);
            await fetchBuses();
            setSelectedBus(null);
            setNotes('');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update bus status');
        } finally {
            setIsUpdating(false);
        }
    };

    const getStatusBadge = (bus: BusData) => {
        if (bus.approved) return <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs"><CheckCircle className="w-3 h-3" />Approved</span>;
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg text-xs"><Clock className="w-3 h-3" />Pending</span>;
    };

    const getTypeColor = (type: string) => {
        const t = type?.toUpperCase();
        if (t === 'TOURIST') return 'bg-primary-500/20 text-primary-400';
        if (t === 'DELUXE') return 'bg-secondary-500/20 text-secondary-400';
        return 'bg-slate-700 text-slate-400';
    };

    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    const amenityIcons: Record<string, React.ReactNode> = {
        'WiFi': <Wifi className="w-4 h-4" />,
        'AC': <Wind className="w-4 h-4" />,
        'TV': <Tv className="w-4 h-4" />,
        'Charging Ports': <Zap className="w-4 h-4" />,
    };

    if (isLoading) {
        return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary-500 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <div><h1 className="text-2xl font-display font-bold text-white mb-1">Bus Management</h1><p className="text-slate-400">Search, review and manage all registered buses</p></div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" /> {error}
                    <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
                </div>
            )}

            {/* Search and Filters */}
            <div className="glass rounded-2xl p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search Bar */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by bus name, plate number, driver, or route..."
                            className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Filter Toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-4 py-3 rounded-xl flex items-center gap-2 font-medium transition-colors ${showFilters ? 'bg-primary-500 text-white' : 'bg-slate-800 text-slate-300'}`}
                    >
                        <Filter className="w-5 h-5" />
                        Filters
                        {(statusFilter !== 'all' || typeFilter !== 'all') && (
                            <span className="w-5 h-5 bg-accent-500 text-white text-xs rounded-full flex items-center justify-center">
                                {[statusFilter, typeFilter].filter(f => f !== 'all').length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Expanded Filters */}
                {showFilters && (
                    <div className="mt-4 pt-4 border-t border-white/10 grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Status</label>
                            <div className="flex gap-2 flex-wrap">
                                {['all', 'pending', 'approved'].map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setStatusFilter(s)}
                                        className={`px-3 py-1.5 rounded-lg text-sm capitalize ${statusFilter === s ? 'bg-primary-500 text-white' : 'bg-slate-700 text-slate-400'}`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Bus Type</label>
                            <div className="flex gap-2 flex-wrap">
                                {['all', 'STANDARD', 'DELUXE', 'TOURIST'].map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setTypeFilter(t)}
                                        className={`px-3 py-1.5 rounded-lg text-sm capitalize ${typeFilter === t ? 'bg-secondary-500 text-white' : 'bg-slate-700 text-slate-400'}`}
                                    >
                                        {t.toLowerCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-white">{buses.length}</p>
                    <p className="text-slate-400 text-sm">Total Buses</p>
                </div>
                <div className="glass rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-green-400">{buses.filter(b => b.approved).length}</p>
                    <p className="text-slate-400 text-sm">Approved</p>
                </div>
                <div className="glass rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-yellow-400">{buses.filter(b => !b.approved).length}</p>
                    <p className="text-slate-400 text-sm">Pending</p>
                </div>
                <div className="glass rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-primary-400">{filteredBuses.length}</p>
                    <p className="text-slate-400 text-sm">Matching</p>
                </div>
            </div>

            {/* Results */}
            {filteredBuses.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                    <Bus className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">No Buses Found</h3>
                    <p className="text-slate-400">{searchTerm ? 'Try a different search term' : 'No buses in this category'}</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredBuses.map((bus) => (
                        <div key={bus.id} className="glass rounded-2xl p-6 hover:border-primary-500/50 border border-transparent transition-all cursor-pointer" onClick={() => setSelectedBus(bus)}>
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center overflow-hidden">
                                    {bus.photos?.[0] ? (
                                        <img src={bus.photos[0]} alt={bus.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <Bus className="w-6 h-6 text-white" />
                                    )}
                                </div>
                                {getStatusBadge(bus)}
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-1">{bus.name}</h3>
                            <p className="text-slate-400 text-sm mb-2 font-mono">{bus.plateNumber}</p>

                            {bus.rating !== undefined && bus.rating > 0 && (
                                <div className="flex items-center gap-1 mb-3 text-sm">
                                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                    <span className="text-white">{bus.rating.toFixed(1)}</span>
                                    <span className="text-slate-500">({bus.totalReviews} reviews)</span>
                                </div>
                            )}

                            <div className="space-y-2 text-sm mb-4">
                                <div className="flex justify-between"><span className="text-slate-400">Driver</span><span className="text-white">{bus.driver?.user?.name || 'Unknown'}</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">Type</span><span className={`px-2 py-0.5 rounded capitalize ${getTypeColor(bus.type)}`}>{bus.type?.toLowerCase()}</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">Capacity</span><span className="text-white">{bus.capacity} seats</span></div>
                            </div>

                            {/* Routes Preview */}
                            {bus.schedules && bus.schedules.length > 0 && (
                                <div className="mb-4">
                                    <p className="text-xs text-slate-500 mb-1">Routes:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {[...new Set(bus.schedules.map(s => `${s.route.origin}→${s.route.destination}`))].slice(0, 2).map((r, i) => (
                                            <span key={i} className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded">{r}</span>
                                        ))}
                                        {bus.schedules.length > 2 && (
                                            <span className="text-xs text-slate-500">+{bus.schedules.length - 2} more</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {bus.amenities?.length > 0 && (
                                <div className="flex gap-2 mb-4">
                                    {bus.amenities.slice(0, 3).map((a, i) => (
                                        <span key={i} className="px-2 py-1 bg-slate-800 text-slate-400 rounded text-xs flex items-center gap-1">
                                            {amenityIcons[a] || null}{a}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); setSelectedBus(bus); }} className="flex-1 px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"><Eye className="w-4 h-4" />View Details</button>
                                {!bus.approved && (<>
                                    <button onClick={(e) => { e.stopPropagation(); updateStatus(bus.id, true); }} disabled={isUpdating} className="px-3 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg disabled:opacity-50"><CheckCircle className="w-4 h-4" /></button>
                                </>)}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Detailed Bus Modal */}
            {selectedBus && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedBus(null)}>
                    <div className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center overflow-hidden">
                                    {selectedBus.photos?.[0] ? (
                                        <img src={selectedBus.photos[0]} alt={selectedBus.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <Bus className="w-8 h-8 text-white" />
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">{selectedBus.name}</h2>
                                    <p className="text-slate-400 font-mono">{selectedBus.plateNumber}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        {getStatusBadge(selectedBus)}
                                        {selectedBus.rating !== undefined && selectedBus.rating > 0 && (
                                            <span className="flex items-center gap-1 text-sm text-yellow-400">
                                                <Star className="w-4 h-4 fill-yellow-400" />{selectedBus.rating.toFixed(1)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setSelectedBus(null)} className="text-slate-400 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-white/10">
                            {(['info', 'routes', 'photos', 'docs', 'seats'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setDetailTab(tab)}
                                    className={`flex-1 py-3 text-sm font-medium capitalize ${detailTab === tab ? 'text-primary-400 border-b-2 border-primary-400' : 'text-slate-400 hover:text-white'}`}
                                >
                                    {tab === 'seats' ? <span className="flex items-center justify-center gap-1"><Grid3X3 className="w-4 h-4" />Seats</span> : tab}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            {detailTab === 'info' && (
                                <div className="space-y-4">
                                    {/* Driver Info */}
                                    <div className="p-4 bg-slate-900/50 rounded-xl">
                                        <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2"><Users className="w-4 h-4" />Driver Information</h3>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-white font-medium">{selectedBus.driver?.user?.name}</p>
                                                <p className="text-slate-400 text-sm flex items-center gap-1"><Mail className="w-3 h-3" />{selectedBus.driver?.user?.email}</p>
                                                <p className="text-slate-400 text-sm flex items-center gap-1"><Phone className="w-3 h-3" />{selectedBus.driver?.user?.phone}</p>
                                            </div>
                                            {selectedBus.driver?.rating && (
                                                <div className="text-right">
                                                    <p className="text-yellow-400 flex items-center justify-end gap-1"><Star className="w-4 h-4 fill-yellow-400" />{selectedBus.driver.rating.toFixed(1)}</p>
                                                    <p className="text-slate-500 text-sm">{selectedBus.driver.totalReviews} driver reviews</p>
                                                </div>
                                            )}
                                        </div>
                                        {selectedBus.employedDriverName && (
                                            <div className="mt-3 pt-3 border-t border-white/10">
                                                <p className="text-xs text-slate-500">Employed Driver:</p>
                                                <p className="text-white">{selectedBus.employedDriverName}</p>
                                                <p className="text-slate-400 text-sm">{selectedBus.employedDriverPhone}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Bus Details */}
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="p-4 bg-slate-900/50 rounded-xl">
                                            <p className="text-xs text-slate-500 mb-1">Type</p>
                                            <p className={`inline-block px-3 py-1 rounded capitalize ${getTypeColor(selectedBus.type)}`}>{selectedBus.type?.toLowerCase()}</p>
                                        </div>
                                        <div className="p-4 bg-slate-900/50 rounded-xl">
                                            <p className="text-xs text-slate-500 mb-1">Capacity</p>
                                            <p className="text-white text-lg font-bold">{selectedBus.capacity} <span className="text-sm font-normal text-slate-400">seats</span></p>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-slate-900/50 rounded-xl flex justify-between items-center">
                                        <span className="text-slate-400">Has Toilet</span>
                                        <span className={selectedBus.hasToilet ? 'text-green-400' : 'text-slate-500'}>{selectedBus.hasToilet ? '✓ Yes' : '✗ No'}</span>
                                    </div>

                                    {selectedBus.amenities?.length > 0 && (
                                        <div className="p-4 bg-slate-900/50 rounded-xl">
                                            <p className="text-xs text-slate-500 mb-3">Amenities</p>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedBus.amenities.map((a, i) => (
                                                    <span key={i} className="px-3 py-1.5 bg-primary-500/20 text-primary-400 rounded-lg text-sm flex items-center gap-2">
                                                        {amenityIcons[a] || null}{a}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="p-4 bg-slate-900/50 rounded-xl">
                                            <p className="text-xs text-slate-500 mb-1">Registered On</p>
                                            <p className="text-white flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-400" />{formatDate(selectedBus.createdAt)}</p>
                                        </div>
                                        <div className="p-4 bg-slate-900/50 rounded-xl">
                                            <p className="text-xs text-slate-500 mb-1">Bus Rating</p>
                                            <p className="text-white flex items-center gap-2">
                                                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                                {selectedBus.rating?.toFixed(1) || 'N/A'} ({selectedBus.totalReviews || 0} reviews)
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {detailTab === 'routes' && (
                                <div className="space-y-4">
                                    {selectedBus.schedules && selectedBus.schedules.length > 0 ? (
                                        <>
                                            {(() => {
                                                // Group schedules by route and count
                                                const routeGroups: Record<string, { origin: string; destination: string; count: number; completed: number; scheduled: number }> = {};
                                                selectedBus.schedules.forEach(s => {
                                                    const key = `${s.route.origin}-${s.route.destination}`;
                                                    if (!routeGroups[key]) {
                                                        routeGroups[key] = { origin: s.route.origin, destination: s.route.destination, count: 0, completed: 0, scheduled: 0 };
                                                    }
                                                    routeGroups[key].count++;
                                                    if (s.status === 'COMPLETED') routeGroups[key].completed++;
                                                    if (s.status === 'SCHEDULED') routeGroups[key].scheduled++;
                                                });
                                                return Object.entries(routeGroups).map(([key, r]) => (
                                                    <div key={key} className="p-4 bg-slate-900/50 rounded-xl">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-3">
                                                                <MapPin className="w-5 h-5 text-primary-400" />
                                                                <p className="text-white font-medium">{r.origin} → {r.destination}</p>
                                                            </div>
                                                            <span className="text-slate-400 text-sm">{r.count} trips</span>
                                                        </div>
                                                        <div className="flex gap-3 text-xs">
                                                            <span className="text-green-400">{r.completed} completed</span>
                                                            <span className="text-blue-400">{r.scheduled} scheduled</span>
                                                        </div>
                                                    </div>
                                                ));
                                            })()}
                                        </>
                                    ) : (
                                        <p className="text-slate-400 text-center py-8">No routes assigned yet</p>
                                    )}
                                </div>
                            )}

                            {detailTab === 'photos' && (
                                <div className="space-y-4">
                                    {selectedBus.photos && selectedBus.photos.length > 0 ? (
                                        <div className="grid grid-cols-2 gap-4">
                                            {selectedBus.photos.map((photo, i) => (
                                                <img
                                                    key={i}
                                                    src={photo}
                                                    alt={`Bus photo ${i + 1}`}
                                                    className="w-full h-40 object-cover rounded-xl hover:scale-105 transition-transform cursor-pointer"
                                                    onClick={() => window.open(photo, '_blank')}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <Image className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                            <p className="text-slate-400">No photos uploaded</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {detailTab === 'docs' && (
                                <div className="space-y-4">
                                    {/* Bluebook */}
                                    <div className="p-4 bg-slate-900/50 rounded-xl">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3"><FileText className="w-5 h-5 text-slate-400" /><span className="text-white">Bluebook</span></div>
                                            {selectedBus.bluebookImage ? (
                                                <span className="text-green-400 text-sm">✓ Uploaded</span>
                                            ) : (
                                                <span className="text-slate-500 text-sm">Not uploaded</span>
                                            )}
                                        </div>
                                        {selectedBus.bluebookImage && (
                                            <img src={selectedBus.bluebookImage} alt="Bluebook" className="w-full h-48 object-contain rounded-lg bg-slate-800 cursor-pointer hover:opacity-80" onClick={() => window.open(selectedBus.bluebookImage, '_blank')} />
                                        )}
                                    </div>

                                    {/* Tax Clearance */}
                                    <div className="p-4 bg-slate-900/50 rounded-xl">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3"><FileText className="w-5 h-5 text-slate-400" /><span className="text-white">Tax Clearance</span></div>
                                            {selectedBus.taxClearance ? (
                                                <span className="text-green-400 text-sm">✓ Uploaded</span>
                                            ) : (
                                                <span className="text-slate-500 text-sm">Not uploaded</span>
                                            )}
                                        </div>
                                        {selectedBus.taxClearance && (
                                            <img src={selectedBus.taxClearance} alt="Tax Clearance" className="w-full h-48 object-contain rounded-lg bg-slate-800 cursor-pointer hover:opacity-80" onClick={() => window.open(selectedBus.taxClearance, '_blank')} />
                                        )}
                                    </div>

                                    {/* Insurance */}
                                    <div className="p-4 bg-slate-900/50 rounded-xl">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3"><FileText className="w-5 h-5 text-slate-400" /><span className="text-white">Insurance</span></div>
                                            {selectedBus.insuranceDoc ? (
                                                <span className="text-green-400 text-sm">✓ Uploaded</span>
                                            ) : (
                                                <span className="text-slate-500 text-sm">Not uploaded</span>
                                            )}
                                        </div>
                                        {selectedBus.insuranceDoc && (
                                            <img src={selectedBus.insuranceDoc} alt="Insurance" className="w-full h-48 object-contain rounded-lg bg-slate-800 cursor-pointer hover:opacity-80" onClick={() => window.open(selectedBus.insuranceDoc, '_blank')} />
                                        )}
                                    </div>

                                    <div className="p-4 bg-slate-900/50 rounded-xl flex items-center justify-between">
                                        <span className="text-white">Documents Verified</span>
                                        <span className={selectedBus.documentsVerified ? 'text-green-400' : 'text-yellow-400'}>
                                            {selectedBus.documentsVerified ? '✓ Verified' : 'Pending'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Seats Tab */}
                            {detailTab === 'seats' && (
                                <div className="flex justify-center py-4">
                                    <BusSeatLayout
                                        capacity={selectedBus.capacity}
                                        hasToilet={selectedBus.hasToilet}
                                        hasWifi={selectedBus.amenities?.includes('wifi')}
                                        hasTV={selectedBus.amenities?.includes('tv')}
                                        busName={selectedBus.name}
                                        showLegend={true}
                                        interactive={false}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Modal Footer - Actions for pending buses */}
                        {!selectedBus.approved && (
                            <div className="p-6 border-t border-white/10 space-y-4">
                                <div>
                                    <label className="block text-sm text-slate-300 mb-2">Notes (optional)</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Add verification notes..."
                                        className="w-full px-4 py-2 bg-slate-900/50 border border-white/10 rounded-xl text-white resize-none h-20"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => updateStatus(selectedBus.id, false)} disabled={isUpdating} className="flex-1 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium rounded-xl flex items-center justify-center gap-2">
                                        <XCircle className="w-5 h-5" />Reject
                                    </button>
                                    <button onClick={() => updateStatus(selectedBus.id, true)} disabled={isUpdating} className="flex-1 px-4 py-3 bg-green-500 text-white font-semibold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                                        {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5" />Approve</>}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
