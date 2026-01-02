import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Bus, CreditCard, CheckCircle, Banknote, AlertCircle, Loader2, Award, Gift, Percent } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { useAuth } from '../context/AuthContext';
import { searchApi, bookingApi, loyaltyApi } from '../services/api';

type PaymentMethod = 'online' | 'cash';

interface ScheduleInfo {
    id: string;
    busName: string;
    operator: string;
    origin: string;
    destination: string;
    departureTime: string;
    arrivalTime: string;
    price: number;
    driverPhone: string;
}

interface LoyaltyInfo {
    currentPoints: number;
    tier: string;
    tierDiscount: number;
}

interface AvailableReward {
    id: string;
    name: string;
    discountPercent: number;
    category: string;
    claimedAt: string;
}

export default function Checkout() {
    const { scheduleId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [scheduleInfo, setScheduleInfo] = useState<ScheduleInfo | null>(null);
    const [loyaltyInfo, setLoyaltyInfo] = useState<LoyaltyInfo | null>(null);
    const [availableRewards, setAvailableRewards] = useState<AvailableReward[]>([]);
    const [selectedReward, setSelectedReward] = useState<AvailableReward | null>(null);
    const [passengerName, setPassengerName] = useState(user?.name || '');
    const [passengerEmail, setPassengerEmail] = useState(user?.email || '');
    const [passengerPhone, setPassengerPhone] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [usePoints, setUsePoints] = useState(false);
    const [pointsToUse, setPointsToUse] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [bookingId, setBookingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const selectedSeats = searchParams.get('seats')?.split(',').filter(s => s) || [];

    useEffect(() => {
        if (!user) {
            navigate(`/login?redirect=/checkout/${scheduleId}?seats=${selectedSeats.join(',')}`);
            return;
        }
        if (selectedSeats.length === 0) {
            navigate(`/seats/${scheduleId}`);
            return;
        }

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [scheduleRes, loyaltyRes, rewardsRes] = await Promise.all([
                    searchApi.getSchedule(scheduleId!),
                    loyaltyApi.getStatus().catch(() => ({ data: null })),
                    loyaltyApi.getAvailableRewards().catch(() => ({ data: { rewards: [] } }))
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
                    driverPhone: sched.driverPhone
                });

                // Backend returns: { points, tier, totalEarned, discount, nextTier, pointsToNextTier }
                if (loyaltyRes.data) {
                    setLoyaltyInfo({
                        currentPoints: loyaltyRes.data.points || 0,
                        tier: loyaltyRes.data.tier || 'BRONZE',
                        tierDiscount: loyaltyRes.data.discount || 0
                    });
                }

                // Set available rewards
                setAvailableRewards(rewardsRes.data.rewards || []);
            } catch (err: any) {
                console.error('Failed to load checkout data:', err);
                setError(err.response?.data?.message || 'Failed to load schedule information');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [user, scheduleId, selectedSeats.length, navigate]);

    const baseTotal = selectedSeats.length * (scheduleInfo?.price || 0);
    const tierDiscountAmount = loyaltyInfo ? Math.round(baseTotal * (loyaltyInfo.tierDiscount / 100)) : 0;
    const afterTierDiscount = baseTotal - tierDiscountAmount;

    // Apply reward discount if selected
    const rewardDiscountAmount = selectedReward ? Math.round(afterTierDiscount * (selectedReward.discountPercent / 100)) : 0;
    const afterRewardDiscount = afterTierDiscount - rewardDiscountAmount;

    const pointsValue = usePoints ? Math.min(pointsToUse / 10, afterRewardDiscount * 0.5) : 0;
    const finalTotal = Math.round(afterRewardDiscount - pointsValue);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passengerName || !passengerEmail || !passengerPhone || !scheduleInfo) return;

        setIsProcessing(true);
        setError(null);

        try {
            const response = await bookingApi.createBooking({
                scheduleId: scheduleInfo.id,
                seats: selectedSeats,
                passengerName,
                passengerEmail,
                passengerPhone,
                paymentMethod: paymentMethod === 'online' ? 'ONLINE' : 'CASH',
                loyaltyPointsToUse: usePoints ? pointsToUse : 0,
                rewardId: selectedReward?.id || undefined
            });

            setBookingId(response.data.booking.id);
            setIsSuccess(true);

            setTimeout(() => {
                navigate(`/booking/confirmation/${response.data.booking.id}`);
            }, 2000);
        } catch (err: any) {
            console.error('Booking failed:', err);
            setError(err.response?.data?.message || 'Failed to create booking. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    if (!user) return null;

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

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-center animate-fade-in">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-display font-bold text-white mb-2">
                        {paymentMethod === 'online' ? 'Payment Successful!' : 'Booking Confirmed!'}
                    </h2>
                    <p className="text-slate-400">
                        {paymentMethod === 'cash' ? 'Please pay the driver when boarding.' : 'Redirecting to your booking...'}
                    </p>
                    <p className="text-slate-500 text-sm mt-2">Booking ID: {bookingId}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900">
            <Header />
            <main className="pt-24 pb-16">
                <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
                    <Link to={`/seats/${scheduleId}`} className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
                        <ChevronLeft className="w-5 h-5" /> Back to Seat Selection
                    </Link>

                    <h1 className="text-3xl font-display font-bold text-white mb-8">Complete Your <span className="text-gradient">Booking</span></h1>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" /> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="grid lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-6">
                                {/* Passenger Details */}
                                <div className="glass rounded-2xl p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">Passenger Details</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">Full Name *</label>
                                            <input type="text" value={passengerName} onChange={(e) => setPassengerName(e.target.value)} required
                                                className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary-500" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">Email Address *</label>
                                            <input type="email" value={passengerEmail} onChange={(e) => setPassengerEmail(e.target.value)} required
                                                className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary-500" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">Phone Number *</label>
                                            <input type="tel" value={passengerPhone} onChange={(e) => setPassengerPhone(e.target.value)} placeholder="+977 9801234567" required
                                                className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary-500" />
                                        </div>
                                    </div>
                                </div>

                                {/* Available Rewards */}
                                {availableRewards.length > 0 && (
                                    <div className="glass rounded-2xl p-6">
                                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                            <Gift className="w-5 h-5 text-green-500" /> Your Available Rewards
                                        </h3>
                                        <p className="text-slate-400 text-sm mb-4">You have redeemed offers that can be applied to this booking:</p>
                                        <div className="space-y-3">
                                            {availableRewards.map(reward => (
                                                <label key={reward.id} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedReward?.id === reward.id ? 'border-green-500 bg-green-500/10' : 'border-white/10 hover:border-white/20'}`}>
                                                    <input
                                                        type="radio"
                                                        name="reward"
                                                        checked={selectedReward?.id === reward.id}
                                                        onChange={() => setSelectedReward(selectedReward?.id === reward.id ? null : reward)}
                                                        className="w-5 h-5 text-green-500"
                                                    />
                                                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                                                        <Percent className="w-6 h-6 text-white" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-white font-medium">{reward.name}</p>
                                                        <p className="text-slate-400 text-sm">Claimed on {new Date(reward.claimedAt).toLocaleDateString()}</p>
                                                    </div>
                                                    <span className="text-green-400 font-bold text-lg">{reward.discountPercent}% OFF</span>
                                                </label>
                                            ))}
                                            {selectedReward && (
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedReward(null)}
                                                    className="text-slate-400 text-sm hover:text-white"
                                                >
                                                    Clear selection
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Loyalty Points */}
                                {loyaltyInfo && loyaltyInfo.currentPoints > 0 && (
                                    <div className="glass rounded-2xl p-6">
                                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Award className="w-5 h-5 text-yellow-500" /> Use Loyalty Points</h3>
                                        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl p-4 mb-4">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="text-white font-medium">{loyaltyInfo.tier} Member</p>
                                                    <p className="text-slate-400 text-sm">{loyaltyInfo.tierDiscount}% tier discount applied</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-2xl font-bold text-yellow-400">{loyaltyInfo.currentPoints}</p>
                                                    <p className="text-slate-400 text-xs">points available</p>
                                                </div>
                                            </div>
                                        </div>
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input type="checkbox" checked={usePoints} onChange={(e) => { setUsePoints(e.target.checked); if (e.target.checked) setPointsToUse(Math.min(loyaltyInfo.currentPoints, Math.floor(afterRewardDiscount * 0.5 * 10))); }}
                                                className="w-5 h-5 rounded" />
                                            <span className="text-white">Use points for this booking (10 points = Rs. 1)</span>
                                        </label>
                                        {usePoints && (
                                            <div className="mt-4">
                                                <input type="range" min="0" max={Math.min(loyaltyInfo.currentPoints, Math.floor(afterRewardDiscount * 0.5 * 10))} value={pointsToUse} onChange={(e) => setPointsToUse(parseInt(e.target.value))}
                                                    className="w-full" />
                                                <div className="flex justify-between text-sm mt-2">
                                                    <span className="text-slate-400">Using {pointsToUse} points</span>
                                                    <span className="text-green-400">-Rs. {Math.round(pointsToUse / 10)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Payment Method */}
                                <div className="glass rounded-2xl p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">Payment Method</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button type="button" onClick={() => setPaymentMethod('cash')}
                                            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${paymentMethod === 'cash' ? 'border-primary-500 bg-primary-500/10' : 'border-white/10 hover:border-white/30'}`}>
                                            <Banknote className={`w-8 h-8 ${paymentMethod === 'cash' ? 'text-primary-400' : 'text-slate-400'}`} />
                                            <span className={`font-medium ${paymentMethod === 'cash' ? 'text-white' : 'text-slate-400'}`}>Pay Cash</span>
                                            <span className="text-xs text-slate-500">Pay driver</span>
                                        </button>
                                        <button type="button" onClick={() => setPaymentMethod('online')}
                                            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${paymentMethod === 'online' ? 'border-primary-500 bg-primary-500/10' : 'border-white/10 hover:border-white/30'}`}>
                                            <CreditCard className={`w-8 h-8 ${paymentMethod === 'online' ? 'text-primary-400' : 'text-slate-400'}`} />
                                            <span className={`font-medium ${paymentMethod === 'online' ? 'text-white' : 'text-slate-400'}`}>Pay Online</span>
                                            <span className="text-xs text-slate-500">Coming soon</span>
                                        </button>
                                    </div>

                                    {paymentMethod === 'cash' && (
                                        <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                                            <div className="flex items-start gap-3">
                                                <Banknote className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-yellow-400 font-medium mb-1">Pay When Boarding</p>
                                                    <p className="text-slate-300 text-sm">Your seats will be reserved. Please arrive 30 minutes early and pay Rs. {finalTotal} in cash to the driver.</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button type="submit" disabled={isProcessing || !passengerName || !passengerEmail || !passengerPhone}
                                    className="w-full px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold text-lg rounded-xl transition-all duration-300 btn-glow flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : `Confirm Booking - Rs. ${finalTotal}`}
                                </button>
                            </div>

                            {/* Order Summary */}
                            <div className="lg:col-span-1">
                                <div className="glass rounded-2xl p-6 sticky top-24">
                                    <h3 className="text-lg font-semibold text-white mb-4">Order Summary</h3>
                                    {scheduleInfo && (
                                        <>
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

                                            <div className="mb-6 pb-6 border-b border-white/10">
                                                <h4 className="text-sm font-medium text-slate-400 mb-3">Selected Seats</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedSeats.map((seatId) => <span key={seatId} className="px-3 py-1.5 bg-primary-500/20 text-primary-400 rounded-lg text-sm font-medium">{seatId}</span>)}
                                                </div>
                                            </div>

                                            <div className="space-y-3 mb-6">
                                                <div className="flex justify-between text-sm"><span className="text-slate-400">Ticket Price</span><span className="text-white">Rs. {scheduleInfo.price}</span></div>
                                                <div className="flex justify-between text-sm"><span className="text-slate-400">Seats</span><span className="text-white">× {selectedSeats.length}</span></div>
                                                <div className="flex justify-between text-sm"><span className="text-slate-400">Subtotal</span><span className="text-white">Rs. {baseTotal}</span></div>
                                                {tierDiscountAmount > 0 && <div className="flex justify-between text-sm"><span className="text-green-400">Tier Discount ({loyaltyInfo?.tierDiscount}%)</span><span className="text-green-400">-Rs. {tierDiscountAmount}</span></div>}
                                                {rewardDiscountAmount > 0 && <div className="flex justify-between text-sm"><span className="text-green-400">Reward ({selectedReward?.discountPercent}% OFF)</span><span className="text-green-400">-Rs. {rewardDiscountAmount}</span></div>}
                                                {pointsValue > 0 && <div className="flex justify-between text-sm"><span className="text-yellow-400">Points Redemption</span><span className="text-yellow-400">-Rs. {Math.round(pointsValue)}</span></div>}
                                            </div>

                                            <div className="flex justify-between items-center pt-4 border-t border-white/10">
                                                <span className="text-lg font-medium text-white">Total</span>
                                                <span className="text-2xl font-bold text-gradient">Rs. {finalTotal}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </main>
            <Footer />
        </div>
    );
}
