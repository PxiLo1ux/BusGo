import { useState, useEffect, useMemo } from 'react';
import { Plus, MapPin, Edit, Trash2, X, Clock, DollarSign, Route, Loader2, AlertCircle, Navigation } from 'lucide-react';
import { driverApi } from '../../services/api';
import { getDistrictByName, getDistrictNames, calculateDistance, estimateTravelTime, calculateBaseFare } from '../../data/districts';

interface RouteData {
    id: string;
    origin: string;
    destination: string;
    distance: number;
    estimatedTime: number;
    baseFare: number;
    waypoints: string[];
    originLat?: number;
    originLng?: number;
    destinationLat?: number;
    destinationLng?: number;
}

export default function RouteManagement() {
    const [routes, setRoutes] = useState<RouteData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRoute, setEditingRoute] = useState<RouteData | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        origin: '', destination: '', distance: 0, estimatedTime: 0, baseFare: 0, waypoints: [''],
        originLat: 0, originLng: 0, destinationLat: 0, destinationLng: 0
    });

    const districtNames = useMemo(() => getDistrictNames(), []);

    const fetchRoutes = async () => {
        try {
            setIsLoading(true);
            const response = await driverApi.getRoutes();
            setRoutes(response.data.routes || []);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load routes');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchRoutes(); }, []);

    // Auto-calculate distance, time, and fare when origin/destination changes
    useEffect(() => {
        if (formData.origin && formData.destination && formData.origin !== formData.destination) {
            const originDistrict = getDistrictByName(formData.origin);
            const destDistrict = getDistrictByName(formData.destination);

            if (originDistrict && destDistrict) {
                const distance = calculateDistance(originDistrict.lat, originDistrict.lng, destDistrict.lat, destDistrict.lng);
                const time = estimateTravelTime(distance);
                const fare = calculateBaseFare(distance);

                setFormData(prev => ({
                    ...prev,
                    distance,
                    estimatedTime: time,
                    baseFare: fare,
                    originLat: originDistrict.lat,
                    originLng: originDistrict.lng,
                    destinationLat: destDistrict.lat,
                    destinationLng: destDistrict.lng
                }));
            }
        }
    }, [formData.origin, formData.destination]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        const cleanWaypoints = formData.waypoints.filter(w => w.trim() !== '');
        const data = { ...formData, waypoints: cleanWaypoints };

        try {
            if (editingRoute) {
                await driverApi.updateRoute(editingRoute.id, data);
            } else {
                await driverApi.addRoute(data);
            }
            await fetchRoutes();
            setIsModalOpen(false);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to save route');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await driverApi.deleteRoute(id);
            await fetchRoutes();
            setDeleteConfirm(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to delete route');
        }
    };

    const openAddModal = () => {
        setFormData({ origin: '', destination: '', distance: 0, estimatedTime: 0, baseFare: 0, waypoints: [''], originLat: 0, originLng: 0, destinationLat: 0, destinationLng: 0 });
        setEditingRoute(null);
        setIsModalOpen(true);
    };

    const openEditModal = (route: RouteData) => {
        setFormData({
            origin: route.origin,
            destination: route.destination,
            distance: route.distance,
            estimatedTime: route.estimatedTime,
            baseFare: route.baseFare,
            waypoints: route.waypoints.length > 0 ? route.waypoints : [''],
            originLat: route.originLat || 0,
            originLng: route.originLng || 0,
            destinationLat: route.destinationLat || 0,
            destinationLng: route.destinationLng || 0
        });
        setEditingRoute(route);
        setIsModalOpen(true);
    };

    const addWaypoint = () => setFormData(p => ({ ...p, waypoints: [...p.waypoints, ''] }));
    const updateWaypoint = (i: number, v: string) => setFormData(p => ({ ...p, waypoints: p.waypoints.map((w, idx) => idx === i ? v : w) }));
    const removeWaypoint = (i: number) => setFormData(p => ({ ...p, waypoints: p.waypoints.filter((_, idx) => idx !== i) }));
    const formatTime = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`;

    if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary-500 animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-white mb-1">My Routes</h1>
                    <p className="text-slate-400">Define travel routes with auto-calculated distance & time</p>
                </div>
                <button onClick={openAddModal} className="px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl btn-glow flex items-center gap-2">
                    <Plus className="w-5 h-5" /> Add New Route
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" /> {error}
                </div>
            )}

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {routes.map((route) => (
                    <div key={route.id} className="glass rounded-2xl p-6 hover:border-primary-500/50 border border-transparent transition-all">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                                <Route className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-white">{route.origin}</h3>
                                <div className="flex items-center text-slate-400 text-sm">
                                    <Navigation className="w-3 h-3 mr-1" />
                                    <span>{route.destination}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 mb-4">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-400 text-sm flex items-center gap-1"><MapPin className="w-4 h-4" /> Distance</span>
                                <span className="text-white font-medium">{route.distance} km</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-400 text-sm flex items-center gap-1"><Clock className="w-4 h-4" /> Est. Time</span>
                                <span className="text-white font-medium">{formatTime(route.estimatedTime)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-400 text-sm flex items-center gap-1"><DollarSign className="w-4 h-4" /> Base Fare</span>
                                <span className="text-green-400 font-medium">Rs. {route.baseFare}</span>
                            </div>
                        </div>

                        {route.waypoints.length > 0 && (
                            <div className="mb-4">
                                <p className="text-xs text-slate-500 mb-1">Waypoints:</p>
                                <div className="flex flex-wrap gap-1">
                                    {route.waypoints.map((wp, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-xs">{wp}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2 pt-4 border-t border-white/10">
                            <button onClick={() => openEditModal(route)} className="flex-1 px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                                <Edit className="w-4 h-4" /> Edit
                            </button>
                            {deleteConfirm === route.id ? (
                                <div className="flex gap-2">
                                    <button onClick={() => handleDelete(route.id)} className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm">Confirm</button>
                                    <button onClick={() => setDeleteConfirm(null)} className="px-3 py-2 bg-slate-700 text-white rounded-lg text-sm">Cancel</button>
                                </div>
                            ) : (
                                <button onClick={() => setDeleteConfirm(route.id)} className="px-3 py-2 bg-red-500/10 text-red-400 rounded-lg">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                <button onClick={openAddModal} className="glass rounded-2xl p-6 border-2 border-dashed border-white/20 hover:border-primary-500/50 transition-all flex flex-col items-center justify-center min-h-[280px] group">
                    <div className="w-16 h-16 bg-white/5 group-hover:bg-primary-500/20 rounded-2xl flex items-center justify-center mb-4">
                        <Plus className="w-8 h-8 text-slate-400 group-hover:text-primary-400" />
                    </div>
                    <p className="text-slate-400 group-hover:text-white font-medium">Add New Route</p>
                </button>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-white">{editingRoute ? 'Edit Route' : 'Add New Route'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {/* Origin & Destination */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Origin</label>
                                    <select
                                        value={formData.origin}
                                        onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                                        required
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white appearance-none"
                                    >
                                        <option value="">Select origin</option>
                                        {districtNames.map(name => (
                                            <option key={name} value={name}>{name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Destination</label>
                                    <select
                                        value={formData.destination}
                                        onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                                        required
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white appearance-none"
                                    >
                                        <option value="">Select destination</option>
                                        {districtNames.filter(n => n !== formData.origin).map(name => (
                                            <option key={name} value={name}>{name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Auto-calculated values */}
                            {formData.distance > 0 && (
                                <div className="p-4 bg-primary-500/10 border border-primary-500/30 rounded-xl">
                                    <p className="text-xs text-primary-400 mb-2 flex items-center gap-1">
                                        <Navigation className="w-3 h-3" /> Auto-calculated (you can adjust):
                                    </p>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">Distance (km)</label>
                                            <input
                                                type="number"
                                                value={formData.distance}
                                                onChange={(e) => setFormData({ ...formData, distance: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">Time (mins)</label>
                                            <input
                                                type="number"
                                                value={formData.estimatedTime}
                                                onChange={(e) => setFormData({ ...formData, estimatedTime: parseInt(e.target.value) || 0 })}
                                                className="w-full px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">Base Fare (Rs.)</label>
                                            <input
                                                type="number"
                                                value={formData.baseFare}
                                                onChange={(e) => setFormData({ ...formData, baseFare: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Waypoints */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Waypoints (Optional)</label>
                                {formData.waypoints.map((wp, i) => (
                                    <div key={i} className="flex gap-2 mb-2">
                                        <select
                                            value={wp}
                                            onChange={(e) => updateWaypoint(i, e.target.value)}
                                            className="flex-1 px-4 py-2 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm appearance-none"
                                        >
                                            <option value="">Select waypoint</option>
                                            {districtNames.filter(n => n !== formData.origin && n !== formData.destination).map(name => (
                                                <option key={name} value={name}>{name}</option>
                                            ))}
                                        </select>
                                        {formData.waypoints.length > 1 && (
                                            <button type="button" onClick={() => removeWaypoint(i)} className="px-3 py-2 bg-red-500/10 text-red-400 rounded-xl">
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button type="button" onClick={addWaypoint} className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">
                                    <Plus className="w-4 h-4" /> Add Waypoint
                                </button>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 bg-slate-700 text-white font-medium rounded-xl">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl btn-glow disabled:opacity-50 flex items-center justify-center gap-2">
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : editingRoute ? 'Save Changes' : 'Create Route'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
