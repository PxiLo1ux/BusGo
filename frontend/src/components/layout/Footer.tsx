import { Link, useNavigate } from 'react-router-dom';
import { Bus, Mail, Phone, MapPin, Facebook, Instagram, Twitter, HelpCircle } from 'lucide-react';

export default function Footer() {
    const currentYear = new Date().getFullYear();
    const navigate = useNavigate();
    const today = new Date().toISOString().split('T')[0];

    const scrollToSearch = () => {
        const element = document.getElementById('search');
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        } else {
            navigate('/');
            setTimeout(() => document.getElementById('search')?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
    };

    const searchRoute = (origin: string, destination: string) => {
        navigate(`/search?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&date=${today}`);
    };

    return (
        <footer id="about" className="bg-slate-900 border-t border-white/10">
            <div className="container mx-auto px-4 lg:px-8 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                    {/* Brand Section */}
                    <div className="lg:col-span-1">
                        <Link to="/" className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-glow">
                                <Bus className="w-7 h-7 text-white" />
                            </div>
                            <span className="text-2xl font-display font-bold text-gradient">BusGo</span>
                        </Link>
                        <p className="text-slate-400 mb-6 leading-relaxed">
                            Your trusted partner for comfortable and reliable bus travel across Nepal.
                        </p>
                        <div className="flex gap-4">
                            <a href="#" className="w-10 h-10 bg-white/5 hover:bg-primary-500 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-all"><Facebook className="w-5 h-5" /></a>
                            <a href="#" className="w-10 h-10 bg-white/5 hover:bg-primary-500 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-all"><Instagram className="w-5 h-5" /></a>
                            <a href="#" className="w-10 h-10 bg-white/5 hover:bg-primary-500 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-all"><Twitter className="w-5 h-5" /></a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-6">Quick Links</h3>
                        <ul className="space-y-4">
                            <li><button onClick={scrollToSearch} className="text-slate-400 hover:text-primary-400 transition-colors">Search Buses</button></li>
                            <li><button onClick={scrollToSearch} className="text-slate-400 hover:text-primary-400 transition-colors">Plan Your Journey</button></li>
                            <li><Link to="/my-bookings" className="text-slate-400 hover:text-primary-400 transition-colors">My Bookings</Link></li>
                            <li><Link to="/register" className="text-slate-400 hover:text-primary-400 transition-colors">Create Account</Link></li>
                        </ul>
                    </div>

                    {/* Popular Routes */}
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-6">Popular Routes</h3>
                        <ul className="space-y-4">
                            <li><button onClick={() => searchRoute('Kathmandu', 'Pokhara')} className="text-slate-400 hover:text-primary-400 transition-colors">Kathmandu → Pokhara</button></li>
                            <li><button onClick={() => searchRoute('Kathmandu', 'Chitwan')} className="text-slate-400 hover:text-primary-400 transition-colors">Kathmandu → Chitwan</button></li>
                            <li><button onClick={() => searchRoute('Pokhara', 'Lumbini')} className="text-slate-400 hover:text-primary-400 transition-colors">Pokhara → Lumbini</button></li>
                            <li><button onClick={() => searchRoute('Kathmandu', 'Nagarkot')} className="text-slate-400 hover:text-primary-400 transition-colors">Kathmandu → Nagarkot</button></li>
                            <li><button onClick={() => searchRoute('Kathmandu', 'Bhaktapur')} className="text-slate-400 hover:text-primary-400 transition-colors">Kathmandu → Bhaktapur</button></li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-6">Contact Us</h3>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3"><MapPin className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" /><span className="text-slate-400">New Baneshwor, Kathmandu<br />Nepal</span></li>
                            <li className="flex items-center gap-3"><Phone className="w-5 h-5 text-primary-500 flex-shrink-0" /><a href="tel:+9771234567890" className="text-slate-400 hover:text-primary-400">+977 1234567890</a></li>
                            <li className="flex items-center gap-3"><Mail className="w-5 h-5 text-primary-500 flex-shrink-0" /><a href="mailto:support@busgo.com" className="text-slate-400 hover:text-primary-400">support@busgo.com</a></li>
                        </ul>
                        <Link to="/support" className="mt-6 w-full px-6 py-3 bg-gradient-to-r from-secondary-500 to-secondary-600 hover:from-secondary-600 hover:to-secondary-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
                            <HelpCircle className="w-5 h-5" />Get Support
                        </Link>
                    </div>
                </div>
            </div>

            <div className="border-t border-white/10">
                <div className="container mx-auto px-4 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-slate-500 text-sm">© {currentYear} BusGo. All rights reserved.</p>
                        <p className="text-slate-500 text-sm">Made with ❤️ in Nepal</p>
                    </div>
                </div>
            </div>
        </footer>
    );
}
