import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Bus, Mail, Lock, User, Eye, EyeOff, ArrowRight, Phone, Gift, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { referralsApi } from '../services/api';

export default function Register() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { register } = useAuth();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [licenseNumber, setLicenseNumber] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [referralCode, setReferralCode] = useState(searchParams.get('ref') || '');
    const [referralValid, setReferralValid] = useState<{ valid: boolean; referrerName?: string; bonusPoints?: number } | null>(null);
    const [role, setRole] = useState<'PASSENGER' | 'DRIVER'>(searchParams.get('role')?.toUpperCase() === 'DRIVER' ? 'DRIVER' : 'PASSENGER');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Validate referral code when it changes
    useEffect(() => {
        const validateCode = async () => {
            if (referralCode.length >= 6) {
                try {
                    const res = await referralsApi.validateCode(referralCode);
                    if (res.data.valid) {
                        setReferralValid({
                            valid: true,
                            referrerName: res.data.referrerName,
                            bonusPoints: res.data.bonusPoints
                        });
                    } else {
                        setReferralValid({ valid: false });
                    }
                } catch {
                    setReferralValid({ valid: false });
                }
            } else {
                setReferralValid(null);
            }
        };
        validateCode();
    }, [referralCode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (role === 'DRIVER' && !phone) {
            setError('Phone number is required for drivers');
            return;
        }

        if (role === 'DRIVER' && !licenseNumber) {
            setError('License number is required for drivers');
            return;
        }

        setIsLoading(true);

        try {
            const user = await register(name, email, password, role, phone, licenseNumber);

            // Apply referral code after registration if provided and valid
            if (referralCode && referralValid?.valid && role === 'PASSENGER') {
                try {
                    await referralsApi.applyCode(referralCode);
                } catch {
                    // Ignore referral errors, registration already succeeded
                }
            }

            if (user.role === 'DRIVER') {
                navigate('/driver');
            } else if (user.role === 'ADMIN') {
                navigate('/admin');
            } else {
                navigate('/');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex">
            {/* Left Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3 mb-8 justify-center lg:justify-start">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-glow">
                            <Bus className="w-7 h-7 text-white" />
                        </div>
                        <span className="text-2xl font-display font-bold text-gradient">BusGo</span>
                    </Link>

                    {/* Form Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-display font-bold text-white mb-2">Create Account</h1>
                        <p className="text-slate-400">Join BusGo and start your journey today</p>
                    </div>

                    {/* Role Selection */}
                    <div className="flex gap-2 p-1 bg-slate-800/50 rounded-xl mb-8">
                        <button
                            type="button"
                            onClick={() => setRole('PASSENGER')}
                            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${role === 'PASSENGER'
                                ? 'bg-primary-500 text-white'
                                : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            Passenger
                        </button>
                        <button
                            type="button"
                            onClick={() => setRole('DRIVER')}
                            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${role === 'DRIVER'
                                ? 'bg-primary-500 text-white'
                                : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            Driver
                        </button>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400">
                            {error}
                        </div>
                    )}

                    {/* Register Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Full Name
                            </label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="John Doe"
                                    required
                                    className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors"
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    required
                                    className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors"
                                />
                            </div>
                        </div>

                        {/* Phone (for drivers) */}
                        {role === 'DRIVER' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Phone Number *
                                    </label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="+977 9801234567"
                                            required
                                            className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        License Number *
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type="text"
                                            value={licenseNumber}
                                            onChange={(e) => setLicenseNumber(e.target.value)}
                                            placeholder="DL-001-KTM"
                                            required
                                            className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Referral Code (for passengers only) */}
                        {role === 'PASSENGER' && (
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Referral Code (Optional)
                                </label>
                                <div className="relative">
                                    <Gift className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        value={referralCode}
                                        onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                                        placeholder="Enter friend's referral code"
                                        className={`w-full pl-12 pr-12 py-3 bg-slate-800/50 border rounded-xl text-white placeholder-slate-500 focus:outline-none transition-colors ${referralValid?.valid
                                                ? 'border-green-500'
                                                : referralValid === null
                                                    ? 'border-white/10 focus:border-primary-500'
                                                    : 'border-red-500/50'
                                            }`}
                                    />
                                    {referralValid?.valid && (
                                        <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-400" />
                                    )}
                                </div>
                                {referralValid?.valid && (
                                    <p className="mt-2 text-sm text-green-400 flex items-center gap-2">
                                        <Gift className="w-4 h-4" />
                                        Referred by {referralValid.referrerName}! You'll get {referralValid.bonusPoints} bonus points!
                                    </p>
                                )}
                                {referralValid && !referralValid.valid && referralCode.length >= 6 && (
                                    <p className="mt-2 text-sm text-red-400">Invalid referral code</p>
                                )}
                            </div>
                        )}

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full pl-12 pr-12 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl transition-all duration-300 btn-glow flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <div className="w-6 h-6 spinner" />
                            ) : (
                                <>
                                    Create Account
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Login Link */}
                    <p className="mt-8 text-center text-slate-400">
                        Already have an account?{' '}
                        <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                            Login
                        </Link>
                    </p>
                </div>
            </div>

            {/* Right Side - Image */}
            <div className="hidden lg:flex lg:w-1/2 relative">
                <img
                    src="https://images.unsplash.com/photo-1494515843206-f3117d3f51b7?q=80&w=2072&auto=format&fit=crop"
                    alt="Mountain Bus"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-l from-slate-900 via-slate-900/80 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center p-12">
                    <div className="max-w-md text-right">
                        <h2 className="text-4xl font-display font-bold text-white mb-4">
                            Start Your <span className="text-gradient">Adventure</span>
                        </h2>
                        <p className="text-slate-300 text-lg">
                            {role === 'DRIVER'
                                ? 'Join our network of trusted drivers and grow your business with BusGo.'
                                : 'Create an account to book tickets, track journeys, and explore Nepal.'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
