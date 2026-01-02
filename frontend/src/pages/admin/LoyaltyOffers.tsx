import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, Plus, Edit, Trash2, X, Loader2, CheckCircle, Users, TrendingUp, Calendar, Percent, Ticket, Award, Zap, MessageCircle, ArrowUpDown, Eye, ChevronRight, Star, MapPin, CreditCard } from 'lucide-react';
import { adminApi } from '../../services/api';

interface LoyaltyOffer {
    id: string;
    name: string;
    description: string;
    pointsCost: number;
    discountPercent: number;
    validUntil: string;
    isActive: boolean;
    category: string;
    createdAt: string;
    claimCount?: number;
}

interface Claim {
    id: string;
    offerName: string;
    points: number;
    claimedAt: string;
    user: {
        id: string;
        name: string;
        email: string;
        phone: string;
        joinedAt: string;
    } | null;
}

interface UserProfile {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    createdAt: string;
    loyalty: { points: number; tier: string; totalEarned: number };
    stats: { totalBookings: number; totalSpent: number; friendsReferred: number; referralPointsEarned: number };
    recentBookings: { id: string; route: string; date: string; amount: number; status: string }[];
    redeemedOffers: { id: string; name: string; points: number; date: string }[];
}

const categories = [
    { value: 'discount', label: 'Discount', icon: Percent, color: 'from-primary-500 to-primary-600' },
    { value: 'upgrade', label: 'Seat Upgrade', icon: Award, color: 'from-secondary-500 to-secondary-600' },
    { value: 'free_trip', label: 'Free Trip', icon: Ticket, color: 'from-green-500 to-green-600' },
    { value: 'special', label: 'Special Offer', icon: Zap, color: 'from-amber-500 to-amber-600' },
    { value: 'cashback', label: 'Points Bonus', icon: TrendingUp, color: 'from-purple-500 to-purple-600' },
];

type FilterType = 'all' | 'active' | 'expired' | 'category';
type SortType = 'newest' | 'oldest' | 'points_high' | 'points_low' | 'claims';

export default function LoyaltyOffers() {
    const navigate = useNavigate();
    const [offers, setOffers] = useState<LoyaltyOffer[]>([]);
    const [claims, setClaims] = useState<Claim[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [claimsModalOpen, setClaimsModalOpen] = useState(false);
    const [profileModalOpen, setProfileModalOpen] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [editingOffer, setEditingOffer] = useState<LoyaltyOffer | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Filtering & Sorting
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<SortType>('newest');

    const [formData, setFormData] = useState({
        name: '', description: '', pointsCost: 500, discountPercent: 10, validUntil: '', category: 'discount', isActive: true
    });

    useEffect(() => {
        loadOffers();
    }, []);

    const loadOffers = async () => {
        try {
            setIsLoading(true);
            const res = await adminApi.getLoyaltyOffers();
            setOffers(res.data.offers || []);
        } catch (err) {
            console.error('Failed to load offers', err);
            setError('Failed to load offers');
        } finally {
            setIsLoading(false);
        }
    };

    const loadClaims = async () => {
        try {
            const res = await adminApi.getLoyaltyClaims();
            setClaims(res.data.claims || []);
            setClaimsModalOpen(true);
        } catch (err) {
            console.error('Failed to load claims', err);
        }
    };

    const viewUserProfile = async (userId: string) => {
        setLoadingProfile(true);
        try {
            const res = await adminApi.getUserProfile(userId);
            setSelectedProfile(res.data.profile);
            setProfileModalOpen(true);
        } catch (err) {
            console.error('Failed to load profile', err);
        } finally {
            setLoadingProfile(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            if (editingOffer) {
                await adminApi.updateLoyaltyOffer(editingOffer.id, formData);
            } else {
                await adminApi.createLoyaltyOffer(formData);
            }
            await loadOffers();
            setIsModalOpen(false);
            resetForm();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to save offer');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await adminApi.deleteLoyaltyOffer(id);
            setOffers(offers.filter(o => o.id !== id));
            setDeleteConfirm(null);
        } catch (err) {
            console.error('Failed to delete offer', err);
        }
    };

    const toggleActive = async (id: string) => {
        try {
            await adminApi.toggleLoyaltyOffer(id);
            setOffers(offers.map(o => o.id === id ? { ...o, isActive: !o.isActive } : o));
        } catch (err) {
            console.error('Failed to toggle offer', err);
        }
    };

    const resetForm = () => {
        setFormData({ name: '', description: '', pointsCost: 500, discountPercent: 10, validUntil: '', category: 'discount', isActive: true });
        setEditingOffer(null);
        setError(null);
    };

    const openEditModal = (offer: LoyaltyOffer) => {
        setEditingOffer(offer);
        setFormData({
            name: offer.name,
            description: offer.description,
            pointsCost: offer.pointsCost,
            discountPercent: offer.discountPercent,
            validUntil: new Date(offer.validUntil).toISOString().split('T')[0],
            category: offer.category,
            isActive: offer.isActive
        });
        setIsModalOpen(true);
    };

    const getCategoryInfo = (cat: string) => categories.find(c => c.value === cat) || categories[0];
    const isExpired = (date: string) => new Date(date) < new Date();

    // Apply filters and sorting
    const getFilteredOffers = () => {
        let filtered = [...offers];

        // Apply active filter from stats cards
        if (activeFilter === 'active') {
            filtered = filtered.filter(o => o.isActive && !isExpired(o.validUntil));
        } else if (activeFilter === 'expired') {
            filtered = filtered.filter(o => isExpired(o.validUntil));
        }

        // Apply category filter
        if (categoryFilter) {
            filtered = filtered.filter(o => o.category === categoryFilter);
        }

        // Apply sorting
        switch (sortBy) {
            case 'oldest':
                filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                break;
            case 'points_high':
                filtered.sort((a, b) => b.pointsCost - a.pointsCost);
                break;
            case 'points_low':
                filtered.sort((a, b) => a.pointsCost - b.pointsCost);
                break;
            case 'claims':
                filtered.sort((a, b) => (b.claimCount || 0) - (a.claimCount || 0));
                break;
            default: // newest
                filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }

        return filtered;
    };

    const filteredOffers = getFilteredOffers();
    const totalClaims = offers.reduce((sum, o) => sum + (o.claimCount || 0), 0);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-white mb-1">Loyalty Offers</h1>
                    <p className="text-slate-400">Create and manage rewards that passengers can claim with points</p>
                </div>
                <button onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl btn-glow flex items-center gap-2">
                    <Plus className="w-5 h-5" />Add New Offer
                </button>
            </div>

            {/* Stats - Clickable for filtering */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                    onClick={() => { setActiveFilter('all'); setCategoryFilter(null); }}
                    className={`glass rounded-xl p-4 text-left transition-all ${activeFilter === 'all' && !categoryFilter ? 'ring-2 ring-primary-500' : 'hover:bg-white/5'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center">
                            <Gift className="w-5 h-5 text-primary-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{filteredOffers.length}</p>
                            <p className="text-slate-400 text-sm">Total Offers</p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => { setActiveFilter('active'); setCategoryFilter(null); }}
                    className={`glass rounded-xl p-4 text-left transition-all ${activeFilter === 'active' ? 'ring-2 ring-green-500' : 'hover:bg-white/5'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-green-400">{offers.filter(o => o.isActive && !isExpired(o.validUntil)).length}</p>
                            <p className="text-slate-400 text-sm">Active</p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => { setActiveFilter('expired'); setCategoryFilter(null); }}
                    className={`glass rounded-xl p-4 text-left transition-all ${activeFilter === 'expired' ? 'ring-2 ring-amber-500' : 'hover:bg-white/5'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-amber-400">{offers.filter(o => isExpired(o.validUntil)).length}</p>
                            <p className="text-slate-400 text-sm">Expired</p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={loadClaims}
                    className="glass rounded-xl p-4 text-left transition-all hover:bg-white/5 group"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-secondary-500/20 rounded-xl flex items-center justify-center">
                            <Users className="w-5 h-5 text-secondary-400" />
                        </div>
                        <div className="flex-1">
                            <p className="text-2xl font-bold text-secondary-400">{totalClaims}</p>
                            <p className="text-slate-400 text-sm">Total Claims</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-secondary-400 transition-colors" />
                    </div>
                </button>
            </div>

            {/* Category Filter - Clickable */}
            <div className="flex flex-wrap gap-2">
                {categories.map(cat => {
                    const count = offers.filter(o => o.category === cat.value).length;
                    const isSelected = categoryFilter === cat.value;
                    return (
                        <button
                            key={cat.value}
                            onClick={() => {
                                setCategoryFilter(isSelected ? null : cat.value);
                                setActiveFilter('all');
                            }}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all ${isSelected
                                ? 'bg-primary-500 text-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                        >
                            <cat.icon className="w-4 h-4" />
                            <span>{cat.label}</span>
                            <span className={`px-1.5 py-0.5 rounded text-xs ${isSelected ? 'bg-white/20' : 'bg-white/10 text-slate-400'}`}>{count}</span>
                        </button>
                    );
                })}
            </div>

            {/* Sort & View Info */}
            <div className="flex items-center justify-between">
                <p className="text-slate-400 text-sm">
                    Showing <span className="text-white font-medium">{filteredOffers.length}</span> of {offers.length} offers
                    {categoryFilter && <span className="text-primary-400"> • {getCategoryInfo(categoryFilter).label}</span>}
                    {activeFilter !== 'all' && <span className="text-primary-400"> • {activeFilter === 'active' ? 'Active Only' : 'Expired Only'}</span>}
                </p>
                <div className="flex items-center gap-2">
                    <ArrowUpDown className="w-4 h-4 text-slate-500" />
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortType)}
                        className="bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:border-primary-500"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="points_high">Points: High to Low</option>
                        <option value="points_low">Points: Low to High</option>
                        <option value="claims">Most Claimed</option>
                    </select>
                </div>
            </div>

            {/* Offers Grid */}
            {filteredOffers.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                    <Gift className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">
                        {offers.length === 0 ? 'No Offers Yet' : 'No Matching Offers'}
                    </h3>
                    <p className="text-slate-400 mb-6">
                        {offers.length === 0
                            ? 'Create your first loyalty offer to reward passengers'
                            : 'Try adjusting your filters'}
                    </p>
                    {offers.length === 0 && (
                        <button onClick={() => { resetForm(); setIsModalOpen(true); }}
                            className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl">
                            Create First Offer
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredOffers.map(offer => {
                        const catInfo = getCategoryInfo(offer.category);
                        const expired = isExpired(offer.validUntil);
                        return (
                            <div key={offer.id} className={`glass rounded-2xl overflow-hidden transition-all hover:scale-[1.02] ${!offer.isActive || expired ? 'opacity-60' : ''}`}>
                                <div className={`h-2 bg-gradient-to-r ${offer.isActive && !expired ? catInfo.color : 'from-slate-600 to-slate-700'}`} />
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`w-12 h-12 bg-gradient-to-br ${catInfo.color} rounded-xl flex items-center justify-center`}>
                                            <catInfo.icon className="w-6 h-6 text-white" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {expired && (
                                                <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs font-medium">Expired</span>
                                            )}
                                            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${offer.category === 'discount' ? 'bg-primary-500/20 text-primary-400' :
                                                offer.category === 'upgrade' ? 'bg-secondary-500/20 text-secondary-400' :
                                                    offer.category === 'free_trip' ? 'bg-green-500/20 text-green-400' :
                                                        offer.category === 'cashback' ? 'bg-purple-500/20 text-purple-400' :
                                                            'bg-amber-500/20 text-amber-400'
                                                }`}>
                                                {catInfo.label}
                                            </span>
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-semibold text-white mb-2">{offer.name}</h3>
                                    <p className="text-slate-400 text-sm mb-4 line-clamp-2">{offer.description}</p>

                                    <div className="space-y-2 mb-4">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400">Points Required</span>
                                            <span className="text-amber-400 font-medium">{offer.pointsCost.toLocaleString()} pts</span>
                                        </div>
                                        {offer.discountPercent > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-400">Discount</span>
                                                <span className="text-green-400 font-medium">{offer.discountPercent}%</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400">Valid Until</span>
                                            <span className={`font-medium ${expired ? 'text-red-400' : 'text-white'}`}>
                                                {new Date(offer.validUntil).toLocaleDateString()}
                                            </span>
                                        </div>
                                        {offer.claimCount !== undefined && offer.claimCount > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-400">Times Claimed</span>
                                                <span className="text-secondary-400 font-medium">{offer.claimCount}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button onClick={() => toggleActive(offer.id)}
                                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${offer.isActive ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                                }`}>
                                            {offer.isActive ? 'Active' : 'Inactive'}
                                        </button>
                                        <button onClick={() => openEditModal(offer)} className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 rounded-lg transition-colors">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        {deleteConfirm === offer.id ? (
                                            <div className="flex gap-1">
                                                <button onClick={() => handleDelete(offer.id)} className="px-2 py-1 bg-red-500 text-white rounded text-xs">Yes</button>
                                                <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 bg-slate-700 text-white rounded text-xs">No</button>
                                            </div>
                                        ) : (
                                            <button onClick={() => setDeleteConfirm(offer.id)} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-white">{editingOffer ? 'Edit Offer' : 'Create New Offer'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {error && (
                                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm text-slate-300 mb-2">Offer Name *</label>
                                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required
                                    placeholder="e.g., 10% Off Next Trip" className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
                            </div>

                            <div>
                                <label className="block text-sm text-slate-300 mb-2">Description *</label>
                                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required rows={3}
                                    placeholder="Describe what passengers get with this offer..." className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 resize-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
                            </div>

                            <div>
                                <label className="block text-sm text-slate-300 mb-2">Category *</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {categories.map(cat => (
                                        <button
                                            key={cat.value}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, category: cat.value })}
                                            className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${formData.category === cat.value
                                                ? 'border-primary-500 bg-primary-500/10'
                                                : 'border-white/10 bg-slate-900/50 hover:border-white/20'
                                                }`}
                                        >
                                            <cat.icon className={`w-5 h-5 ${formData.category === cat.value ? 'text-primary-400' : 'text-slate-400'}`} />
                                            <span className={`text-sm ${formData.category === cat.value ? 'text-white' : 'text-slate-400'}`}>{cat.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-300 mb-2">Points Cost *</label>
                                    <input type="number" value={formData.pointsCost} onChange={(e) => setFormData({ ...formData, pointsCost: parseInt(e.target.value) || 0 })} required min="1"
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-300 mb-2">Discount %</label>
                                    <input type="number" value={formData.discountPercent} onChange={(e) => setFormData({ ...formData, discountPercent: parseInt(e.target.value) || 0 })} min="0" max="100"
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-slate-300 mb-2">Valid Until *</label>
                                <input type="date" value={formData.validUntil} onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })} required
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-900/50 rounded-xl border border-white/10">
                                <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="w-5 h-5 rounded border-white/20 bg-slate-800 text-primary-500 focus:ring-primary-500" />
                                <div>
                                    <span className="text-white font-medium">Active</span>
                                    <p className="text-slate-400 text-sm">Make this offer visible to passengers immediately</p>
                                </div>
                            </label>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : editingOffer ? 'Save Changes' : 'Create Offer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Claims Modal */}
            {claimsModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-semibold text-white">All Claims</h2>
                                <p className="text-slate-400 text-sm">{claims.length} users have claimed offers</p>
                            </div>
                            <button onClick={() => setClaimsModalOpen(false)} className="text-slate-400 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {claims.length === 0 ? (
                                <div className="text-center py-12 text-slate-400">
                                    <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <p>No claims yet</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {claims.map(claim => (
                                        <div key={claim.id} className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-xl hover:bg-slate-900 transition-colors">
                                            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                                                {claim.user?.name?.charAt(0).toUpperCase() || '?'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-medium">{claim.user?.name || 'Unknown User'}</p>
                                                <p className="text-slate-400 text-sm truncate">{claim.user?.email}</p>
                                                <p className="text-slate-500 text-xs mt-1">
                                                    Claimed <span className="text-primary-400">{claim.offerName}</span> • {claim.points} pts • {new Date(claim.claimedAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setClaimsModalOpen(false);
                                                        navigate('/admin/chat');
                                                    }}
                                                    className="p-2 bg-primary-500/20 text-primary-400 rounded-lg hover:bg-primary-500/30 transition-colors"
                                                    title="Message User"
                                                >
                                                    <MessageCircle className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => claim.user && viewUserProfile(claim.user.id)}
                                                    disabled={!claim.user || loadingProfile}
                                                    className="p-2 bg-white/5 text-slate-400 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                                                    title="View Profile"
                                                >
                                                    {loadingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* User Profile Modal */}
            {profileModalOpen && selectedProfile && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-white">User Profile</h2>
                            <button onClick={() => setProfileModalOpen(false)} className="text-slate-400 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Profile Header */}
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                                    {selectedProfile.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-white">{selectedProfile.name}</h3>
                                    <p className="text-slate-400">{selectedProfile.email}</p>
                                    <p className="text-slate-500 text-sm">{selectedProfile.phone || 'No phone'} • Joined {new Date(selectedProfile.createdAt).toLocaleDateString()}</p>
                                </div>
                                <button
                                    onClick={() => { setProfileModalOpen(false); navigate('/admin/chat'); }}
                                    className="px-4 py-2 bg-primary-500 text-white rounded-xl flex items-center gap-2 hover:bg-primary-600"
                                >
                                    <MessageCircle className="w-4 h-4" /> Message
                                </button>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="glass rounded-xl p-4 text-center">
                                    <Award className={`w-6 h-6 mx-auto mb-2 ${selectedProfile.loyalty.tier === 'GOLD' ? 'text-yellow-400' : selectedProfile.loyalty.tier === 'SILVER' ? 'text-slate-300' : 'text-amber-600'}`} />
                                    <p className="text-lg font-bold text-white">{selectedProfile.loyalty.tier}</p>
                                    <p className="text-slate-400 text-xs">Loyalty Tier</p>
                                </div>
                                <div className="glass rounded-xl p-4 text-center">
                                    <Star className="w-6 h-6 mx-auto mb-2 text-amber-400" />
                                    <p className="text-lg font-bold text-white">{selectedProfile.loyalty.points.toLocaleString()}</p>
                                    <p className="text-slate-400 text-xs">Points Available</p>
                                </div>
                                <div className="glass rounded-xl p-4 text-center">
                                    <Users className="w-6 h-6 mx-auto mb-2 text-green-400" />
                                    <p className="text-lg font-bold text-white">{selectedProfile.stats.friendsReferred}</p>
                                    <p className="text-slate-400 text-xs">Friends Referred</p>
                                </div>
                                <div className="glass rounded-xl p-4 text-center">
                                    <TrendingUp className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                                    <p className="text-lg font-bold text-white">{selectedProfile.stats.referralPointsEarned}</p>
                                    <p className="text-slate-400 text-xs">Referral Points</p>
                                </div>
                            </div>

                            {/* Booking Stats */}
                            <div className="glass rounded-xl p-4">
                                <h4 className="text-white font-semibold mb-3 flex items-center gap-2"><Ticket className="w-5 h-5 text-primary-400" /> Booking Summary</h4>
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <p className="text-2xl font-bold text-white">{selectedProfile.stats.totalBookings}</p>
                                        <p className="text-slate-400 text-sm">Total Bookings</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-green-400">Rs. {selectedProfile.stats.totalSpent.toLocaleString()}</p>
                                        <p className="text-slate-400 text-sm">Total Spent</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-amber-400">{selectedProfile.loyalty.totalEarned.toLocaleString()}</p>
                                        <p className="text-slate-400 text-sm">Points Earned</p>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Bookings */}
                            {selectedProfile.recentBookings.length > 0 && (
                                <div>
                                    <h4 className="text-white font-semibold mb-3 flex items-center gap-2"><MapPin className="w-5 h-5 text-secondary-400" /> Recent Trips</h4>
                                    <div className="space-y-2">
                                        {selectedProfile.recentBookings.map(b => (
                                            <div key={b.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                                                <div>
                                                    <p className="text-white text-sm">{b.route}</p>
                                                    <p className="text-slate-500 text-xs">{b.date ? new Date(b.date).toLocaleDateString() : 'N/A'}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-white font-medium">Rs. {b.amount}</p>
                                                    <span className={`text-xs px-2 py-0.5 rounded ${b.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' : b.status === 'CONFIRMED' ? 'bg-primary-500/20 text-primary-400' : 'bg-slate-700 text-slate-400'}`}>{b.status}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Redeemed Offers */}
                            {selectedProfile.redeemedOffers.length > 0 && (
                                <div>
                                    <h4 className="text-white font-semibold mb-3 flex items-center gap-2"><Gift className="w-5 h-5 text-amber-400" /> Redeemed Offers</h4>
                                    <div className="space-y-2">
                                        {selectedProfile.redeemedOffers.map(o => (
                                            <div key={o.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                                                <div>
                                                    <p className="text-white text-sm">{o.name}</p>
                                                    <p className="text-slate-500 text-xs">{new Date(o.date).toLocaleDateString()}</p>
                                                </div>
                                                <span className="text-amber-400 font-medium">{o.points} pts</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
