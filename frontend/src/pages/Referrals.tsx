import { useState, useEffect } from 'react';
import { Users, Gift, Share2, Copy, CheckCircle, Loader2, AlertCircle, Award, Clock, ExternalLink } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { useAuth } from '../context/AuthContext';
import { referralsApi } from '../services/api';

interface ReferralData {
    referralCode: string;
    shareMessage: string;
    stats: {
        totalReferred: number;
        completedReferrals: number;
        pendingReferrals: number;
        totalPointsEarned: number;
    };
    referrals: {
        id: string;
        referredName: string;
        status: string;
        pointsEarned: number;
        createdAt: string;
        completedAt: string | null;
    }[];
}

export default function Referrals() {
    const { user } = useAuth();
    const [data, setData] = useState<ReferralData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [applyCode, setApplyCode] = useState('');
    const [isApplying, setIsApplying] = useState(false);
    const [applySuccess, setApplySuccess] = useState<string | null>(null);

    useEffect(() => {
        if (user) fetchReferralData();
    }, [user]);

    const fetchReferralData = async () => {
        try {
            setIsLoading(true);
            const res = await referralsApi.getMyCode();
            setData(res.data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load referral data');
        } finally {
            setIsLoading(false);
        }
    };

    const copyCode = () => {
        if (!data) return;
        navigator.clipboard.writeText(data.referralCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const shareCode = () => {
        if (!data) return;
        if (navigator.share) {
            navigator.share({
                title: 'Join BusGo!',
                text: data.shareMessage,
                url: `https://busgo.com/signup?ref=${data.referralCode}`
            });
        } else {
            copyCode();
        }
    };

    const handleApplyCode = async () => {
        if (!applyCode.trim()) return;
        setIsApplying(true);
        setApplySuccess(null);
        setError(null);
        try {
            const res = await referralsApi.applyCode(applyCode.trim());
            setApplySuccess(res.data.message);
            setApplyCode('');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid referral code');
        } finally {
            setIsApplying(false);
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-900">
                <Header />
                <main className="pt-24 pb-16 text-center py-20">
                    <AlertCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Please Login</h2>
                    <p className="text-slate-400">You need to login to access referrals</p>
                </main>
                <Footer />
            </div>
        );
    }

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

    return (
        <div className="min-h-screen bg-slate-900">
            <Header />
            <main className="pt-24 pb-16">
                <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Gift className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-3xl font-display font-bold text-white mb-2">Refer & <span className="text-gradient">Earn</span></h1>
                        <p className="text-slate-400">Invite friends and earn 500 points for each successful referral!</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" /> {error}
                        </div>
                    )}

                    {applySuccess && (
                        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/50 rounded-xl text-green-400 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5" /> {applySuccess}
                        </div>
                    )}

                    {/* Your Referral Code */}
                    <div className="glass rounded-2xl p-6 mb-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Your Referral Code</h2>
                        <div className="bg-slate-800 rounded-xl p-4 flex items-center justify-between gap-4">
                            <div className="flex-1">
                                <p className="text-2xl font-mono font-bold text-primary-400 tracking-wider">
                                    {data?.referralCode?.slice(0, 8).toUpperCase()}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={copyCode}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center gap-2"
                                >
                                    {copied ? <CheckCircle className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                                <button
                                    onClick={shareCode}
                                    className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg flex items-center gap-2"
                                >
                                    <Share2 className="w-5 h-5" /> Share
                                </button>
                            </div>
                        </div>
                        <p className="text-slate-500 text-sm mt-3">Share this code with friends. When they sign up and complete their first booking, you both earn points!</p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="glass rounded-xl p-4 text-center">
                            <Users className="w-8 h-8 text-primary-400 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-white">{data?.stats.totalReferred || 0}</p>
                            <p className="text-sm text-slate-400">Friends Invited</p>
                        </div>
                        <div className="glass rounded-xl p-4 text-center">
                            <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-white">{data?.stats.completedReferrals || 0}</p>
                            <p className="text-sm text-slate-400">Completed</p>
                        </div>
                        <div className="glass rounded-xl p-4 text-center">
                            <Clock className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-white">{data?.stats.pendingReferrals || 0}</p>
                            <p className="text-sm text-slate-400">Pending</p>
                        </div>
                        <div className="glass rounded-xl p-4 text-center">
                            <Award className="w-8 h-8 text-secondary-400 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-gradient">{data?.stats.totalPointsEarned || 0}</p>
                            <p className="text-sm text-slate-400">Points Earned</p>
                        </div>
                    </div>

                    {/* Apply Referral Code */}
                    <div className="glass rounded-2xl p-6 mb-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Have a Referral Code?</h2>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={applyCode}
                                onChange={(e) => setApplyCode(e.target.value.toUpperCase())}
                                placeholder="Enter referral code"
                                className="flex-1 px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-slate-500 uppercase"
                            />
                            <button
                                onClick={handleApplyCode}
                                disabled={isApplying || !applyCode.trim()}
                                className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl disabled:opacity-50 flex items-center gap-2"
                            >
                                {isApplying ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Apply'}
                            </button>
                        </div>
                    </div>

                    {/* Referral History */}
                    <div className="glass rounded-2xl p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Your Referrals</h2>
                        {!data?.referrals?.length ? (
                            <div className="text-center py-8 text-slate-400">
                                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No referrals yet. Start inviting friends!</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {data.referrals.map((ref) => (
                                    <div key={ref.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-full flex items-center justify-center text-white font-bold">
                                                {ref.referredName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-white font-medium">{ref.referredName}</p>
                                                <p className="text-sm text-slate-400">Joined {new Date(ref.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`px-2 py-1 rounded-lg text-xs ${ref.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                                {ref.status}
                                            </span>
                                            {ref.pointsEarned > 0 && (
                                                <p className="text-sm text-secondary-400 mt-1">+{ref.pointsEarned} pts</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* How it Works */}
                    <div className="mt-8 text-center">
                        <h3 className="text-lg font-semibold text-white mb-6">How It Works</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="glass rounded-xl p-6">
                                <div className="w-12 h-12 bg-primary-500/20 text-primary-400 rounded-xl flex items-center justify-center text-xl font-bold mx-auto mb-3">1</div>
                                <h4 className="text-white font-medium mb-2">Share Your Code</h4>
                                <p className="text-slate-400 text-sm">Send your unique referral code to friends</p>
                            </div>
                            <div className="glass rounded-xl p-6">
                                <div className="w-12 h-12 bg-secondary-500/20 text-secondary-400 rounded-xl flex items-center justify-center text-xl font-bold mx-auto mb-3">2</div>
                                <h4 className="text-white font-medium mb-2">Friend Signs Up</h4>
                                <p className="text-slate-400 text-sm">They create an account using your code</p>
                            </div>
                            <div className="glass rounded-xl p-6">
                                <div className="w-12 h-12 bg-accent-500/20 text-accent-400 rounded-xl flex items-center justify-center text-xl font-bold mx-auto mb-3">3</div>
                                <h4 className="text-white font-medium mb-2">Both Earn Points</h4>
                                <p className="text-slate-400 text-sm">You get 500 pts, they get 200 pts after first booking</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
