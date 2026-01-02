import { useState, useEffect, useRef } from 'react';
import { User, Mail, Phone, Save, Loader2, CheckCircle, Edit2, Lock, Eye, EyeOff, AlertCircle, CreditCard, Star, Bus, MessageSquare, Camera } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { driverApi, profileApi } from '../../services/api';

interface Review {
    id: string;
    rating: number;
    comment: string;
    userName: string;
    route: string;
    createdAt: string;
}

export default function DriverProfile() {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [profilePicture, setProfilePicture] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [driverInfo, setDriverInfo] = useState<any>(null);
    const [recentReviews, setRecentReviews] = useState<Review[]>([]);

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
                    const dashRes = await driverApi.getDashboard();
                    setDriverInfo(dashRes.data);
                    setRecentReviews(dashRes.data.recentReviews || []);
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

    if (isLoading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-primary-500 animate-spin" /></div>;
    }

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-display font-bold text-white mb-1">My Profile</h1>
                <p className="text-slate-400">Manage your account settings</p>
            </div>

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
                        <input type="file" ref={fileInputRef} onChange={handlePictureChange} accept="image/*" className="hidden" />
                        <div
                            onClick={() => isEditing && fileInputRef.current?.click()}
                            className={`w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center overflow-hidden ${isEditing ? 'cursor-pointer hover:opacity-80' : ''}`}
                        >
                            {profilePicture ? (
                                <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-12 h-12 text-white" />
                            )}
                        </div>
                        {isEditing && (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-0 right-0 w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center shadow-lg hover:bg-primary-600"
                            >
                                <Camera className="w-4 h-4 text-white" />
                            </button>
                        )}
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <h2 className="text-2xl font-bold text-white mb-2">{driverInfo?.driver?.name || formData.name}</h2>
                        <p className="text-slate-400 mb-4">{driverInfo?.driver?.email || formData.email}</p>
                        <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                            {driverInfo?.driver && (
                                <>
                                    <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-400 rounded-xl">
                                        <Star className="w-5 h-5 fill-amber-400" />
                                        <span className="font-semibold">{driverInfo.driver.rating?.toFixed(1) || '0.0'} Rating</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-4 py-2 bg-secondary-500/20 text-secondary-400 rounded-xl">
                                        <MessageSquare className="w-5 h-5" />
                                        <span className="font-semibold">{driverInfo.driver.totalReviews || 0} Reviews</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-4 py-2 bg-primary-500/20 text-primary-400 rounded-xl">
                                        <Bus className="w-5 h-5" />
                                        <span className="font-semibold">{driverInfo.buses?.length || 0} Buses</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <button onClick={() => setIsEditing(!isEditing)}
                        className="px-6 py-3 bg-primary-500/20 text-primary-400 rounded-xl flex items-center gap-2 hover:bg-primary-500/30 transition-colors">
                        <Edit2 className="w-4 h-4" />{isEditing ? 'Cancel' : 'Edit Profile'}
                    </button>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Personal Information */}
                <div className="glass rounded-2xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-6">Personal Information</h3>
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
                                <p className="text-white font-medium flex items-center gap-2"><User className="w-5 h-5 text-slate-500" />{driverInfo?.driver?.name || formData.name}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Email Address</label>
                            <p className="text-white font-medium flex items-center gap-2"><Mail className="w-5 h-5 text-slate-500" />{driverInfo?.driver?.email || formData.email}</p>
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
                                <p className="text-white font-medium flex items-center gap-2"><Phone className="w-5 h-5 text-slate-500" />{driverInfo?.driver?.phone || 'Not provided'}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">License Number</label>
                            <p className="text-white font-medium flex items-center gap-2"><CreditCard className="w-5 h-5 text-slate-500" />{driverInfo?.driver?.licenseNumber || 'Not available'}</p>
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

                {/* Security / Password Change */}
                <div className="glass rounded-2xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-6">Security</h3>

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
                        <div className="space-y-4">
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

                    {/* Stats */}
                    {driverInfo && (
                        <div className="mt-6 pt-6 border-t border-white/10">
                            <h4 className="text-lg font-semibold text-white mb-4">Statistics</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-900/50 rounded-xl text-center">
                                    <p className="text-2xl font-bold text-primary-400">{driverInfo.totalTrips || 0}</p>
                                    <p className="text-slate-400 text-sm">Total Trips</p>
                                </div>
                                <div className="p-4 bg-slate-900/50 rounded-xl text-center">
                                    <p className="text-2xl font-bold text-secondary-400">{driverInfo.driver?.totalReviews || 0}</p>
                                    <p className="text-slate-400 text-sm">Reviews</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Reviews Section */}
            <div className="glass rounded-2xl p-6 mt-8">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                        <MessageSquare className="w-6 h-6 text-amber-400" />
                        Recent Reviews
                    </h3>
                    <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                        <span className="text-white font-bold">{driverInfo?.driver?.rating?.toFixed(1) || '0.0'}</span>
                        <span className="text-slate-400">({driverInfo?.driver?.totalReviews || 0} total)</span>
                    </div>
                </div>

                {recentReviews.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        <Star className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p className="text-lg">No reviews yet</p>
                        <p className="text-sm">Complete trips and passengers will rate your service</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                        {recentReviews.map((review) => (
                            <div key={review.id} className="bg-slate-900/50 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white font-bold">
                                            {review.userName.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">{review.userName}</p>
                                            <p className="text-slate-400 text-xs">{review.route}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Star
                                                key={star}
                                                className={`w-4 h-4 ${star <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                                {review.comment && (
                                    <p className="text-slate-300 text-sm mb-2">"{review.comment}"</p>
                                )}
                                <p className="text-slate-500 text-xs">
                                    {new Date(review.createdAt).toLocaleDateString('en-US', {
                                        year: 'numeric', month: 'short', day: 'numeric'
                                    })}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
