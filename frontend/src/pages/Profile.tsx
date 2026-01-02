import { useState, useEffect, useRef } from 'react';
import { User, Mail, Phone, Camera, Save, Loader2, Award, Calendar, MapPin, CheckCircle, Edit2, Lock, Eye, EyeOff, AlertCircle, Gift, Copy, Share2, Users } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { useAuth } from '../context/AuthContext';
import { loyaltyApi, bookingApi, profileApi, referralsApi } from '../services/api';

interface BookingHistory {
    id: string;
    origin: string;
    destination: string;
    date: string;
    status: string;
}

interface ReferralData {
    referralCode: string;
    shareMessage: string;
    stats: {
        totalReferred: number;
        completedReferrals: number;
        pendingReferrals: number;
        totalPointsEarned: number;
    };
    referrals: Array<{
        id: string;
        referredName: string;
        status: string;
        pointsEarned: number;
        createdAt: string;
    }>;
}

export default function Profile() {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [profilePicture, setProfilePicture] = useState<string | null>(null);
    const [loyaltyData, setLoyaltyData] = useState({ points: 0, tier: 'BRONZE', totalEarned: 0 });
    const [bookings, setBookings] = useState<BookingHistory[]>([]);
    const [referralData, setReferralData] = useState<ReferralData | null>(null);
    const [copied, setCopied] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Password change state
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
    const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
    });

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            try {
                setFormData({
                    name: user.name || '',
                    email: user.email || '',
                    phone: '',
                });

                // Load existing profile picture
                if (user.profilePicture) {
                    setProfilePicture(user.profilePicture);
                }

                try {
                    const loyaltyRes = await loyaltyApi.getStatus();
                    setLoyaltyData(loyaltyRes.data);
                } catch { /* ignore */ }

                try {
                    const bookingsRes = await bookingApi.getUserBookings();
                    setBookings(bookingsRes.data.bookings?.slice(0, 5) || []);
                } catch { /* ignore */ }

                try {
                    const referralRes = await referralsApi.getMyCode();
                    setReferralData(referralRes.data);
                } catch { /* ignore */ }

            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [user]);

    const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setProfilePicture(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setErrorMessage(null);
        try {
            const updateData: { name: string; phone: string; profilePicture?: string } = {
                name: formData.name,
                phone: formData.phone
            };
            if (profilePicture) {
                updateData.profilePicture = profilePicture;
            }
            await profileApi.updateProfile(updateData);
            setIsEditing(false);
            setSuccessMessage('Profile updated successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setErrorMessage(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (passwordData.new !== passwordData.confirm) {
            setErrorMessage('New passwords do not match');
            return;
        }
        if (passwordData.new.length < 6) {
            setErrorMessage('Password must be at least 6 characters');
            return;
        }

        setIsChangingPassword(true);
        setErrorMessage(null);
        try {
            await profileApi.changePassword(passwordData.current, passwordData.new);
            setShowPasswordForm(false);
            setPasswordData({ current: '', new: '', confirm: '' });
            setSuccessMessage('Password changed successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setErrorMessage(err.response?.data?.message || 'Failed to change password');
        } finally {
            setIsChangingPassword(false);
        }
    };

    const copyReferralCode = () => {
        if (referralData?.referralCode) {
            navigator.clipboard.writeText(referralData.referralCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const shareReferral = () => {
        if (referralData?.shareMessage && navigator.share) {
            navigator.share({
                title: 'Join BusGo!',
                text: referralData.shareMessage,
                url: `${window.location.origin}/register?ref=${referralData.referralCode}`
            });
        } else if (referralData?.referralCode) {
            copyReferralCode();
        }
    };

    const getTierColor = (tier: string) => {
        switch (tier) {
            case 'GOLD': return 'from-yellow-500 to-amber-500';
            case 'SILVER': return 'from-slate-400 to-slate-500';
            default: return 'from-amber-700 to-amber-800';
        }
    };

    const getTierName = (tier: string) => {
        switch (tier) {
            case 'GOLD': return 'Gold';
            case 'SILVER': return 'Silver';
            default: return 'Bronze';
        }
    };

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-8 h-8 text-primary-500 animate-spin" /></div>;
    }

    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 pt-32 pb-16">
                <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
                    {successMessage && (
                        <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-xl text-green-400 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5" />{successMessage}
                        </div>
                    )}
                    {errorMessage && (
                        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />{errorMessage}
                        </div>
                    )}

                    {/* Profile Header */}
                    <div className="glass rounded-3xl p-8 mb-8">
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="relative">
                                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center overflow-hidden">
                                    {profilePicture ? (
                                        <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-16 h-16 text-white" />
                                    )}
                                </div>
                                <button onClick={() => fileInputRef.current?.click()}
                                    className="absolute bottom-0 right-0 w-10 h-10 bg-secondary-500 hover:bg-secondary-600 rounded-full flex items-center justify-center transition-colors">
                                    <Camera className="w-5 h-5 text-white" />
                                </button>
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePictureChange} />
                            </div>

                            <div className="flex-1 text-center md:text-left">
                                <h1 className="text-3xl font-display font-bold text-white mb-2">{formData.name}</h1>
                                <p className="text-slate-400 mb-4">{formData.email}</p>
                                <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                                    <div className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${getTierColor(loyaltyData.tier)} rounded-xl text-white`}>
                                        <Award className="w-5 h-5" />
                                        <span className="font-semibold">{getTierName(loyaltyData.tier)} Member</span>
                                    </div>
                                    <div className="px-4 py-2 bg-slate-800 rounded-xl text-slate-300">
                                        <span className="font-semibold text-primary-400">{loyaltyData.points.toLocaleString()}</span> Points
                                    </div>
                                </div>
                            </div>

                            <button onClick={() => setIsEditing(!isEditing)}
                                className="px-6 py-3 bg-primary-500/20 text-primary-400 rounded-xl flex items-center gap-2 hover:bg-primary-500/30 transition-colors">
                                <Edit2 className="w-4 h-4" />{isEditing ? 'Cancel' : 'Edit Profile'}
                            </button>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Profile Details */}
                        <div className="glass rounded-2xl p-6">
                            <h2 className="text-xl font-semibold text-white mb-6">Personal Information</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">Full Name</label>
                                    {isEditing ? (
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white" />
                                        </div>
                                    ) : (
                                        <p className="text-white font-medium flex items-center gap-2"><User className="w-5 h-5 text-slate-500" />{formData.name}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">Email Address</label>
                                    <p className="text-white font-medium flex items-center gap-2"><Mail className="w-5 h-5 text-slate-500" />{formData.email}</p>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">Phone Number</label>
                                    {isEditing ? (
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                            <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                placeholder="+977 98XXXXXXXX"
                                                className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white" />
                                        </div>
                                    ) : (
                                        <p className="text-white font-medium flex items-center gap-2"><Phone className="w-5 h-5 text-slate-500" />{formData.phone || 'Not provided'}</p>
                                    )}
                                </div>

                                {isEditing && (
                                    <button onClick={handleSave} disabled={isSaving}
                                        className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2">
                                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Referral Code Section */}
                        <div className="glass rounded-2xl p-6">
                            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                                <Gift className="w-6 h-6 text-primary-400" />
                                Your Referral Code
                            </h2>

                            {referralData ? (
                                <div className="space-y-6">
                                    {/* Referral Code Display */}
                                    <div className="bg-gradient-to-r from-primary-500/20 to-secondary-500/20 rounded-xl p-4 border border-primary-500/30">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-slate-400 text-sm mb-1">Share this code</p>
                                                <p className="text-2xl font-bold text-white font-mono tracking-wider">{referralData.referralCode}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={copyReferralCode}
                                                    className={`p-3 rounded-xl transition-all ${copied ? 'bg-green-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                                                >
                                                    {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                                </button>
                                                <button
                                                    onClick={shareReferral}
                                                    className="p-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
                                                >
                                                    <Share2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Referral Stats */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                                            <Users className="w-6 h-6 text-primary-400 mx-auto mb-2" />
                                            <p className="text-2xl font-bold text-white">{referralData.stats.totalReferred}</p>
                                            <p className="text-slate-400 text-sm">Friends Referred</p>
                                        </div>
                                        <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                                            <Gift className="w-6 h-6 text-green-400 mx-auto mb-2" />
                                            <p className="text-2xl font-bold text-white">{referralData.stats.totalPointsEarned}</p>
                                            <p className="text-slate-400 text-sm">Points Earned</p>
                                        </div>
                                    </div>

                                    {/* Referral Info */}
                                    <div className="bg-slate-900/50 rounded-xl p-4">
                                        <p className="text-slate-300 text-sm">
                                            🎁 Share your code with friends. When they sign up and complete their first booking,
                                            <span className="text-primary-400 font-semibold"> you get 500 points</span> and
                                            <span className="text-green-400 font-semibold"> they get 200 points!</span>
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-400">
                                    <Gift className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>Loading referral information...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Security / Password Change */}
                    <div className="glass rounded-2xl p-6 mt-8">
                        <h2 className="text-xl font-semibold text-white mb-6">Security</h2>

                        {!showPasswordForm ? (
                            <button onClick={() => setShowPasswordForm(true)}
                                className="w-full p-4 bg-slate-900/50 rounded-xl flex items-center gap-3 hover:bg-slate-800/50 transition-colors">
                                <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
                                    <Lock className="w-5 h-5 text-primary-400" />
                                </div>
                                <div className="text-left">
                                    <p className="text-white font-medium">Change Password</p>
                                    <p className="text-slate-400 text-sm">Update your account password</p>
                                </div>
                            </button>
                        ) : (
                            <div className="space-y-4 max-w-md">
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    <input type={showPasswords.current ? 'text' : 'password'} placeholder="Current Password"
                                        value={passwordData.current} onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                                        className="w-full pl-10 pr-10 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white" />
                                    <button type="button" onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                                        {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    <input type={showPasswords.new ? 'text' : 'password'} placeholder="New Password"
                                        value={passwordData.new} onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                                        className="w-full pl-10 pr-10 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white" />
                                    <button type="button" onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                                        {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    <input type={showPasswords.confirm ? 'text' : 'password'} placeholder="Confirm New Password"
                                        value={passwordData.confirm} onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                                        className="w-full pl-10 pr-10 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white" />
                                    <button type="button" onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                                        {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => { setShowPasswordForm(false); setPasswordData({ current: '', new: '', confirm: '' }); }}
                                        className="flex-1 py-3 bg-slate-700 text-white rounded-xl">Cancel</button>
                                    <button onClick={handleChangePassword} disabled={isChangingPassword || !passwordData.current || !passwordData.new}
                                        className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                                        {isChangingPassword ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update Password'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Recent Trips */}
                    <div className="glass rounded-2xl p-6 mt-8">
                        <h2 className="text-xl font-semibold text-white mb-6">Recent Trips</h2>
                        {bookings.length === 0 ? (
                            <div className="text-center py-8">
                                <MapPin className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                <p className="text-slate-400">No trips yet</p>
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {bookings.map((booking) => (
                                    <div key={booking.id} className="p-4 bg-slate-900/50 rounded-xl flex items-center gap-4">
                                        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                                            <MapPin className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-white font-medium">{booking.origin} → {booking.destination}</p>
                                            <p className="text-slate-400 text-sm flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />{new Date(booking.date).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${booking.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' : booking.status === 'CONFIRMED' ? 'bg-primary-500/20 text-primary-400' : 'bg-slate-700 text-slate-400'}`}>
                                            {booking.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Loyalty Stats */}
                    <div className="glass rounded-2xl p-6 mt-8">
                        <h2 className="text-xl font-semibold text-white mb-6">Loyalty Statistics</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-slate-900/50 rounded-xl">
                                <p className="text-3xl font-bold text-primary-400">{loyaltyData.points.toLocaleString()}</p>
                                <p className="text-slate-400 text-sm">Available Points</p>
                            </div>
                            <div className="text-center p-4 bg-slate-900/50 rounded-xl">
                                <p className="text-3xl font-bold text-secondary-400">{loyaltyData.totalEarned.toLocaleString()}</p>
                                <p className="text-slate-400 text-sm">Total Earned</p>
                            </div>
                            <div className="text-center p-4 bg-slate-900/50 rounded-xl">
                                <p className="text-3xl font-bold text-white">{bookings.length}</p>
                                <p className="text-slate-400 text-sm">Total Trips</p>
                            </div>
                            <div className="text-center p-4 bg-slate-900/50 rounded-xl">
                                <p className={`text-3xl font-bold bg-gradient-to-r ${getTierColor(loyaltyData.tier)} bg-clip-text text-transparent`}>{getTierName(loyaltyData.tier)}</p>
                                <p className="text-slate-400 text-sm">Current Tier</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
