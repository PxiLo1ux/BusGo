import { useState, useEffect } from 'react';
import { MapPin, Bus, Phone, RefreshCw, Loader2, Navigation, ExternalLink, Clock, Activity } from 'lucide-react';
import { trackingApi } from '../../services/api';

interface BusLocation {
    scheduleId: string;
    busName: string;
    plateNumber: string;
    driverName: string;
    driverPhone: string;
    origin: string;
    destination: string;
    departureTime: string;
    arrivalTime: string;
    status: string;
    location: {
        latitude: number;
        longitude: number;
        speed: number | null;
        updatedAt: string;
    } | null;
}

export default function BusTracking() {
    const [buses, setBuses] = useState<BusLocation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    const loadBusLocations = async (showRefresh = false) => {
        if (showRefresh) setIsRefreshing(true);
        try {
            const res = await trackingApi.getAllBusLocations();
            setBuses(res.data.buses || []);
            setLastUpdate(new Date());
        } catch (err) {
            console.error('Failed to load bus locations:', err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        loadBusLocations();
        // Auto-refresh every 30 seconds
        const interval = setInterval(() => loadBusLocations(), 30000);
        return () => clearInterval(interval);
    }, []);

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const getStatusColor = (status: string) => {
        return status === 'IN_PROGRESS'
            ? 'bg-green-500/20 text-green-400 border-green-500/30'
            : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    };

    const openInMaps = (lat: number, lng: number) => {
        window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-display font-bold text-white mb-1">Live Bus Tracking</h1>
                    <p className="text-slate-400">Monitor all active buses in real-time</p>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-400">
                        Last updated: {lastUpdate.toLocaleTimeString()}
                    </span>
                    <button
                        onClick={() => loadBusLocations(true)}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg disabled:opacity-50"
                    >
                        <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="glass rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
                            <Bus className="w-5 h-5 text-primary-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{buses.length}</p>
                            <p className="text-sm text-slate-400">Active Buses</p>
                        </div>
                    </div>
                </div>
                <div className="glass rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                            <Activity className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-green-400">{buses.filter(b => b.status === 'IN_PROGRESS').length}</p>
                            <p className="text-sm text-slate-400">In Transit</p>
                        </div>
                    </div>
                </div>
                <div className="glass rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-secondary-500/20 rounded-lg flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-secondary-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-secondary-400">{buses.filter(b => b.location).length}</p>
                            <p className="text-sm text-slate-400">With GPS</p>
                        </div>
                    </div>
                </div>
                <div className="glass rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                            <Clock className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-yellow-400">{buses.filter(b => b.status === 'SCHEDULED').length}</p>
                            <p className="text-sm text-slate-400">Scheduled</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bus List */}
            {buses.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                    <Bus className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No Active Buses</h3>
                    <p className="text-slate-400">There are no buses currently in transit or scheduled to depart soon.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {buses.map(bus => (
                        <div key={bus.scheduleId} className="glass rounded-2xl p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                                        <Bus className="w-7 h-7 text-white" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-semibold text-white">{bus.busName}</h3>
                                            <span className="text-sm text-slate-400">({bus.plateNumber})</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-300">
                                            <MapPin className="w-4 h-4 text-primary-400" />
                                            <span>{bus.origin}</span>
                                            <span className="text-slate-500">→</span>
                                            <span>{bus.destination}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    {/* Driver Info */}
                                    <div className="text-right">
                                        <p className="text-white font-medium">{bus.driverName}</p>
                                        <a href={`tel:${bus.driverPhone}`} className="text-sm text-primary-400 flex items-center gap-1 justify-end hover:underline">
                                            <Phone className="w-3 h-3" /> {bus.driverPhone}
                                        </a>
                                    </div>

                                    {/* Time */}
                                    <div className="text-center">
                                        <p className="text-xs text-slate-400">Departure</p>
                                        <p className="text-white font-medium">{formatTime(bus.departureTime)}</p>
                                    </div>

                                    {/* Status */}
                                    <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${getStatusColor(bus.status)}`}>
                                        {bus.status === 'IN_PROGRESS' ? 'In Transit' : 'Scheduled'}
                                    </span>

                                    {/* Location */}
                                    {bus.location ? (
                                        <div className="flex items-center gap-2">
                                            <div className="text-right">
                                                <p className="text-xs text-slate-400">Speed</p>
                                                <p className="text-white font-medium">{bus.location.speed ? `${bus.location.speed.toFixed(0)} km/h` : 'N/A'}</p>
                                            </div>
                                            <button
                                                onClick={() => openInMaps(bus.location!.latitude, bus.location!.longitude)}
                                                className="flex items-center gap-1 px-3 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30"
                                            >
                                                <Navigation className="w-4 h-4" />
                                                View Map
                                                <ExternalLink className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="text-slate-500 text-sm">No GPS data</span>
                                    )}
                                </div>
                            </div>

                            {/* Location Details */}
                            {bus.location && (
                                <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-6 text-sm">
                                    <span className="text-slate-400">
                                        Lat: <span className="text-white">{bus.location.latitude.toFixed(6)}</span>
                                    </span>
                                    <span className="text-slate-400">
                                        Lng: <span className="text-white">{bus.location.longitude.toFixed(6)}</span>
                                    </span>
                                    <span className="text-slate-400">
                                        Updated: <span className="text-white">{new Date(bus.location.updatedAt).toLocaleTimeString()}</span>
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
