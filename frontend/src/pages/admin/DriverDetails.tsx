import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, User, Mail, Phone, Bus, Calendar, Star, DollarSign, Ticket, CheckCircle, Clock, XCircle, Loader2, MessageSquare, BarChart2, MapPin, Users, TrendingUp, Award } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { adminApi } from '../../services/api';

const COLORS = ['#d946ef', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

interface DriverDetails {
    driver: {
        id: string;
        name: string;
        email: string;
        phone: string;
        licenseNumber: string;
        status: string;
        rating: number;
        totalReviews: number;
        createdAt: string;
    };
    buses: Array<{
        id: string;
        name: string;
        plateNumber: string;
        type: string;
        capacity: number;
        approved: boolean;
        rating: number;
        amenities: string[];
        schedulesCount: number;
    }>;
    recentBookings: Array<{
        id: string;
        passengerName: string;
        passengerEmail: string;
        route: string;
        date: string;
        amount: number;
        status: string;
        seats: string[];
    }>;
    ratings: Array<{
        id: string;
        userName: string;
        rating: number;
        comment: string;
        route: string;
        createdAt: string;
    }>;
    analytics: {
        totalBookings: number;
        totalRevenue: number;
        totalTrips: number;
        avgRating: number;
        busCount: number;
        approvedBuses: number;
    };
}

export default function DriverDetails() {
    const { driverId } = useParams<{ driverId: string }>();
    const [data, setData] = useState<DriverDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'buses' | 'bookings' | 'reviews' | 'analytics'>('overview');
    const [analyticsData, setAnalyticsData] = useState<any>(null);
    const [loadingAnalytics, setLoadingAnalytics] = useState(false);

    useEffect(() => {
        if (driverId) fetchDriverDetails();
    }, [driverId]);

    const fetchDriverDetails = async () => {
        try {
            setIsLoading(true);
            const res = await adminApi.getDriverDetails(driverId!);
            setData(res.data);
        } catch (error) {
            console.error('Failed to fetch driver details', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED': return <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Approved</span>;
            case 'PENDING': return <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-lg text-sm flex items-center gap-1"><Clock className="w-4 h-4" /> Pending</span>;
            default: return <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm flex items-center gap-1"><XCircle className="w-4 h-4" /> Rejected</span>;
        }
    };

    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    if (isLoading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-primary-500 animate-spin" /></div>;
    }

    if (!data) {
        return (
            <div className="text-center py-20">
                <User className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">Driver not found</h2>
                <Link to="/admin/drivers" className="text-primary-400 hover:text-primary-300">Back to drivers</Link>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link to="/admin/drivers" className="p-2 glass rounded-xl hover:bg-white/10 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-white" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-display font-bold text-white">{data.driver.name}</h1>
                    <p className="text-slate-400">Driver Details & Analytics</p>
                </div>
                {getStatusBadge(data.driver.status)}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="glass rounded-2xl p-5">
                    <DollarSign className="w-8 h-8 text-green-400 mb-2" />
                    <p className="text-2xl font-bold text-white">Rs. {data.analytics.totalRevenue.toLocaleString()}</p>
                    <p className="text-slate-400 text-sm">Total Revenue</p>
                </div>
                <div className="glass rounded-2xl p-5">
                    <Ticket className="w-8 h-8 text-primary-400 mb-2" />
                    <p className="text-2xl font-bold text-white">{data.analytics.totalBookings}</p>
                    <p className="text-slate-400 text-sm">Total Bookings</p>
                </div>
                <div className="glass rounded-2xl p-5">
                    <Bus className="w-8 h-8 text-secondary-400 mb-2" />
                    <p className="text-2xl font-bold text-white">{data.analytics.approvedBuses}/{data.analytics.busCount}</p>
                    <p className="text-slate-400 text-sm">Buses Approved</p>
                </div>
                <div className="glass rounded-2xl p-5">
                    <Star className="w-8 h-8 text-amber-400 mb-2" />
                    <p className="text-2xl font-bold text-white">{data.analytics.avgRating?.toFixed(1) || '0.0'}</p>
                    <p className="text-slate-400 text-sm">{data.driver.totalReviews} Reviews</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-white/10 pb-4 overflow-x-auto">
                {(['overview', 'buses', 'bookings', 'reviews', 'analytics'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={async () => {
                            setActiveTab(tab);
                            if (tab === 'analytics' && !analyticsData) {
                                setLoadingAnalytics(true);
                                try {
                                    const res = await adminApi.getDriverAnalytics(driverId!);
                                    setAnalyticsData(res.data);
                                } catch (err) { console.error('Failed to load analytics', err); }
                                finally { setLoadingAnalytics(false); }
                            }
                        }}
                        className={`px-4 py-2 rounded-xl font-medium capitalize transition-colors whitespace-nowrap ${activeTab === tab ? 'bg-primary-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        {tab === 'analytics' && <BarChart2 className="w-4 h-4 inline mr-1" />}
                        {tab}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Driver Info */}
                    <div className="glass rounded-2xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Driver Information</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Mail className="w-5 h-5 text-slate-500" />
                                <div>
                                    <p className="text-slate-400 text-sm">Email</p>
                                    <p className="text-white">{data.driver.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Phone className="w-5 h-5 text-slate-500" />
                                <div>
                                    <p className="text-slate-400 text-sm">Phone</p>
                                    <p className="text-white">{data.driver.phone || 'Not provided'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <User className="w-5 h-5 text-slate-500" />
                                <div>
                                    <p className="text-slate-400 text-sm">License Number</p>
                                    <p className="text-white">{data.driver.licenseNumber}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Calendar className="w-5 h-5 text-slate-500" />
                                <div>
                                    <p className="text-slate-400 text-sm">Joined</p>
                                    <p className="text-white">{formatDate(data.driver.createdAt)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Ratings */}
                    <div className="glass rounded-2xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-amber-400" />
                            Recent Reviews
                        </h3>
                        {data.ratings.length === 0 ? (
                            <p className="text-slate-400 text-center py-8">No reviews yet</p>
                        ) : (
                            <div className="space-y-3">
                                {data.ratings.slice(0, 4).map(r => (
                                    <div key={r.id} className="p-3 bg-slate-900/50 rounded-xl">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-white font-medium">{r.userName}</span>
                                            <div className="flex items-center gap-1">
                                                {[1, 2, 3, 4, 5].map(s => (
                                                    <Star key={s} className={`w-3 h-3 ${s <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
                                                ))}
                                            </div>
                                        </div>
                                        {r.comment && <p className="text-slate-400 text-sm">{r.comment}</p>}
                                        <p className="text-slate-500 text-xs mt-1">{r.route} • {formatDate(r.createdAt)}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'buses' && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.buses.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-slate-400">
                            <Bus className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            No buses registered
                        </div>
                    ) : (
                        data.buses.map(bus => (
                            <div key={bus.id} className="glass rounded-2xl p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h4 className="text-white font-semibold">{bus.name}</h4>
                                        <p className="text-slate-400 text-sm">{bus.plateNumber}</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${bus.approved ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                        {bus.approved ? 'Approved' : 'Pending'}
                                    </span>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between text-slate-400">
                                        <span>Type:</span><span className="text-white">{bus.type}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-400">
                                        <span>Capacity:</span><span className="text-white">{bus.capacity} seats</span>
                                    </div>
                                    <div className="flex justify-between text-slate-400">
                                        <span>Rating:</span>
                                        <span className="text-white flex items-center gap-1">
                                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />{bus.rating?.toFixed(1) || '0.0'}
                                        </span>
                                    </div>
                                </div>
                                {bus.amenities.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-3">
                                        {bus.amenities.slice(0, 3).map((a, i) => (
                                            <span key={i} className="px-2 py-0.5 bg-primary-500/20 text-primary-400 rounded text-xs">{a}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {activeTab === 'bookings' && (
                <div className="glass rounded-2xl overflow-hidden">
                    {data.recentBookings.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <Ticket className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            No bookings yet
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-slate-800/50">
                                <tr>
                                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Passenger</th>
                                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Route</th>
                                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Date</th>
                                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Seats</th>
                                    <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">Amount</th>
                                    <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.recentBookings.map(b => (
                                    <tr key={b.id} className="border-t border-white/5 hover:bg-white/5">
                                        <td className="py-3 px-4">
                                            <p className="text-white font-medium">{b.passengerName}</p>
                                            <p className="text-slate-500 text-xs">{b.passengerEmail}</p>
                                        </td>
                                        <td className="py-3 px-4 text-slate-300">{b.route}</td>
                                        <td className="py-3 px-4 text-slate-400">{formatDate(b.date)}</td>
                                        <td className="py-3 px-4 text-slate-400">{b.seats.join(', ')}</td>
                                        <td className="py-3 px-4 text-right text-white font-medium">Rs. {b.amount.toLocaleString()}</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${b.status === 'CONFIRMED' ? 'bg-green-500/20 text-green-400' : b.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {b.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {activeTab === 'reviews' && (
                <div className="space-y-4">
                    {data.ratings.length === 0 ? (
                        <div className="glass rounded-2xl text-center py-12 text-slate-400">
                            <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            No reviews yet
                        </div>
                    ) : (
                        data.ratings.map(r => (
                            <div key={r.id} className="glass rounded-2xl p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white font-bold">
                                            {r.userName.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">{r.userName}</p>
                                            <p className="text-slate-500 text-sm">{r.route}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-0.5">
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <Star key={s} className={`w-4 h-4 ${s <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
                                            ))}
                                        </div>
                                        <span className="text-slate-400 text-sm">{formatDate(r.createdAt)}</span>
                                    </div>
                                </div>
                                {r.comment && <p className="text-slate-300">"{r.comment}"</p>}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
                <div>
                    {loadingAnalytics ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                        </div>
                    ) : !analyticsData ? (
                        <div className="text-center py-12 text-slate-400">
                            <BarChart2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p>Failed to load analytics</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="glass rounded-2xl p-4">
                                    <TrendingUp className="w-6 h-6 text-green-400 mb-2" />
                                    <p className="text-xl font-bold text-white">Rs. {analyticsData.summary.totalEarnings.toLocaleString()}</p>
                                    <p className="text-slate-400 text-sm">Total Earnings</p>
                                </div>
                                <div className="glass rounded-2xl p-4">
                                    <Ticket className="w-6 h-6 text-primary-400 mb-2" />
                                    <p className="text-xl font-bold text-white">{analyticsData.summary.totalBookings}</p>
                                    <p className="text-slate-400 text-sm">Bookings</p>
                                </div>
                                <div className="glass rounded-2xl p-4">
                                    <MapPin className="w-6 h-6 text-secondary-400 mb-2" />
                                    <p className="text-xl font-bold text-white">{analyticsData.summary.routeCount}</p>
                                    <p className="text-slate-400 text-sm">Routes</p>
                                </div>
                                <div className="glass rounded-2xl p-4">
                                    <Users className="w-6 h-6 text-amber-400 mb-2" />
                                    <p className="text-xl font-bold text-white">{analyticsData.summary.passengerCount}</p>
                                    <p className="text-slate-400 text-sm">Passengers</p>
                                </div>
                            </div>

                            {/* Charts */}
                            <div className="grid lg:grid-cols-2 gap-6">
                                {/* Monthly Earnings */}
                                <div className="glass rounded-2xl p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">Monthly Earnings</h3>
                                    <ResponsiveContainer width="100%" height={200}>
                                        <LineChart data={analyticsData.monthlyEarnings}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                            <XAxis dataKey="month" stroke="#94a3b8" />
                                            <YAxis stroke="#94a3b8" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                                            <Line type="monotone" dataKey="earnings" stroke="#d946ef" strokeWidth={3} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Bus Earnings Pie */}
                                <div className="glass rounded-2xl p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">Bus Earnings Distribution</h3>
                                    {analyticsData.busEarnings.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={200}>
                                            <PieChart>
                                                <Pie data={analyticsData.busEarnings} dataKey="totalEarnings" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                                    {analyticsData.busEarnings.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                </Pie>
                                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : <p className="text-center py-8 text-slate-400">No bus data</p>}
                                </div>
                            </div>

                            {/* Popular Routes Table */}
                            <div className="glass rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">Popular Routes</h3>
                                {analyticsData.popularRoutes.length === 0 ? (
                                    <p className="text-center py-8 text-slate-400">No route data</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead><tr className="border-b border-white/10">
                                                <th className="text-left py-2 text-slate-400 text-sm">Route</th>
                                                <th className="text-left py-2 text-slate-400 text-sm">Revenue</th>
                                                <th className="text-left py-2 text-slate-400 text-sm">Bookings</th>
                                                <th className="text-left py-2 text-slate-400 text-sm">Trips</th>
                                            </tr></thead>
                                            <tbody>
                                                {analyticsData.popularRoutes.slice(0, 5).map((r: any) => (
                                                    <tr key={r.routeId} className="border-b border-white/5">
                                                        <td className="py-3 text-white">{r.origin} → {r.destination}</td>
                                                        <td className="py-3 text-white font-medium">Rs. {r.revenue.toLocaleString()}</td>
                                                        <td className="py-3 text-slate-300">{r.bookings}</td>
                                                        <td className="py-3 text-slate-300">{r.trips}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Top Passengers */}
                            <div className="glass rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4"><Award className="w-5 h-5 inline mr-2 text-amber-400" />Top Passengers</h3>
                                {analyticsData.topPassengers.length === 0 ? (
                                    <p className="text-center py-8 text-slate-400">No passenger data</p>
                                ) : (
                                    <div className="space-y-3">
                                        {analyticsData.topPassengers.slice(0, 5).map((p: any, i: number) => (
                                            <div key={p.userId} className="flex items-center gap-4 p-3 bg-slate-900/50 rounded-xl">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${i === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white' : i === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-white' : i === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                                                    {i + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white font-medium">{p.name}</p>
                                                    <p className="text-slate-400 text-sm truncate">{p.email}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-white font-bold">Rs. {p.totalSpent.toLocaleString()}</p>
                                                    <p className="text-slate-400 text-sm">{p.totalBookings} bookings</p>
                                                </div>
                                                {p.averageRating > 0 && (
                                                    <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 rounded-lg">
                                                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                                        <span className="text-amber-400 text-sm">{p.averageRating.toFixed(1)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
