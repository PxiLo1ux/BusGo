import { useState, useEffect } from 'react';
import { DollarSign, Bus, MapPin, Users, Star, TrendingUp, Loader2, BarChart2, Calendar, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { driverApi } from '../../services/api';

const COLORS = ['#d946ef', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

interface BusEarning {
    id: string;
    name: string;
    plateNumber: string;
    type: string;
    capacity: number;
    totalEarnings: number;
    totalBookings: number;
    completedTrips: number;
    approved: boolean;
    rating: number;
}

interface PopularRoute {
    routeId: string;
    origin: string;
    destination: string;
    bookings: number;
    revenue: number;
    trips: number;
}

interface TopPassenger {
    userId: string;
    name: string;
    email: string;
    totalBookings: number;
    totalSpent: number;
    lastBooking: string | null;
    averageRating: number;
    reviewCount: number;
    latestReview: { rating: number; comment: string; date: string } | null;
}

interface AnalyticsData {
    summary: {
        totalEarnings: number;
        totalBookings: number;
        totalTrips: number;
        busCount: number;
        routeCount: number;
        passengerCount: number;
        driverRating: number;
        totalReviews: number;
    };
    busEarnings: BusEarning[];
    popularRoutes: PopularRoute[];
    topPassengers: TopPassenger[];
    monthlyEarnings: { month: string; earnings: number; bookings: number }[];
}

export default function Analytics() {
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'buses' | 'routes' | 'passengers'>('overview');

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        try {
            const res = await driverApi.getAnalytics();
            setData(res.data);
        } catch (err) {
            console.error('Failed to load analytics', err);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-12 text-slate-400">
                <BarChart2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Failed to load analytics data</p>
            </div>
        );
    }

    const statsCards = [
        { label: 'Total Earnings', value: `Rs. ${data.summary.totalEarnings.toLocaleString()}`, icon: DollarSign, color: 'from-primary-500 to-primary-600' },
        { label: 'Total Bookings', value: data.summary.totalBookings.toString(), icon: BarChart2, color: 'from-secondary-500 to-secondary-600' },
        { label: 'Completed Trips', value: data.summary.totalTrips.toString(), icon: Bus, color: 'from-accent-500 to-accent-600' },
        { label: 'Your Rating', value: `${data.summary.driverRating.toFixed(1)} ★`, icon: Star, color: 'from-yellow-500 to-yellow-600' },
    ];

    const tabs = [
        { id: 'overview', label: 'Overview', icon: TrendingUp },
        { id: 'buses', label: 'Bus Earnings', icon: Bus },
        { id: 'routes', label: 'Routes', icon: MapPin },
        { id: 'passengers', label: 'Top Passengers', icon: Users },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-display font-bold text-white mb-1">Analytics Dashboard</h1>
                <p className="text-slate-400">Track your performance, earnings, and passenger insights</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statsCards.map((stat, i) => (
                    <div key={i} className="glass rounded-2xl p-5">
                        <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center mb-4`}>
                            <stat.icon className="w-6 h-6 text-white" />
                        </div>
                        <p className="text-2xl font-bold text-white">{stat.value}</p>
                        <p className="text-slate-400 text-sm">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${activeTab === tab.id
                                ? 'bg-primary-500 text-white'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Monthly Earnings Chart */}
                    <div className="glass rounded-2xl p-6">
                        <h2 className="text-lg font-semibold text-white mb-6">Monthly Earnings</h2>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={data.monthlyEarnings}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="month" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                    formatter={(v: number) => [`Rs. ${v.toLocaleString()}`, 'Earnings']}
                                />
                                <Line type="monotone" dataKey="earnings" stroke="#d946ef" strokeWidth={3} dot={{ fill: '#d946ef', r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Bus Earnings Distribution */}
                    <div className="glass rounded-2xl p-6">
                        <h2 className="text-lg font-semibold text-white mb-6">Bus Earnings Distribution</h2>
                        {data.busEarnings.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={data.busEarnings}
                                        dataKey="totalEarnings"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {data.busEarnings.map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                        formatter={(v: number) => [`Rs. ${v.toLocaleString()}`, 'Earnings']}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-center py-12 text-slate-400">
                                <Bus className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No bus data available</p>
                            </div>
                        )}
                    </div>

                    {/* Route Popularity Chart */}
                    <div className="glass rounded-2xl p-6 lg:col-span-2">
                        <h2 className="text-lg font-semibold text-white mb-6">Route Performance</h2>
                        {data.popularRoutes.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={data.popularRoutes.slice(0, 6)}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="destination" stroke="#94a3b8" />
                                    <YAxis stroke="#94a3b8" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                        formatter={(v: number, name: string) => [name === 'revenue' ? `Rs. ${v.toLocaleString()}` : v, name === 'revenue' ? 'Revenue' : 'Bookings']}
                                    />
                                    <Bar dataKey="revenue" fill="#06b6d4" radius={[4, 4, 0, 0]} name="revenue" />
                                    <Bar dataKey="bookings" fill="#d946ef" radius={[4, 4, 0, 0]} name="bookings" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-center py-12 text-slate-400">
                                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No route data available</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Buses Tab */}
            {activeTab === 'buses' && (
                <div className="glass rounded-2xl overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/5">
                                <th className="text-left py-4 px-6 text-slate-400 font-medium text-sm">Bus</th>
                                <th className="text-left py-4 px-6 text-slate-400 font-medium text-sm">Type</th>
                                <th className="text-left py-4 px-6 text-slate-400 font-medium text-sm">Earnings</th>
                                <th className="text-left py-4 px-6 text-slate-400 font-medium text-sm">Bookings</th>
                                <th className="text-left py-4 px-6 text-slate-400 font-medium text-sm">Trips</th>
                                <th className="text-left py-4 px-6 text-slate-400 font-medium text-sm">Rating</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.busEarnings.length === 0 ? (
                                <tr><td colSpan={6} className="py-12 text-center text-slate-400">No bus data</td></tr>
                            ) : (
                                data.busEarnings.map((bus, i) => (
                                    <tr key={bus.id} className="border-b border-white/5 hover:bg-white/5">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold bg-gradient-to-br ${COLORS[i % COLORS.length].replace('#', 'from-[')}#${COLORS[i % COLORS.length].slice(1)}] to-slate-700`} style={{ background: `linear-gradient(135deg, ${COLORS[i % COLORS.length]}, #334155)` }}>
                                                    {i + 1}
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium">{bus.name}</p>
                                                    <p className="text-slate-400 text-sm">{bus.plateNumber}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="px-2 py-1 bg-primary-500/20 text-primary-400 rounded-lg text-sm">{bus.type}</span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="text-white font-bold">Rs. {bus.totalEarnings.toLocaleString()}</span>
                                        </td>
                                        <td className="py-4 px-6 text-slate-300">{bus.totalBookings}</td>
                                        <td className="py-4 px-6 text-slate-300">{bus.completedTrips}</td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-1">
                                                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                                <span className="text-white">{bus.rating.toFixed(1)}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Routes Tab */}
            {activeTab === 'routes' && (
                <div className="glass rounded-2xl overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/5">
                                <th className="text-left py-4 px-6 text-slate-400 font-medium text-sm">Route</th>
                                <th className="text-left py-4 px-6 text-slate-400 font-medium text-sm">Revenue</th>
                                <th className="text-left py-4 px-6 text-slate-400 font-medium text-sm">Bookings</th>
                                <th className="text-left py-4 px-6 text-slate-400 font-medium text-sm">Trips</th>
                                <th className="text-left py-4 px-6 text-slate-400 font-medium text-sm">Popularity</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.popularRoutes.length === 0 ? (
                                <tr><td colSpan={5} className="py-12 text-center text-slate-400">No route data</td></tr>
                            ) : (
                                data.popularRoutes.map((route, i) => {
                                    const maxRevenue = data.popularRoutes[0]?.revenue || 1;
                                    const popularity = (route.revenue / maxRevenue) * 100;
                                    return (
                                        <tr key={route.routeId} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-xl flex items-center justify-center text-white font-bold">
                                                        {i + 1}
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-medium">{route.origin} → {route.destination}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="text-white font-bold">Rs. {route.revenue.toLocaleString()}</span>
                                            </td>
                                            <td className="py-4 px-6 text-slate-300">{route.bookings}</td>
                                            <td className="py-4 px-6 text-slate-300">{route.trips}</td>
                                            <td className="py-4 px-6">
                                                <div className="w-full bg-slate-700 rounded-full h-2">
                                                    <div
                                                        className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full"
                                                        style={{ width: `${popularity}%` }}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Passengers Tab */}
            {activeTab === 'passengers' && (
                <div className="space-y-4">
                    {data.topPassengers.length === 0 ? (
                        <div className="glass rounded-2xl p-12 text-center text-slate-400">
                            <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p>No passenger data yet</p>
                        </div>
                    ) : (
                        data.topPassengers.map((passenger, i) => (
                            <div key={passenger.userId} className="glass rounded-2xl p-6">
                                <div className="flex items-start gap-4">
                                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl ${i === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                                            i === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500' :
                                                i === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                                                    'bg-slate-700'
                                        }`}>
                                        {i < 3 ? <Award className="w-6 h-6" /> : passenger.name.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <div>
                                                <h3 className="text-white font-semibold text-lg">{passenger.name}</h3>
                                                <p className="text-slate-400 text-sm">{passenger.email}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-white font-bold">Rs. {passenger.totalSpent.toLocaleString()}</p>
                                                <p className="text-slate-400 text-sm">Total Spent</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-4 mt-4">
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg">
                                                <BarChart2 className="w-4 h-4 text-primary-400" />
                                                <span className="text-white text-sm">{passenger.totalBookings} bookings</span>
                                            </div>
                                            {passenger.averageRating > 0 && (
                                                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg">
                                                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                                    <span className="text-white text-sm">{passenger.averageRating.toFixed(1)} avg rating</span>
                                                </div>
                                            )}
                                            {passenger.lastBooking && (
                                                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg">
                                                    <Calendar className="w-4 h-4 text-secondary-400" />
                                                    <span className="text-slate-300 text-sm">Last: {new Date(passenger.lastBooking).toLocaleDateString()}</span>
                                                </div>
                                            )}
                                        </div>

                                        {passenger.latestReview && (
                                            <div className="mt-4 p-4 bg-slate-900/50 rounded-xl">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="flex">
                                                        {[1, 2, 3, 4, 5].map(star => (
                                                            <Star
                                                                key={star}
                                                                className={`w-4 h-4 ${star <= passenger.latestReview!.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`}
                                                            />
                                                        ))}
                                                    </div>
                                                    <span className="text-slate-400 text-xs">{new Date(passenger.latestReview.date).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-slate-300 text-sm italic">"{passenger.latestReview.comment}"</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
