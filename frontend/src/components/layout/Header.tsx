import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Menu, X, Bus, User, Ticket, Award } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import NotificationDropdown from '../common/NotificationDropdown';
import { loyaltyApi } from '../../services/api';

export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [loyaltyData, setLoyaltyData] = useState<{ points: number; tier: string } | null>(null);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (user && user.role === 'PASSENGER') {
            loyaltyApi.getStatus().then(res => setLoyaltyData({ points: res.data.points || 0, tier: res.data.tier || 'BRONZE' })).catch(() => { });
        }
    }, [user]);

    const scrollToSection = (sectionId: string) => {
        setIsMenuOpen(false);
        // If not on home page, navigate first
        if (window.location.pathname !== '/') {
            navigate('/', { state: { scrollTo: sectionId } });
            return;
        }
        const element = document.getElementById(sectionId);
        if (element) { element.scrollIntoView({ behavior: 'smooth' }); }
    };

    // Handle scroll after navigation
    useEffect(() => {
        const state = window.history.state?.usr;
        if (state?.scrollTo && window.location.pathname === '/') {
            setTimeout(() => {
                const element = document.getElementById(state.scrollTo);
                if (element) element.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    }, []);

    const handleLogout = () => { logout(); navigate('/'); };

    const getDashboardLink = () => {
        if (!user) return '/login';
        switch (user.role) {
            case 'ADMIN': return '/admin';
            case 'DRIVER': return '/driver';
            default: return '/my-bookings';
        }
    };

    const getTierColor = (tier: string) => {
        switch (tier) {
            case 'GOLD': return 'from-yellow-500/20 to-amber-500/20 text-yellow-400';
            case 'SILVER': return 'from-slate-400/20 to-slate-500/20 text-slate-300';
            default: return 'from-amber-500/20 to-amber-600/20 text-amber-400';
        }
    };

    return (
        <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'glass-dark py-3' : 'bg-transparent py-5'}`}>
            <div className="container mx-auto px-4 lg:px-8">
                <div className="flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300 shadow-glow">
                                <Bus className="w-7 h-7 text-white" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-secondary-400 rounded-full animate-pulse" />
                        </div>
                        <span className="text-2xl font-display font-bold text-gradient">BusGo</span>
                    </Link>

                    <nav className="hidden md:flex items-center gap-8">
                        <button onClick={() => scrollToSection('search')} className="text-slate-300 hover:text-primary-400 font-medium transition-colors">Search Trips</button>
                        <button onClick={() => scrollToSection('about')} className="text-slate-300 hover:text-primary-400 font-medium transition-colors">About</button>

                        {user ? (
                            <div className="flex items-center gap-4">
                                {user.role === 'PASSENGER' && (
                                    <>
                                        <Link to="/my-bookings" className="flex items-center gap-2 text-slate-300 hover:text-primary-400 font-medium">
                                            <Ticket className="w-5 h-5" />My Bookings
                                        </Link>
                                        <Link to="/loyalty" className={`flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r ${getTierColor(loyaltyData?.tier || 'BRONZE')} rounded-lg hover:opacity-80 transition-all`}>
                                            <Award className="w-4 h-4" />
                                            <span className="font-semibold">{loyaltyData?.points?.toLocaleString() || 0}</span>
                                            <span className="text-xs">pts</span>
                                        </Link>
                                    </>
                                )}
                                {(user.role === 'ADMIN' || user.role === 'DRIVER') && (
                                    <Link to={getDashboardLink()} className="flex items-center gap-2 text-slate-300 hover:text-primary-400 font-medium">
                                        <User className="w-5 h-5" />Dashboard
                                    </Link>
                                )}
                                <NotificationDropdown />
                                <Link to="/profile" className="text-slate-400 text-sm hover:text-primary-400 transition-colors">{user.name}</Link>
                                <button onClick={handleLogout} className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors">Logout</button>
                            </div>
                        ) : (
                            <Link to="/login" className="px-6 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl transition-all btn-glow">Login</Link>
                        )}
                    </nav>

                    <button className="md:hidden text-white p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>

                {isMenuOpen && (
                    <nav className="md:hidden mt-4 pb-4 border-t border-white/10 pt-4 animate-slide-up">
                        <div className="flex flex-col gap-4">
                            <button onClick={() => scrollToSection('search')} className="text-slate-300 hover:text-primary-400 font-medium text-left">Search Trips</button>
                            <button onClick={() => scrollToSection('about')} className="text-slate-300 hover:text-primary-400 font-medium text-left">About</button>
                            {user ? (
                                <>
                                    {user.role === 'PASSENGER' && (
                                        <>
                                            <Link to="/my-bookings" className="text-slate-300 hover:text-primary-400 font-medium">My Bookings</Link>
                                            <Link to="/loyalty" className={`flex items-center gap-2 ${getTierColor(loyaltyData?.tier || 'BRONZE')} font-medium`}>
                                                <Award className="w-4 h-4" />{loyaltyData?.points?.toLocaleString() || 0} Points
                                            </Link>
                                            <Link to="/profile" className="text-slate-300 hover:text-primary-400 font-medium">My Profile</Link>
                                        </>
                                    )}
                                    {(user.role === 'ADMIN' || user.role === 'DRIVER') && (
                                        <Link to={getDashboardLink()} className="text-slate-300 hover:text-primary-400 font-medium">Dashboard</Link>
                                    )}
                                    <button onClick={handleLogout} className="px-5 py-2.5 bg-slate-700 text-white font-medium rounded-xl text-center">Logout</button>
                                </>
                            ) : (
                                <Link to="/login" className="px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl text-center">Login</Link>
                            )}
                        </div>
                    </nav>
                )}
            </div>
        </header>
    );
}
