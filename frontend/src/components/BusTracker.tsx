import { useState, useEffect } from 'react';
import { MapPin, Navigation, RefreshCw, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { trackingApi } from '../services/api';

interface BusTrackerProps {
    scheduleId: string;
    origin: string;
    destination: string;
}

interface TrackingData {
    latitude: number;
    longitude: number;
    speed: number | null;
    heading: number | null;
    updatedAt: string;
    bus: { name: string; plateNumber: string };
    schedule: { departureTime: string; arrivalTime: string };
}

export default function BusTracker({ scheduleId, origin, destination }: BusTrackerProps) {
    const [tracking, setTracking] = useState<TrackingData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchLocation = async (silent = false) => {
        try {
            if (!silent) setIsRefreshing(true);
            const res = await trackingApi.getLocation(scheduleId);
            setTracking(res.data.tracking);
            setLastRefresh(new Date());
            setError(null);
        } catch (err: any) {
            if (!silent) setError(err.response?.data?.message || 'Failed to get location');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchLocation();
        // Auto-refresh every 30 seconds
        const interval = setInterval(() => fetchLocation(true), 30000);
        return () => clearInterval(interval);
    }, [scheduleId]);

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const getTimeSinceUpdate = () => {
        if (!tracking) return '';
        const diff = Date.now() - new Date(tracking.updatedAt).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins === 1) return '1 min ago';
        return `${mins} mins ago`;
    };

    const openInMaps = () => {
        if (!tracking) return;
        const url = `https://www.google.com/maps?q=${tracking.latitude},${tracking.longitude}`;
        window.open(url, '_blank');
    };

    if (isLoading) {
        return (
            <div className="glass rounded-2xl p-8 text-center">
                <Loader2 className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-4" />
                <p className="text-slate-400">Loading bus location...</p>
            </div>
        );
    }

    return (
        <div className="glass rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                        <Navigation className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Live Bus Tracking</h3>
                        <p className="text-sm text-slate-400">{origin} → {destination}</p>
                    </div>
                </div>
                <button
                    onClick={() => fetchLocation()}
                    disabled={isRefreshing}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400"
                >
                    <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="p-6">
                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-2 mb-4">
                        <AlertCircle className="w-5 h-5" /> {error}
                    </div>
                )}

                {!tracking ? (
                    <div className="text-center py-8">
                        <MapPin className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400 mb-2">Bus location not available yet</p>
                        <p className="text-sm text-slate-500">The driver will start sharing location when the trip begins</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Map Placeholder with Coordinates */}
                        <div className="bg-slate-800 rounded-xl p-4 relative overflow-hidden">
                            <div className="h-48 flex flex-col items-center justify-center">
                                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-3 animate-pulse">
                                    <MapPin className="w-8 h-8 text-white" />
                                </div>
                                <p className="text-white font-medium">{tracking.bus.name}</p>
                                <p className="text-slate-400 text-sm">{tracking.bus.plateNumber}</p>
                                <button
                                    onClick={openInMaps}
                                    className="mt-3 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm flex items-center gap-2"
                                >
                                    <MapPin className="w-4 h-4" /> Open in Google Maps
                                </button>
                            </div>
                            <div className="absolute top-2 right-2 bg-black/50 px-2 py-1 rounded text-xs text-white">
                                {tracking.latitude.toFixed(4)}, {tracking.longitude.toFixed(4)}
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                                <p className="text-slate-400 text-xs mb-1">Speed</p>
                                <p className="text-white font-semibold">{tracking.speed ? `${tracking.speed} km/h` : '--'}</p>
                            </div>
                            <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                                <p className="text-slate-400 text-xs mb-1">Updated</p>
                                <p className="text-white font-semibold text-sm">{getTimeSinceUpdate()}</p>
                            </div>
                            <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                                <p className="text-slate-400 text-xs mb-1">Arrives</p>
                                <p className="text-white font-semibold">{formatTime(tracking.schedule.arrivalTime)}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-slate-500 text-xs">
                            <Clock className="w-4 h-4" />
                            <span>Last refreshed: {lastRefresh.toLocaleTimeString()}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
