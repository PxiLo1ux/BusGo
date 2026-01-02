import { useState, useEffect } from 'react';
import { Plus, Bus, Edit, Trash2, X, Loader2, AlertCircle, Calendar, Clock, MapPin, ToggleLeft, ToggleRight, ArrowLeftRight, RefreshCw, Timer, ChevronRight } from 'lucide-react';
import { driverApi } from '../../services/api';

interface BusData {
    id: string;
    name: string;
    plateNumber: string;
    capacity: number;
}

interface RouteData {
    id: string;
    origin: string;
    destination: string;
    baseFare: number;
    estimatedTime: number;
}

interface DailyScheduleData {
    id: string;
    busId: string;
    routeId: string;
    departureTime: string;
    arrivalTime: string;
    price: number;
    isActive: boolean;
    isReturnTrip: boolean;
    bus: { name: string; plateNumber: string };
    route: { origin: string; destination: string };
}

interface UpcomingSchedule {
    id: string;
    departureTime: string;
    arrivalTime: string;
    price: number;
    delayMinutes?: number;
    bus: { name: string; plateNumber: string };
    route: { origin: string; destination: string };
    _count: { bookings: number };
}

export default function Scheduling() {
    const [activeTab, setActiveTab] = useState<'daily' | 'upcoming'>('daily');
    const [dailySchedules, setDailySchedules] = useState<DailyScheduleData[]>([]);
    const [upcomingSchedules, setUpcomingSchedules] = useState<UpcomingSchedule[]>([]);
    const [buses, setBuses] = useState<BusData[]>([]);
    const [routes, setRoutes] = useState<RouteData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<DailyScheduleData | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [filterBus, setFilterBus] = useState('all');
    const [isGenerating, setIsGenerating] = useState(false);

    // Delay modal state
    const [delayModal, setDelayModal] = useState<UpcomingSchedule | null>(null);
    const [delayMinutes, setDelayMinutes] = useState(30);
    const [delayReason, setDelayReason] = useState('');

    const [formData, setFormData] = useState({
        busId: '',
        routeId: '',
        departureTime: '06:00',
        price: 800,
        isReturnTrip: false
    });

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [schedulesRes, busesRes, routesRes] = await Promise.all([
                driverApi.getDailySchedules(),
                driverApi.getBuses(),
                driverApi.getRoutes()
            ]);
            setDailySchedules(schedulesRes.data.dailySchedules || []);
            setBuses(busesRes.data.buses || []);
            setRoutes(routesRes.data.routes || []);

            if (schedulesRes.data.migrationNeeded) {
                setError('Database migration required. Please run: npx prisma migrate dev');
            }
        } catch (err: any) {
            console.error('Failed to load data:', err);
            setError(err.response?.data?.message || 'Failed to load schedules.');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUpcoming = async () => {
        try {
            const res = await driverApi.getUpcomingSchedules();
            setUpcomingSchedules(res.data.schedules || []);
        } catch (err: any) {
            console.error('Failed to load upcoming:', err);
        }
    };

    useEffect(() => {
        fetchData();
        fetchUpcoming();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.busId || !formData.routeId) {
            setError('Please select a bus and route');
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            const route = routes.find(r => r.id === formData.routeId);
            const [depHour, depMin] = formData.departureTime.split(':').map(Number);
            const arrivalMinutes = depHour * 60 + depMin + (route?.estimatedTime || 360);
            const arrHour = Math.floor(arrivalMinutes / 60) % 24;
            const arrMin = arrivalMinutes % 60;
            const arrivalTime = `${String(arrHour).padStart(2, '0')}:${String(arrMin).padStart(2, '0')}`;

            const payload = { busId: formData.busId, routeId: formData.routeId, departureTime: formData.departureTime, arrivalTime, price: formData.price, isReturnTrip: formData.isReturnTrip };

            if (editingSchedule) {
                await driverApi.updateDailySchedule(editingSchedule.id, payload);
            } else {
                await driverApi.createDailySchedule(payload);
            }
            await fetchData();
            setIsModalOpen(false);
            resetForm();
            setSuccess('Schedule saved!');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to save schedule');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleActive = async (schedule: DailyScheduleData) => {
        try {
            await driverApi.toggleDailySchedule(schedule.id);
            setDailySchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, isActive: !s.isActive } : s));
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to toggle schedule');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await driverApi.deleteDailySchedule(id);
            setDailySchedules(prev => prev.filter(s => s.id !== id));
            setDeleteConfirm(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to delete');
        }
    };

    const handleGenerateSchedules = async () => {
        setIsGenerating(true);
        setError(null);
        try {
            const res = await driverApi.generateSchedules();
            setSuccess(res.data.message || 'Schedules generated!');
            await fetchUpcoming();
            setTimeout(() => setSuccess(null), 5000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to generate schedules');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDelay = async () => {
        if (!delayModal) return;
        setIsSubmitting(true);
        try {
            await driverApi.delaySchedule(delayModal.id, { delayMinutes, reason: delayReason });
            setSuccess(`Delayed by ${delayMinutes} minutes. Passengers notified!`);
            setDelayModal(null);
            setDelayMinutes(30);
            setDelayReason('');
            await fetchUpcoming();
            setTimeout(() => setSuccess(null), 5000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to delay schedule');
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({ busId: '', routeId: '', departureTime: '06:00', price: 800, isReturnTrip: false });
        setEditingSchedule(null);
    };

    const openAddModal = () => { resetForm(); setIsModalOpen(true); };

    const openEditModal = (schedule: DailyScheduleData) => {
        setEditingSchedule(schedule);
        setFormData({ busId: schedule.busId, routeId: schedule.routeId, departureTime: schedule.departureTime, price: schedule.price, isReturnTrip: schedule.isReturnTrip });
        setIsModalOpen(true);
    };

    const handleRouteChange = (routeId: string) => {
        const route = routes.find(r => r.id === routeId);
        setFormData({ ...formData, routeId, price: route?.baseFare || formData.price });
    };

    const filteredSchedules = filterBus === 'all' ? dailySchedules : dailySchedules.filter(s => s.busId === filterBus);

    const groupedSchedules = filteredSchedules.reduce((acc, s) => {
        const key = s.busId;
        if (!acc[key]) acc[key] = { bus: s.bus, schedules: [] };
        acc[key].schedules.push(s);
        return acc;
    }, {} as Record<string, { bus: { name: string; plateNumber: string }; schedules: DailyScheduleData[] }>);

    // Group upcoming by date
    const groupedUpcoming = upcomingSchedules.reduce((acc, s) => {
        const date = new Date(s.departureTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        if (!acc[date]) acc[date] = [];
        acc[date].push(s);
        return acc;
    }, {} as Record<string, UpcomingSchedule[]>);

    const formatTime = (dt: string) => new Date(dt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    if (isLoading) {
        return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary-500 animate-spin" /></div>;
    }

    return (
        <div className="space-y-4 min-w-0">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-display font-bold text-white">Schedules</h1>
                    <p className="text-slate-400 text-sm">Manage daily templates and upcoming trips.</p>
                </div>
                <div className="flex gap-2">
                    {activeTab === 'daily' && (
                        <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl text-sm">
                            <Plus className="w-4 h-4" /> Add
                        </button>
                    )}
                    {activeTab === 'upcoming' && (
                        <button onClick={handleGenerateSchedules} disabled={isGenerating} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-xl text-sm disabled:opacity-50">
                            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            Generate 30 Days
                        </button>
                    )}
                </div>
            </div>

            {/* Messages */}
            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4" /> {error}
                    <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
                </div>
            )}
            {success && (
                <div className="p-3 bg-green-500/10 border border-green-500/50 rounded-xl text-green-400 flex items-center gap-2 text-sm">
                    ✓ {success}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-800/50 rounded-xl p-1">
                <button onClick={() => setActiveTab('daily')} className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'daily' ? 'bg-primary-500 text-white' : 'text-slate-400 hover:text-white'}`}>
                    <Calendar className="w-4 h-4 inline mr-2" />Daily Templates
                </button>
                <button onClick={() => setActiveTab('upcoming')} className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'upcoming' ? 'bg-primary-500 text-white' : 'text-slate-400 hover:text-white'}`}>
                    <Clock className="w-4 h-4 inline mr-2" />Upcoming ({upcomingSchedules.length})
                </button>
            </div>

            {/* DAILY TEMPLATES TAB */}
            {activeTab === 'daily' && (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-2">
                        <div className="glass rounded-lg p-2 text-center">
                            <p className="text-lg font-bold text-white">{dailySchedules.length}</p>
                            <p className="text-slate-400 text-xs">Total</p>
                        </div>
                        <div className="glass rounded-lg p-2 text-center">
                            <p className="text-lg font-bold text-green-400">{dailySchedules.filter(s => s.isActive).length}</p>
                            <p className="text-slate-400 text-xs">Active</p>
                        </div>
                        <div className="glass rounded-lg p-2 text-center">
                            <p className="text-lg font-bold text-slate-400">{dailySchedules.filter(s => !s.isActive).length}</p>
                            <p className="text-slate-400 text-xs">Inactive</p>
                        </div>
                        <div className="glass rounded-lg p-2 text-center">
                            <p className="text-lg font-bold text-primary-400">{buses.length}</p>
                            <p className="text-slate-400 text-xs">Buses</p>
                        </div>
                    </div>

                    {/* Bus Filter */}
                    {buses.length > 1 && (
                        <div className="flex gap-1.5 overflow-x-auto pb-1">
                            <button onClick={() => setFilterBus('all')} className={`px-3 py-1.5 rounded-lg text-sm ${filterBus === 'all' ? 'bg-primary-500 text-white' : 'bg-slate-800 text-slate-400'}`}>All</button>
                            {buses.map(bus => (
                                <button key={bus.id} onClick={() => setFilterBus(bus.id)} className={`px-3 py-1.5 rounded-lg text-sm truncate max-w-[100px] ${filterBus === bus.id ? 'bg-primary-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                    {bus.name.split(' ').slice(0, 2).join(' ')}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Daily Schedules List */}
                    {Object.keys(groupedSchedules).length === 0 ? (
                        <div className="glass rounded-xl p-8 text-center">
                            <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                            <p className="text-white font-medium mb-2">No Daily Schedules</p>
                            <p className="text-slate-400 text-sm mb-4">Create templates for your daily trips</p>
                            <button onClick={openAddModal} className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm">Add First Schedule</button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {Object.entries(groupedSchedules).map(([busId, { bus, schedules }]) => (
                                <div key={busId} className="glass rounded-xl overflow-hidden">
                                    <div className="px-3 py-2 bg-slate-800/50 border-b border-white/10 flex items-center gap-2">
                                        <Bus className="w-4 h-4 text-primary-400" />
                                        <span className="text-white font-medium text-sm truncate flex-1">{bus.name}</span>
                                        <span className="text-slate-500 text-xs">{schedules.length}</span>
                                    </div>
                                    <div className="divide-y divide-white/5">
                                        {schedules.sort((a, b) => a.departureTime.localeCompare(b.departureTime)).map(s => (
                                            <div key={s.id} className={`px-3 py-2 flex items-center gap-2 ${!s.isActive ? 'opacity-50' : ''}`}>
                                                <div className="min-w-[45px] text-center">
                                                    <p className="text-sm font-bold text-white">{s.departureTime}</p>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white text-sm truncate">{s.route.origin} → {s.route.destination}</p>
                                                    <p className="text-slate-500 text-xs">Rs.{s.price}</p>
                                                </div>
                                                <button onClick={() => handleToggleActive(s)}>
                                                    {s.isActive ? <ToggleRight className="w-5 h-5 text-green-400" /> : <ToggleLeft className="w-5 h-5 text-slate-500" />}
                                                </button>
                                                <button onClick={() => openEditModal(s)} className="p-1 text-slate-400 hover:text-white"><Edit className="w-3.5 h-3.5" /></button>
                                                <button onClick={() => setDeleteConfirm(s.id)} className="p-1 text-slate-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* UPCOMING TRIPS TAB */}
            {activeTab === 'upcoming' && (
                <>
                    {upcomingSchedules.length === 0 ? (
                        <div className="glass rounded-xl p-8 text-center">
                            <Clock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                            <p className="text-white font-medium mb-2">No Upcoming Trips</p>
                            <p className="text-slate-400 text-sm mb-4">Generate schedules from your daily templates</p>
                            <button onClick={handleGenerateSchedules} disabled={isGenerating} className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm disabled:opacity-50">
                                {isGenerating ? 'Generating...' : 'Generate 30 Days'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {Object.entries(groupedUpcoming).map(([date, schedules]) => (
                                <div key={date}>
                                    <h3 className="text-sm font-medium text-slate-400 mb-2">{date}</h3>
                                    <div className="space-y-2">
                                        {schedules.map(s => (
                                            <div key={s.id} className="glass rounded-xl px-3 py-2 flex items-center gap-3">
                                                <div className="min-w-[50px] text-center">
                                                    <p className="text-sm font-bold text-white">{formatTime(s.departureTime)}</p>
                                                    {s.delayMinutes ? <p className="text-[10px] text-orange-400">+{s.delayMinutes}min</p> : null}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white text-sm truncate">{s.route.origin} → {s.route.destination}</p>
                                                    <p className="text-slate-500 text-xs">{s.bus.name} • {s._count.bookings} bookings</p>
                                                </div>
                                                <button onClick={() => setDelayModal(s)} className="p-2 text-slate-400 hover:text-orange-400 rounded-lg hover:bg-white/5" title="Delay">
                                                    <Timer className="w-4 h-4" />
                                                </button>
                                                <ChevronRight className="w-4 h-4 text-slate-600" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm">
                        <h3 className="text-lg font-semibold text-white mb-2">Delete Schedule?</h3>
                        <p className="text-slate-400 text-sm mb-6">This will remove the daily template.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg">Cancel</button>
                            <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delay Modal */}
            {delayModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm">
                        <h3 className="text-lg font-semibold text-white mb-2">Delay Trip</h3>
                        <p className="text-slate-400 text-sm mb-4">{delayModal.route.origin} → {delayModal.route.destination} at {formatTime(delayModal.departureTime)}</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-300 mb-2">Delay Duration</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[30, 60, 120, 180].map(min => (
                                        <button key={min} onClick={() => setDelayMinutes(min)} className={`py-2 rounded-lg text-sm ${delayMinutes === min ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                                            {min < 60 ? `${min}m` : `${min / 60}h`}
                                        </button>
                                    ))}
                                </div>
                                <input type="number" value={delayMinutes} onChange={(e) => setDelayMinutes(Math.min(360, Math.max(0, parseInt(e.target.value) || 0)))}
                                    className="w-full mt-2 px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-white text-sm" placeholder="Custom minutes (max 360)" />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-300 mb-2">Reason (optional)</label>
                                <input type="text" value={delayReason} onChange={(e) => setDelayReason(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-white text-sm" placeholder="e.g., Traffic delay" />
                            </div>
                            {delayMinutes >= 120 && (
                                <p className="text-yellow-400 text-xs">⚠️ Delay ≥2 hours: Passengers can cancel with refund</p>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setDelayModal(null)} className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg">Cancel</button>
                            <button onClick={handleDelay} disabled={isSubmitting} className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg disabled:opacity-50">
                                {isSubmitting ? 'Delaying...' : `Delay ${delayMinutes}m`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Daily Schedule Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-4 border-b border-white/10 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-white">{editingSchedule ? 'Edit' : 'Add'} Daily Schedule</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">Bus *</label>
                                <select value={formData.busId} onChange={(e) => setFormData({ ...formData, busId: e.target.value })} required
                                    className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-white text-sm">
                                    <option value="">Select bus...</option>
                                    {buses.map(bus => <option key={bus.id} value={bus.id}>{bus.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">Route *</label>
                                <select value={formData.routeId} onChange={(e) => handleRouteChange(e.target.value)} required
                                    className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-white text-sm">
                                    <option value="">Select route...</option>
                                    {routes.map(r => <option key={r.id} value={r.id}>{r.origin} → {r.destination}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-300 mb-1">Departure *</label>
                                    <input type="time" value={formData.departureTime} onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })} required
                                        className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-white text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-300 mb-1">Price (Rs.) *</label>
                                    <input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })} required min="100"
                                        className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-white text-sm" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <ArrowLeftRight className="w-4 h-4 text-blue-400" />
                                    <span className="text-sm text-white">Return Trip</span>
                                </div>
                                <button type="button" onClick={() => setFormData({ ...formData, isReturnTrip: !formData.isReturnTrip })}>
                                    {formData.isReturnTrip ? <ToggleRight className="w-8 h-8 text-blue-400" /> : <ToggleLeft className="w-8 h-8 text-slate-500" />}
                                </button>
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg disabled:opacity-50">
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : editingSchedule ? 'Save' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
