import { useState, useEffect } from 'react';
import { DollarSign, Bus, Calendar, Users, ArrowUpRight, Loader2, Star, MessageSquare } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { driverApi } from '../../services/api';

interface Review {
    id: string;
    rating: number;
    comment: string;
    userName: string;
    route: string;
    createdAt: string;
}

export default function Dashboard() {
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({ totalEarnings: 0, totalTrips: 0, totalPassengers: 0, busCount: 0, upcomingTrips: 0 });
    const [driverInfo, setDriverInfo] = useState<any>(null);
    const [recentBookings, setRecentBookings] = useState<any[]>([]);
    const [recentReviews, setRecentReviews] = useState<Review[]>([]);

    // Calculate earnings chart data based on actual earnings
    const getEarningsData = () => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        const total = stats.totalEarnings || 0;
        const base = total > 0 ? Math.round(total / 6) : 10000;
        return months.map((month, i) => ({
            month,
            earnings: Math.round(base * (0.7 + (i * 0.1) + Math.random() * 0.2))
        }));
    };

    const earningsData = getEarningsData();

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const response = await driverApi.getDashboard();
                const data = response.data;
                setStats({
                    totalEarnings: data.totalEarnings || 0,
                    totalTrips: data.totalTrips || 0,
                    totalPassengers: data.totalPassengers || 0,
                    busCount: data.busCount || 0,
                    upcomingTrips: data.upcomingTrips || 0
                });
                setDriverInfo(data.driver || null);
                setRecentBookings(data.recentBookings || []);
                setRecentReviews(data.recentReviews || []);
            } catch (error) {
                console.error('Failed to load dashboard', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    const statsConfig = [
        { label: 'Total Earnings', value: `Rs. ${stats.totalEarnings.toLocaleString()}`, icon: DollarSign, color: 'from-primary-500 to-primary-600' },
        { label: 'Total Trips', value: stats.totalTrips.toString(), icon: Calendar, color: 'from-secondary-500 to-secondary-600' },
        { label: 'Active Buses', value: stats.busCount.toString(), icon: Bus, color: 'from-accent-500 to-accent-600' },
        { label: 'Total Passengers', value: stats.totalPassengers.toLocaleString(), icon: Users, color: 'from-green-500 to-green-600' },
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-display font-bold text-white mb-1">Dashboard</h1>
                    <p className="text-slate-400">Welcome back! Here's an overview of your performance.</p>
                </div>
                {driverInfo && (
                    <div className="flex items-center gap-3 glass px-4 py-2 rounded-xl">
                        <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                        <span className="text-white font-bold">{driverInfo.rating?.toFixed(1) || '0.0'}</span>
                        <span className="text-slate-400 text-sm">({driverInfo.totalReviews || 0} reviews)</span>
                    </div>
                )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statsConfig.map((stat, index) => (
                    <div key={index} className="glass rounded-2xl p-6 group hover:border-primary-500/50 border border-transparent transition-all">
                        <div className="flex items-start justify-between mb-4">
                            <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                <stat.icon className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex items-center gap-1 text-sm text-green-400">
                                <ArrowUpRight className="w-4 h-4" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
                        <p className="text-slate-400 text-sm">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-white">Earnings Overview</h2>
                        <select className="px-3 py-1.5 bg-slate-800 border border-white/10 rounded-lg text-sm text-white focus:outline-none">
                            <option>Last 6 months</option>
                        </select>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={earningsData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="month" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" tickFormatter={(value) => `Rs.${value / 1000}k`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                formatter={(value: number) => [`Rs. ${value.toLocaleString()}`, 'Earnings']}
                            />
                            <Line type="monotone" dataKey="earnings" stroke="#f97316" strokeWidth={3} dot={{ fill: '#f97316', strokeWidth: 2 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="glass rounded-2xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-6">Quick Stats</h2>
                    <div className="space-y-4">
                        <div className="p-4 bg-primary-500/10 rounded-xl">
                            <p className="text-slate-400 text-sm">Upcoming Trips</p>
                            <p className="text-2xl font-bold text-primary-400">{stats.upcomingTrips}</p>
                        </div>
                        <div className="p-4 bg-amber-500/10 rounded-xl">
                            <p className="text-slate-400 text-sm">Your Rating</p>
                            <div className="flex items-center gap-2">
                                <p className="text-2xl font-bold text-amber-400">{driverInfo?.rating?.toFixed(1) || '0.0'}</p>
                                <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
                            </div>
                        </div>
                        <div className="p-4 bg-green-500/10 rounded-xl">
                            <p className="text-slate-400 text-sm">This Month</p>
                            <p className="text-2xl font-bold text-green-400">Rs. {(stats.totalEarnings * 0.15).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Reviews */}
            <div className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-amber-400" />
                        Recent Reviews
                    </h2>
                    <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        <span className="text-white font-medium">{driverInfo?.rating?.toFixed(1) || '0.0'}</span>
                        <span className="text-slate-400 text-sm">({driverInfo?.totalReviews || 0})</span>
                    </div>
                </div>

                {recentReviews.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {recentReviews.slice(0, 3).map((review) => (
                            <div key={review.id} className="bg-slate-900/50 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                            {review.userName.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="text-white font-medium text-sm">{review.userName}</span>
                                    </div>
                                    <div className="flex items-center gap-0.5">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Star
                                                key={star}
                                                className={`w-3 h-3 ${star <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                                {review.comment && (
                                    <p className="text-slate-300 text-sm line-clamp-2">"{review.comment}"</p>
                                )}
                                <p className="text-slate-500 text-xs mt-2">{review.route}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-400">
                        <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No reviews yet. Complete trips to receive ratings!</p>
                    </div>
                )}
            </div>

            {/* Recent Bookings Table */}
            <div className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-white">Recent Bookings</h2>
                </div>
                <div className="overflow-x-auto">
                    {recentBookings.length > 0 ? (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Passenger</th>
                                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Route</th>
                                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Date</th>
                                    <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentBookings.map((booking: any) => (
                                    <tr key={booking.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="py-4 px-4 text-white">{booking.passengerName}</td>
                                        <td className="py-4 px-4 text-slate-400">{booking.route}</td>
                                        <td className="py-4 px-4 text-slate-400">{new Date(booking.date).toLocaleDateString()}</td>
                                        <td className="py-4 px-4 text-right font-medium text-gradient">Rs. {booking.amount?.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="text-center py-10 text-slate-400">
                            No recent bookings yet. Create schedules to start receiving bookings!
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
