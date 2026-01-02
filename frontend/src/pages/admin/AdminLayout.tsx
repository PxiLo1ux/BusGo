import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Bus, FileText, Menu, X, LogOut, ChevronRight, Shield, DollarSign, MessageCircle, Gift, Navigation } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { path: '/admin/drivers', icon: Users, label: 'Drivers' },
    { path: '/admin/buses', icon: Bus, label: 'Bus Verification' },
    { path: '/admin/tracking', icon: Navigation, label: 'Live Tracking' },
    { path: '/admin/pricing', icon: DollarSign, label: 'Dynamic Pricing' },
    { path: '/admin/reports', icon: FileText, label: 'Reports' },
    { path: '/admin/chat', icon: MessageCircle, label: 'Support Chat' },
    { path: '/admin/loyalty-offers', icon: Gift, label: 'Loyalty Offers' },
];

export default function AdminLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleLogout = () => { logout(); navigate('/'); };
    const isActive = (path: string, exact = false) => exact ? location.pathname === path : location.pathname.startsWith(path);

    return (
        <div className="min-h-screen bg-slate-900 flex">
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-800 border-r border-white/10 transform transition-transform lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="h-16 flex items-center justify-between px-6 border-b border-white/10">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl flex items-center justify-center"><Shield className="w-5 h-5 text-white" /></div>
                        <span className="text-xl font-display font-bold text-gradient">Admin</span>
                    </Link>
                    <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400"><X className="w-6 h-6" /></button>
                </div>
                <div className="p-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl flex items-center justify-center text-white font-bold">{user?.name?.charAt(0) || 'A'}</div>
                        <div><p className="font-medium text-white">{user?.name || 'Admin'}</p><p className="text-sm text-slate-400">Administrator</p></div>
                    </div>
                </div>
                <nav className="p-4 space-y-2">
                    {navItems.map((item) => (
                        <Link key={item.path} to={item.path} onClick={() => setIsSidebarOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive(item.path, item.exact) ? 'bg-accent-500/20 text-accent-400' : 'text-slate-400 hover:bg-white/5'}`}>
                            <item.icon className="w-5 h-5" /><span className="font-medium">{item.label}</span>{isActive(item.path, item.exact) && <ChevronRight className="w-4 h-4 ml-auto" />}
                        </Link>
                    ))}
                </nav>
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
                    <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400"><LogOut className="w-5 h-5" /><span className="font-medium">Logout</span></button>
                </div>
            </aside>
            {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
            <div className="flex-1 lg:ml-64">
                <header className="h-16 bg-slate-800/50 border-b border-white/10 flex items-center justify-between px-6 sticky top-0 z-30 backdrop-blur-sm">
                    <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden text-slate-400"><Menu className="w-6 h-6" /></button>
                    <div className="ml-auto"><Link to="/" className="text-slate-400 hover:text-white text-sm">View Main Site</Link></div>
                </header>
                <main className="p-6"><Outlet /></main>
            </div>
        </div>
    );
}
