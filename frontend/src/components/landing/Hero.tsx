import { useNavigate } from 'react-router-dom';
import { ArrowRight, Shield, Clock, CreditCard } from 'lucide-react';

export default function Hero() {
    const navigate = useNavigate();

    const features = [
        { icon: Shield, label: 'Verified Buses', desc: 'All buses quality checked' },
        { icon: Clock, label: '24/7 Support', desc: 'Always here to help' },
        { icon: CreditCard, label: 'Secure Payment', desc: 'Safe transactions' },
    ];

    const scrollToSearch = () => {
        const element = document.getElementById('search');
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
            {/* Background Image with Overlay */}
            <div className="absolute inset-0 z-0">
                <img
                    src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=2069&auto=format&fit=crop"
                    alt="Tourist Bus"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-slate-900/80 to-slate-900" />
                <div className="absolute inset-0 bg-gradient-to-r from-primary-900/30 to-transparent" />
            </div>

            {/* Animated Background Elements */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-pulse-slow" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
            </div>

            {/* Content */}
            <div className="relative z-10 container mx-auto px-4 lg:px-8 pt-24 pb-16">
                <div className="max-w-4xl mx-auto text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-8 animate-fade-in">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span className="text-sm text-slate-300">Serving 50+ destinations across Nepal</span>
                    </div>

                    {/* Main Heading */}
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-white mb-6 animate-slide-up">
                        Your Journey{' '}
                        <span className="text-gradient">Starts Here</span>
                    </h1>

                    {/* Subheading */}
                    <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
                        Experience the comfort of modern tourist buses. Book your next adventure
                        from Kathmandu to Pokhara and explore the beauty of Nepal.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                        <button
                            onClick={scrollToSearch}
                            className="group px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold text-lg rounded-2xl transition-all duration-300 btn-glow flex items-center gap-2"
                        >
                            Book Now
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button
                            onClick={() => navigate('/register?role=driver')}
                            className="px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-semibold text-lg rounded-2xl border border-white/20 transition-all duration-300"
                        >
                            Become a Driver
                        </button>
                    </div>

                    {/* Feature Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '0.3s' }}>
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className="glass rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 group"
                            >
                                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300">
                                    <feature.icon className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-1">{feature.label}</h3>
                                <p className="text-slate-400 text-sm">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce-gentle">
                <div className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center p-2">
                    <div className="w-1 h-2 bg-white/50 rounded-full animate-pulse" />
                </div>
            </div>
        </section>
    );
}
