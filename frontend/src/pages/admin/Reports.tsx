import { useState, useEffect } from 'react';
import { FileText, Download, Calendar, DollarSign, Users, Bus, Loader2, AlertCircle } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { adminApi } from '../../services/api';

const COLORS = ['#f97316', '#06b6d4', '#d946ef', '#22c55e', '#f59e0b'];

export default function Reports() {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState(() => {
        const end = new Date();
        const start = new Date();
        start.setMonth(start.getMonth() - 1);
        return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
    });
    const [reportData, setReportData] = useState({
        totalRevenue: 0, totalBookings: 0, driverCount: 0, busCount: 0,
        routeBreakdown: [] as any[], period: { start: '', end: '' }
    });

    const fetchReports = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [reportsRes, dashboardRes] = await Promise.all([
                adminApi.getReports(dateRange.start, dateRange.end),
                adminApi.getDashboard()
            ]);
            setReportData({
                totalRevenue: reportsRes.data.totalRevenue || 0,
                totalBookings: reportsRes.data.totalBookings || 0,
                driverCount: dashboardRes.data.driverCount || 0,
                busCount: dashboardRes.data.busCount || 0,
                routeBreakdown: reportsRes.data.routeBreakdown || [],
                period: reportsRes.data.period || { start: dateRange.start, end: dateRange.end }
            });
        } catch (err: any) {
            console.error('Failed to load reports:', err);
            setError(err.response?.data?.message || 'Failed to load reports');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchReports(); }, [dateRange]);

    const stats = [
        { label: 'Total Revenue', value: `Rs. ${(reportData.totalRevenue).toLocaleString()}`, icon: DollarSign, color: 'text-primary-400', bgColor: 'from-primary-500 to-primary-600' },
        { label: 'Total Bookings', value: reportData.totalBookings.toLocaleString(), icon: FileText, color: 'text-secondary-400', bgColor: 'from-secondary-500 to-secondary-600' },
        { label: 'Active Drivers', value: reportData.driverCount.toString(), icon: Users, color: 'text-accent-400', bgColor: 'from-accent-500 to-accent-600' },
        { label: 'Active Buses', value: reportData.busCount.toString(), icon: Bus, color: 'text-green-400', bgColor: 'from-green-500 to-green-600' },
    ];

    // Generate chart data from route breakdown
    const routeChartData = reportData.routeBreakdown.map((r: any, i: number) => ({
        name: r.route?.split(' → ').map((s: string) => s.slice(0, 3).toUpperCase()).join('-') || `Route ${i + 1}`,
        fullName: r.route || `Route ${i + 1}`,
        revenue: r.revenue || 0,
        bookings: r.bookings || 0,
        color: COLORS[i % COLORS.length]
    }));

    const avgTicketPrice = reportData.totalBookings > 0 ? Math.round(reportData.totalRevenue / reportData.totalBookings) : 0;

    const handleExport = () => {
        const csvContent = [
            ['Route', 'Bookings', 'Revenue'],
            ...reportData.routeBreakdown.map((r: any) => [r.route, r.bookings, r.revenue])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `busgo-report-${dateRange.start}-to-${dateRange.end}.csv`;
        a.click();
    };

    if (isLoading) {
        return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary-500 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div><h1 className="text-2xl font-display font-bold text-white mb-1">Reports</h1><p className="text-slate-400">Generate and view system reports</p></div>
                <button onClick={handleExport} className="px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl btn-glow flex items-center gap-2"><Download className="w-5 h-5" />Export CSV</button>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" /> {error}
                </div>
            )}

            {/* Date Range Selector */}
            <div className="glass rounded-xl p-4 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2"><Calendar className="w-5 h-5 text-slate-400" /><span className="text-slate-400">Period:</span></div>
                <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} className="px-4 py-2 bg-slate-800/50 border border-white/10 rounded-xl text-white" />
                <span className="text-slate-400">to</span>
                <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} className="px-4 py-2 bg-slate-800/50 border border-white/10 rounded-xl text-white" />
                <button onClick={fetchReports} className="px-4 py-2 bg-accent-500 text-white rounded-xl font-medium">Apply</button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                    <div key={i} className="glass rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`w-10 h-10 bg-gradient-to-br ${stat.bgColor} rounded-xl flex items-center justify-center`}>
                                <stat.icon className="w-5 h-5 text-white" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
                        <p className="text-slate-400 text-sm">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass rounded-2xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-6">Revenue by Route</h2>
                    {routeChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={routeChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="name" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                    formatter={(v: number, name: string) => [`Rs. ${v.toLocaleString()}`, name === 'revenue' ? 'Revenue' : 'Bookings']}
                                    labelFormatter={(label) => routeChartData.find(r => r.name === label)?.fullName || label} />
                                <Bar dataKey="revenue" fill="#f97316" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-64 flex items-center justify-center text-slate-400">No route data available for selected period</div>
                    )}
                </div>

                <div className="glass rounded-2xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-6">Bookings Distribution</h2>
                    {routeChartData.length > 0 ? (
                        <>
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie data={routeChartData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={5} dataKey="bookings">
                                        {routeChartData.map((e: any, i: number) => <Cell key={i} fill={e.color} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-2 mt-4">
                                {routeChartData.map((r: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color }} />
                                            <span className="text-sm text-slate-300">{r.name}</span>
                                        </div>
                                        <span className="text-sm text-white">{r.bookings}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="h-48 flex items-center justify-center text-slate-400">No data</div>
                    )}
                </div>
            </div>

            {/* Summary Table */}
            <div className="glass rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-6">Route Breakdown</h2>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead><tr className="border-b border-white/10">
                            <th className="text-left py-3 px-4 text-slate-400 text-sm">Route</th>
                            <th className="text-right py-3 px-4 text-slate-400 text-sm">Bookings</th>
                            <th className="text-right py-3 px-4 text-slate-400 text-sm">Revenue</th>
                            <th className="text-right py-3 px-4 text-slate-400 text-sm">Avg. Ticket</th>
                        </tr></thead>
                        <tbody>
                            {reportData.routeBreakdown.length > 0 ? reportData.routeBreakdown.map((r: any, i: number) => (
                                <tr key={i} className="border-b border-white/5">
                                    <td className="py-3 px-4 text-white">{r.route}</td>
                                    <td className="py-3 px-4 text-right text-white">{r.bookings.toLocaleString()}</td>
                                    <td className="py-3 px-4 text-right text-white">Rs. {r.revenue.toLocaleString()}</td>
                                    <td className="py-3 px-4 text-right text-slate-400">Rs. {r.bookings > 0 ? Math.round(r.revenue / r.bookings).toLocaleString() : 0}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={4} className="py-8 text-center text-slate-400">No bookings in selected period</td></tr>
                            )}
                            {reportData.routeBreakdown.length > 0 && (
                                <tr className="bg-white/5 font-medium">
                                    <td className="py-3 px-4 text-white">Total</td>
                                    <td className="py-3 px-4 text-right text-white">{reportData.totalBookings.toLocaleString()}</td>
                                    <td className="py-3 px-4 text-right text-white">Rs. {reportData.totalRevenue.toLocaleString()}</td>
                                    <td className="py-3 px-4 text-right text-primary-400">Rs. {avgTicketPrice.toLocaleString()}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
