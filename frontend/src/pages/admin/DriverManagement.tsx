import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, Eye, Search, Loader2, AlertCircle, Phone, Mail, Bus } from 'lucide-react';
import { adminApi } from '../../services/api';

interface Driver {
    id: string;
    user: { name: string; email: string; phone: string };
    licenseNumber: string;
    status: string;
    createdAt: string;
    buses: any[];
}

export default function DriverManagement() {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    const fetchDrivers = async () => {
        try {
            setIsLoading(true);
            const response = await adminApi.getDrivers();
            setDrivers(response.data.drivers || []);
        } catch (err: any) {
            console.error('Failed to load drivers:', err);
            setError(err.response?.data?.message || 'Failed to load drivers');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchDrivers(); }, []);

    const filteredDrivers = drivers.filter(d => {
        const status = d.status?.toLowerCase();
        if (filter !== 'all' && status !== filter) return false;
        if (search && !d.user.name.toLowerCase().includes(search.toLowerCase()) && !d.user.email.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
        setIsUpdating(true);
        try {
            await adminApi.verifyDriver(id, status.toUpperCase() as 'APPROVED' | 'REJECTED');
            await fetchDrivers();
            setSelectedDriver(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update driver status');
        } finally {
            setIsUpdating(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const s = status?.toUpperCase();
        if (s === 'APPROVED') return <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs"><CheckCircle className="w-3 h-3" />Approved</span>;
        if (s === 'REJECTED') return <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs"><XCircle className="w-3 h-3" />Rejected</span>;
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg text-xs"><Clock className="w-3 h-3" />Pending</span>;
    };

    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    if (isLoading) {
        return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary-500 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <div><h1 className="text-2xl font-display font-bold text-white mb-1">Driver Management</h1><p className="text-slate-400">Review and manage driver accounts</p></div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" /> {error}
                </div>
            )}

            <div className="flex flex-wrap gap-4">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search drivers..." className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500" />
                </div>
                <div className="flex gap-2">
                    {['all', 'pending', 'approved', 'rejected'].map((f) => (
                        <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg font-medium capitalize ${filter === f ? 'bg-accent-500 text-white' : 'bg-slate-800 text-slate-400'}`}>{f}</button>
                    ))}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="glass rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-white">{drivers.filter(d => d.status?.toUpperCase() === 'PENDING').length}</p>
                    <p className="text-slate-400 text-sm">Pending</p>
                </div>
                <div className="glass rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-green-400">{drivers.filter(d => d.status?.toUpperCase() === 'APPROVED').length}</p>
                    <p className="text-slate-400 text-sm">Approved</p>
                </div>
                <div className="glass rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-red-400">{drivers.filter(d => d.status?.toUpperCase() === 'REJECTED').length}</p>
                    <p className="text-slate-400 text-sm">Rejected</p>
                </div>
            </div>

            <div className="glass rounded-2xl overflow-hidden">
                <table className="w-full">
                    <thead><tr className="border-b border-white/10 bg-white/5">
                        <th className="text-left py-4 px-6 text-slate-400 font-medium text-sm">Driver</th>
                        <th className="text-left py-4 px-6 text-slate-400 font-medium text-sm">License</th>
                        <th className="text-left py-4 px-6 text-slate-400 font-medium text-sm">Buses</th>
                        <th className="text-left py-4 px-6 text-slate-400 font-medium text-sm">Joined</th>
                        <th className="text-left py-4 px-6 text-slate-400 font-medium text-sm">Status</th>
                        <th className="text-right py-4 px-6 text-slate-400 font-medium text-sm">Actions</th>
                    </tr></thead>
                    <tbody>
                        {filteredDrivers.length === 0 ? (
                            <tr><td colSpan={6} className="py-12 text-center text-slate-400">No drivers found</td></tr>
                        ) : (
                            filteredDrivers.map((driver) => (
                                <tr key={driver.id} className="border-b border-white/5 hover:bg-white/5">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-xl flex items-center justify-center text-white font-bold">{driver.user.name.charAt(0)}</div>
                                            <div><p className="text-white font-medium">{driver.user.name}</p><p className="text-sm text-slate-400">{driver.user.email}</p></div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-slate-300 font-mono text-sm">{driver.licenseNumber || 'N/A'}</td>
                                    <td className="py-4 px-6"><span className="px-2 py-1 bg-primary-500/20 text-primary-400 rounded-lg text-sm">{driver.buses?.length || 0} buses</span></td>
                                    <td className="py-4 px-6 text-slate-400 text-sm">{formatDate(driver.createdAt)}</td>
                                    <td className="py-4 px-6">{getStatusBadge(driver.status)}</td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link to={`/admin/drivers/${driver.id}`} className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 rounded-lg" title="View Details"><Eye className="w-4 h-4" /></Link>
                                            {driver.status?.toUpperCase() === 'PENDING' && (<>
                                                <button onClick={() => updateStatus(driver.id, 'approved')} disabled={isUpdating} className="p-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg disabled:opacity-50"><CheckCircle className="w-4 h-4" /></button>
                                                <button onClick={() => updateStatus(driver.id, 'rejected')} disabled={isUpdating} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg disabled:opacity-50"><XCircle className="w-4 h-4" /></button>
                                            </>)}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Detail Modal */}
            {selectedDriver && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedDriver(null)}>
                    <div className="bg-slate-800 rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl">{selectedDriver.user.name.charAt(0)}</div>
                            <div><h2 className="text-xl font-bold text-white">{selectedDriver.user.name}</h2>{getStatusBadge(selectedDriver.status)}</div>
                        </div>
                        <div className="space-y-4 mb-6">
                            <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-xl">
                                <Mail className="w-5 h-5 text-slate-400" />
                                <div><p className="text-xs text-slate-500">Email</p><p className="text-white">{selectedDriver.user.email}</p></div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-xl">
                                <Phone className="w-5 h-5 text-slate-400" />
                                <div><p className="text-xs text-slate-500">Phone</p><p className="text-white">{selectedDriver.user.phone || 'Not provided'}</p></div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-xl">
                                <Bus className="w-5 h-5 text-slate-400" />
                                <div><p className="text-xs text-slate-500">Buses Registered</p><p className="text-white">{selectedDriver.buses?.length || 0}</p></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-slate-900/50 rounded-xl"><p className="text-xs text-slate-500">License</p><p className="text-white font-mono">{selectedDriver.licenseNumber || 'N/A'}</p></div>
                                <div className="p-3 bg-slate-900/50 rounded-xl"><p className="text-xs text-slate-500">Joined</p><p className="text-white">{formatDate(selectedDriver.createdAt)}</p></div>
                            </div>
                        </div>
                        {selectedDriver.status?.toUpperCase() === 'PENDING' && (
                            <div className="flex gap-3">
                                <button onClick={() => updateStatus(selectedDriver.id, 'rejected')} disabled={isUpdating} className="flex-1 px-4 py-3 bg-red-500/10 text-red-400 font-medium rounded-xl disabled:opacity-50">Reject</button>
                                <button onClick={() => updateStatus(selectedDriver.id, 'approved')} disabled={isUpdating} className="flex-1 px-4 py-3 bg-green-500 text-white font-semibold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                                    {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Approve'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
