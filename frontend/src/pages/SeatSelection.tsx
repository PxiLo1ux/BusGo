import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Bus, Info, Loader2, AlertCircle } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import BusSeatLayout from '../components/BusSeatLayout';
import { useAuth } from '../context/AuthContext';
import { searchApi } from '../services/api';

interface Seat {
    id: string;
    name: string;
    row: number;
    column: string;
    position: 'REGULAR' | 'BACK' | 'TOILET';
    isBooked: boolean;
}

interface ScheduleInfo {
    id: string;
    busName: string;
    operator: string;
    origin: string;
    destination: string;
    departureTime: string;
    arrivalTime: string;
    price: number;
    hasToilet: boolean;
    capacity: number;
}

export default function SeatSelection() {
    const { scheduleId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [seats, setSeats] = useState<Seat[]>([]);
    const [scheduleInfo, setScheduleInfo] = useState<ScheduleInfo | null>(null);
    const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!scheduleId) return;
            setIsLoading(true);
            setError(null);
            try {
                const [scheduleRes, seatsRes] = await Promise.all([
                    searchApi.getSchedule(scheduleId),
                    searchApi.getSeats(scheduleId)
                ]);

                const sched = scheduleRes.data.schedule;
                setScheduleInfo({
                    id: sched.id,
                    busName: sched.busName,
                    operator: sched.operator,
                    origin: sched.origin,
                    destination: sched.destination,
                    departureTime: sched.departureTime,
                    arrivalTime: sched.arrivalTime,
                    price: sched.dynamicPrice || sched.price,
                    hasToilet: seatsRes.data.busInfo.hasToilet,
                    capacity: seatsRes.data.busInfo.capacity
                });
                setSeats(seatsRes.data.seats || []);
            } catch (err: any) {
                console.error('Failed to load seats:', err);
                setError(err.response?.data?.message || 'Failed to load seat information');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [scheduleId]);

    const handleSeatClick = (seat: Seat) => {
        if (seat.isBooked || seat.position === 'TOILET') return;
        setSelectedSeats((prev) => {
            if (prev.includes(seat.name)) return prev.filter((id) => id !== seat.name);
            return [...prev, seat.name];
        });
    };

    const handleProceed = () => {
        if (selectedSeats.length === 0) return;
        if (!user) {
            navigate(`/login?redirect=/checkout/${scheduleId}?seats=${selectedSeats.join(',')}`);
            return;
        }
        navigate(`/checkout/${scheduleId}?seats=${selectedSeats.join(',')}`);
    };

    const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    const totalPrice = selectedSeats.length * (scheduleInfo?.price || 0);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-900">
                <Header />
                <main className="pt-24 pb-16 flex items-center justify-center">
                    <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
                </main>
                <Footer />
            </div>
        );
    }

    if (error || !scheduleInfo) {
        return (
            <div className="min-h-screen bg-slate-900">
                <Header />
                <main className="pt-24 pb-16">
                    <div className="container mx-auto px-4 text-center py-20">
                        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">Failed to Load</h2>
                        <p className="text-slate-400 mb-6">{error || 'Schedule not found'}</p>
                        <Link to="/search" className="px-6 py-3 bg-primary-500 text-white rounded-xl">Back to Search</Link>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900">
            <Header />
            <main className="pt-24 pb-16">
                <div className="container mx-auto px-4 lg:px-8">
                    <Link to="/search" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
                        <ChevronLeft className="w-5 h-5" /> Back to Search
                    </Link>

                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Bus Layout */}
                        <div className="lg:col-span-2">
                            <div className="glass rounded-3xl p-8">
                                <h2 className="text-2xl font-display font-bold text-white mb-2">Select Your Seats</h2>
                                <p className="text-slate-400 text-sm mb-6">{scheduleInfo.busName} • {scheduleInfo.capacity} seats{scheduleInfo.hasToilet ? ' • With Toilet' : ''}</p>

                                <div className="flex flex-col items-center">
                                    {/* Bus Seat Layout Component */}
                                    <BusSeatLayout
                                        capacity={scheduleInfo.capacity}
                                        hasToilet={scheduleInfo.hasToilet}
                                        hasWifi={true}
                                        hasTV={true}
                                        hasAC={true}
                                        hasCharging={true}
                                        busName={scheduleInfo.busName}
                                        selectedSeats={selectedSeats}
                                        bookedSeats={seats.filter(s => s.isBooked).map(s => s.name)}
                                        onSeatClick={(seatName) => {
                                            const seat = seats.find(s => s.name === seatName);
                                            if (seat) handleSeatClick(seat);
                                        }}
                                        showLegend={true}
                                        interactive={true}
                                    />

                                    <div className="mt-6 flex items-start gap-2 text-sm text-slate-400 max-w-md text-center">
                                        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                        <p>Columns A-B are on the door side. Columns C-D are on the driver side.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Booking Summary */}
                        <div className="lg:col-span-1">
                            <div className="glass rounded-3xl p-6 sticky top-24">
                                <h3 className="text-xl font-display font-bold text-white mb-6">Booking Summary</h3>

                                <div className="space-y-4 mb-6 pb-6 border-b border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                                            <Bus className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-white">{scheduleInfo.busName}</h4>
                                            <p className="text-sm text-slate-400">{scheduleInfo.operator}</p>
                                        </div>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-xl p-4">
                                        <div className="flex justify-between mb-2">
                                            <div><p className="text-lg font-bold text-white">{formatTime(scheduleInfo.departureTime)}</p><p className="text-sm text-slate-400">{scheduleInfo.origin}</p></div>
                                            <div className="text-center"><p className="text-xs text-slate-500">→</p></div>
                                            <div className="text-right"><p className="text-lg font-bold text-white">{formatTime(scheduleInfo.arrivalTime)}</p><p className="text-sm text-slate-400">{scheduleInfo.destination}</p></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <h4 className="text-sm font-medium text-slate-400 mb-3">Selected Seats</h4>
                                    {selectedSeats.length === 0 ? (
                                        <p className="text-slate-500 text-sm">No seats selected</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {selectedSeats.map((seatId) => <span key={seatId} className="px-3 py-1.5 bg-primary-500/20 text-primary-400 rounded-lg text-sm font-medium">{seatId}</span>)}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3 mb-6 pb-6 border-b border-white/10">
                                    <div className="flex justify-between text-sm"><span className="text-slate-400">Ticket Price</span><span className="text-white">Rs. {scheduleInfo.price}</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-slate-400">Seats</span><span className="text-white">× {selectedSeats.length}</span></div>
                                </div>

                                <div className="flex justify-between items-center mb-6">
                                    <span className="text-lg font-medium text-white">Total</span>
                                    <span className="text-2xl font-bold text-gradient">Rs. {totalPrice}</span>
                                </div>

                                {!user && selectedSeats.length > 0 && (
                                    <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                                        <p className="text-yellow-400 text-sm">You'll need to login before checkout</p>
                                    </div>
                                )}

                                <button onClick={handleProceed} disabled={selectedSeats.length === 0}
                                    className="w-full px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl transition-all duration-300 btn-glow disabled:opacity-50 disabled:cursor-not-allowed">
                                    {user ? 'Proceed to Checkout' : 'Login & Proceed'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
