import Header from '../components/layout/Header';
import Hero from '../components/landing/Hero';
import MapSection from '../components/landing/MapSection';
import Footer from '../components/layout/Footer';

export default function Landing() {
    return (
        <div className="min-h-screen bg-slate-900">
            <Header />
            <Hero />
            <MapSection />
            <Footer />
        </div>
    );
}
