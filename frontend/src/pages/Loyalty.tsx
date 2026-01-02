import { useState, useEffect } from 'react';
import { Award, Gift, Star, Loader2, CheckCircle, Clock, ArrowRight, History } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { useAuth } from '../context/AuthContext';
import { loyaltyApi } from '../services/api';

interface LoyaltyOffer {
    id: string;
    name: string;
    description: string;
    pointsCost: number;
    discountPercent: number;
    validUntil: string;
    category: string;
}

interface RedeemedOffer {
    id: string;
    offerName: string;
    pointsSpent: number;
    claimedAt: string;
}

// Tier definitions - must match backend thresholds
const tiers = [
    { name: 'BRONZE', displayName: 'Bronze', minPoints: 0, color: 'from-amber-700 to-amber-800', benefits: ['Earn 1 pt per Rs. 1', '5% birthday bonus'] },
    { name: 'SILVER', displayName: 'Silver', minPoints: 5000, color: 'from-slate-400 to-slate-500', benefits: ['Earn 1.5 pts per Rs. 1', '5% tier discount', 'Priority booking'] },
    { name: 'GOLD', displayName: 'Gold', minPoints: 15000, color: 'from-yellow-500 to-amber-500', benefits: ['Earn 2 pts per Rs. 1', '10% tier discount', 'Priority booking', 'Free cancellation'] },
];

export default function Loyalty() {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [loyaltyData, setLoyaltyData] = useState({ points: 0, tier: 'BRONZE', totalEarned: 0, discount: 0, nextTier: null as string | null, pointsToNextTier: 0 });
    const [offers, setOffers] = useState<LoyaltyOffer[]>([]);
    const [redeemedOffers, setRedeemedOffers] = useState<RedeemedOffer[]>([]);
    const [claimingId, setClaimingId] = useState<string | null>(null);
    const [claimedOffers, setClaimedOffers] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'redeem' | 'history'>('redeem');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statusRes, offersRes, redeemedRes] = await Promise.all([
                    loyaltyApi.getStatus(),
                    loyaltyApi.getOffers(),
                    loyaltyApi.getRedeemed()
                ]);
                setLoyaltyData(statusRes.data);
                setOffers(offersRes.data.offers || []);
                setRedeemedOffers(redeemedRes.data.redeemed || []);
            } catch (err) {
                console.error('Failed to load loyalty data:', err);
                setError('Failed to load loyalty information');
            } finally {
                setIsLoading(false);
            }
        };
        if (user) fetchData();
        else setIsLoading(false);
    }, [user]);

    // Use the tier from backend API response
    const currentTier = tiers.find(t => t.name === loyaltyData.tier) || tiers[0];
    const nextTier = loyaltyData.nextTier ? tiers.find(t => t.name === loyaltyData.nextTier) : null;
    const progressToNext = nextTier ? ((loyaltyData.totalEarned / nextTier.minPoints) * 100) : 100;

    const handleClaim = async (offer: LoyaltyOffer) => {
        if (loyaltyData.points < offer.pointsCost) return;
        setClaimingId(offer.id);
        setError(null);

        try {
            await loyaltyApi.claimOffer(offer.id);
            setClaimedOffers([...claimedOffers, offer.id]);
            setLoyaltyData({ ...loyaltyData, points: loyaltyData.points - offer.pointsCost });
            // Add to redeemed list
            setRedeemedOffers([{
                id: Date.now().toString(),
                offerName: offer.name,
                pointsSpent: offer.pointsCost,
                claimedAt: new Date().toISOString()
            }, ...redeemedOffers]);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to claim offer');
        } finally {
            setClaimingId(null);
        }
    };

    const getCategoryColor = (cat: string) => {
        switch (cat) {
            case 'discount': return 'from-primary-500 to-primary-600';
            case 'upgrade': return 'from-secondary-500 to-secondary-600';
            case 'free_trip': return 'from-green-500 to-green-600';
            case 'cashback': return 'from-purple-500 to-purple-600';
            default: return 'from-amber-500 to-amber-600';
        }
    };

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-8 h-8 text-primary-500 animate-spin" /></div>;
    }

    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 pt-32 pb-16">
                <div className="container mx-auto px-4 lg:px-8">
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-center">
                            {error}
                        </div>
                    )}

                    {/* Hero */}
                    <div className="text-center mb-12">
                        <div className={`w-24 h-24 bg-gradient-to-br ${currentTier.color} rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl`}>
                            <Award className="w-12 h-12 text-white" />
                        </div>
                        <h1 className="text-4xl font-display font-bold text-white mb-2">Loyalty Rewards</h1>
                        <p className="text-slate-400 text-lg">Earn points on every trip and redeem for exclusive offers</p>
                    </div>

                    {/* Points Card */}
                    <div className="max-w-2xl mx-auto mb-12">
                        <div className={`bg-gradient-to-br ${currentTier.color} rounded-3xl p-8 text-white relative overflow-hidden`}>
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <p className="text-white/70 text-sm">Current Tier</p>
                                        <p className="text-3xl font-bold">{currentTier.displayName}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-white/70 text-sm">Available Points</p>
                                        <p className="text-4xl font-bold">{loyaltyData.points.toLocaleString()}</p>
                                    </div>
                                </div>
                                {loyaltyData.discount > 0 && (
                                    <div className="mb-4 px-3 py-2 bg-white/20 rounded-lg inline-block">
                                        <span className="font-semibold">{loyaltyData.discount}% tier discount</span> on all bookings
                                    </div>
                                )}
                                {nextTier && (
                                    <div>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span>{loyaltyData.pointsToNextTier.toLocaleString()} pts to {nextTier.displayName}</span>
                                            <span>{Math.min(100, Math.round(progressToNext))}%</span>
                                        </div>
                                        <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                                            <div className="h-full bg-white rounded-full transition-all" style={{ width: `${Math.min(100, progressToNext)}%` }} />
                                        </div>
                                    </div>
                                )}
                                <div className="mt-4 text-sm text-white/70">
                                    Total Earned: {loyaltyData.totalEarned.toLocaleString()} pts
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tier Benefits */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-semibold text-white mb-6 text-center">Tier Benefits</h2>
                        <div className="grid md:grid-cols-3 gap-6">
                            {tiers.map(tier => (
                                <div key={tier.name} className={`glass rounded-2xl p-6 ${currentTier.name === tier.name ? 'ring-2 ring-primary-500' : ''}`}>
                                    <div className={`w-12 h-12 bg-gradient-to-br ${tier.color} rounded-xl flex items-center justify-center mb-4`}>
                                        <Star className="w-6 h-6 text-white" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-white mb-1">{tier.displayName}</h3>
                                    <p className="text-slate-400 text-sm mb-4">{tier.minPoints.toLocaleString()}+ points earned</p>
                                    <ul className="space-y-2">
                                        {tier.benefits.map((b, i) => (
                                            <li key={i} className="flex items-center gap-2 text-slate-300 text-sm">
                                                <CheckCircle className="w-4 h-4 text-green-400" />{b}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex items-center gap-4 mb-6">
                        <button
                            onClick={() => setActiveTab('redeem')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${activeTab === 'redeem' ? 'bg-primary-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                        >
                            <Gift className="w-5 h-5" /> Redeem Points
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${activeTab === 'history' ? 'bg-primary-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                        >
                            <History className="w-5 h-5" /> My Redeemed Offers
                            {redeemedOffers.length > 0 && (
                                <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">{redeemedOffers.length}</span>
                            )}
                        </button>
                    </div>

                    {/* Redeem Tab */}
                    {activeTab === 'redeem' && (
                        <div>
                            {offers.length === 0 ? (
                                <div className="text-center py-12 text-slate-400">
                                    No offers available at this time. Check back later!
                                </div>
                            ) : (
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {offers.map(offer => {
                                        const canClaim = loyaltyData.points >= offer.pointsCost;
                                        const isClaimed = claimedOffers.includes(offer.id);
                                        return (
                                            <div key={offer.id} className="glass rounded-2xl overflow-hidden">
                                                <div className={`h-2 bg-gradient-to-r ${getCategoryColor(offer.category)}`} />
                                                <div className="p-6">
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className={`w-12 h-12 bg-gradient-to-br ${getCategoryColor(offer.category)} rounded-xl flex items-center justify-center`}>
                                                            <Gift className="w-6 h-6 text-white" />
                                                        </div>
                                                        <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-lg text-sm font-medium">{offer.pointsCost} pts</span>
                                                    </div>
                                                    <h3 className="text-lg font-semibold text-white mb-2">{offer.name}</h3>
                                                    <p className="text-slate-400 text-sm mb-4">{offer.description}</p>
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-slate-500 flex items-center gap-1"><Clock className="w-4 h-4" />Valid until {new Date(offer.validUntil).toLocaleDateString()}</span>
                                                    </div>
                                                    <button onClick={() => handleClaim(offer)} disabled={!canClaim || isClaimed || claimingId === offer.id}
                                                        className={`mt-4 w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${isClaimed ? 'bg-green-500/20 text-green-400' : canClaim ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                                        {claimingId === offer.id ? <Loader2 className="w-5 h-5 animate-spin" /> : isClaimed ? <><CheckCircle className="w-5 h-5" />Claimed</> : canClaim ? <>Claim Offer<ArrowRight className="w-5 h-5" /></> : 'Not enough points'}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* History Tab */}
                    {activeTab === 'history' && (
                        <div>
                            {redeemedOffers.length === 0 ? (
                                <div className="text-center py-12">
                                    <History className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold text-white mb-2">No Redeemed Offers</h3>
                                    <p className="text-slate-400">You haven't redeemed any offers yet. Go redeem some rewards!</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {redeemedOffers.map(offer => (
                                        <div key={offer.id} className="glass rounded-xl p-4 flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                                                <CheckCircle className="w-6 h-6 text-white" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-white font-medium">{offer.offerName}</h4>
                                                <p className="text-slate-400 text-sm">
                                                    Redeemed on {new Date(offer.claimedAt).toLocaleDateString()} at {new Date(offer.claimedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-amber-400 font-semibold">{offer.pointsSpent} pts</span>
                                                <p className="text-green-400 text-xs">Claimed</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}
