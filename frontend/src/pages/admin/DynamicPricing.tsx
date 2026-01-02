import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, DollarSign, Loader2, AlertCircle, TrendingUp, TrendingDown, Calendar, Clock, ToggleLeft, ToggleRight, CheckCircle } from 'lucide-react';
import { adminApi } from '../../services/api';

interface PricingRule {
    id: string;
    name: string;
    type: 'SURGE' | 'EARLY_BIRD' | 'SEASONAL' | 'DISCOUNT';
    multiplier: number;
    minDaysBefore: number | null;
    minHoursBefore: number | null;
    startDate: string | null;
    endDate: string | null;
    routeId: string | null;
    active: boolean;
}

const ruleTypes = [
    { value: 'SURGE', label: 'Surge Pricing', desc: 'Increase price close to departure', icon: TrendingUp, color: 'text-red-400' },
    { value: 'EARLY_BIRD', label: 'Early Bird', desc: 'Discount for booking in advance', icon: TrendingDown, color: 'text-green-400' },
    { value: 'SEASONAL', label: 'Seasonal', desc: 'Special pricing for date range', icon: Calendar, color: 'text-blue-400' },
    { value: 'DISCOUNT', label: 'Discount', desc: 'General discount percentage', icon: DollarSign, color: 'text-yellow-400' },
];

export default function DynamicPricing() {
    const [rules, setRules] = useState<PricingRule[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<PricingRule | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timeUnit, setTimeUnit] = useState<'days' | 'hours'>('days');
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '', type: 'SURGE' as PricingRule['type'], multiplier: 1.2,
        minDaysBefore: 3, minHoursBefore: 24, startDate: '', endDate: '', routeId: '', active: true
    });

    const fetchRules = async () => {
        try {
            setIsLoading(true);
            const response = await adminApi.getPricingRules();
            setRules(response.data.rules || []);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load pricing rules');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchRules(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        try {
            const payload = {
                ...formData,
                minDaysBefore: (formData.type === 'SURGE' || formData.type === 'EARLY_BIRD') && timeUnit === 'days' ? formData.minDaysBefore : null,
                minHoursBefore: formData.type === 'SURGE' && timeUnit === 'hours' ? formData.minHoursBefore : null,
                startDate: formData.type === 'SEASONAL' ? formData.startDate : null,
                endDate: formData.type === 'SEASONAL' ? formData.endDate : null,
                routeId: formData.routeId || null
            };

            if (editingRule) {
                await adminApi.updatePricingRule(editingRule.id, payload);
                setSuccess('Pricing rule updated successfully');
            } else {
                await adminApi.createPricingRule(payload);
                setSuccess('Pricing rule created successfully');
            }

            await fetchRules();
            setIsModalOpen(false);
            resetForm();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to save rule');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (rule: PricingRule) => {
        setEditingRule(rule);
        setFormData({
            name: rule.name,
            type: rule.type,
            multiplier: rule.multiplier,
            minDaysBefore: rule.minDaysBefore || 3,
            minHoursBefore: rule.minHoursBefore || 24,
            startDate: rule.startDate ? rule.startDate.split('T')[0] : '',
            endDate: rule.endDate ? rule.endDate.split('T')[0] : '',
            routeId: rule.routeId || '',
            active: rule.active
        });
        setTimeUnit(rule.minHoursBefore ? 'hours' : 'days');
        setIsModalOpen(true);
    };

    const handleDelete = async (ruleId: string) => {
        try {
            await adminApi.deletePricingRule(ruleId);
            await fetchRules();
            setDeleteConfirm(null);
            setSuccess('Pricing rule deleted');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to delete rule');
        }
    };

    const handleToggle = async (ruleId: string) => {
        try {
            await adminApi.togglePricingRule(ruleId);
            await fetchRules();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to toggle rule');
        }
    };

    const resetForm = () => {
        setFormData({ name: '', type: 'SURGE', multiplier: 1.2, minDaysBefore: 3, minHoursBefore: 24, startDate: '', endDate: '', routeId: '', active: true });
        setTimeUnit('days');
        setEditingRule(null);
    };

    const getRuleTypeInfo = (type: string) => ruleTypes.find(t => t.value === type) || ruleTypes[0];

    const getConditionText = (rule: PricingRule) => {
        if (rule.type === 'SURGE') {
            if (rule.minHoursBefore) return `Within ${rule.minHoursBefore} hours`;
            if (rule.minDaysBefore) return `Within ${rule.minDaysBefore} days`;
            return 'Close to departure';
        }
        if (rule.type === 'EARLY_BIRD') return `${rule.minDaysBefore || 7}+ days before`;
        if (rule.type === 'SEASONAL') return `${rule.startDate?.split('T')[0]} - ${rule.endDate?.split('T')[0]}`;
        if (rule.type === 'DISCOUNT') return 'Always applies';
        return '';
    };

    if (isLoading) {
        return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary-500 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div><h1 className="text-2xl font-display font-bold text-white mb-1">Dynamic Pricing</h1><p className="text-slate-400">Manage pricing rules and multipliers</p></div>
                <button onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl btn-glow flex items-center gap-2"><Plus className="w-5 h-5" />Add Rule</button>
            </div>

            {error && <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 flex items-center gap-2"><AlertCircle className="w-5 h-5" /> {error} <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button></div>}
            {success && <div className="p-4 bg-green-500/10 border border-green-500/50 rounded-xl text-green-400 flex items-center gap-2"><CheckCircle className="w-5 h-5" /> {success}</div>}

            {/* Rule Type Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {ruleTypes.map((type) => {
                    const count = rules.filter(r => r.type === type.value && r.active).length;
                    return (
                        <div key={type.value} className="glass rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center"><type.icon className={`w-5 h-5 ${type.color}`} /></div>
                                <div><p className="text-white font-medium">{type.label}</p><p className="text-slate-500 text-xs">{count} active</p></div>
                            </div>
                            <p className="text-slate-400 text-sm">{type.desc}</p>
                        </div>
                    );
                })}
            </div>

            {/* Rules Table */}
            <div className="glass rounded-2xl overflow-hidden">
                <table className="w-full">
                    <thead><tr className="border-b border-white/10 bg-white/5">
                        <th className="text-left py-4 px-6 text-slate-400 font-medium text-sm">Rule</th>
                        <th className="text-left py-4 px-6 text-slate-400 font-medium text-sm">Type</th>
                        <th className="text-left py-4 px-6 text-slate-400 font-medium text-sm">Multiplier</th>
                        <th className="text-left py-4 px-6 text-slate-400 font-medium text-sm">Condition</th>
                        <th className="text-left py-4 px-6 text-slate-400 font-medium text-sm">Status</th>
                        <th className="text-right py-4 px-6 text-slate-400 font-medium text-sm">Actions</th>
                    </tr></thead>
                    <tbody>
                        {rules.length === 0 ? (
                            <tr><td colSpan={6} className="py-12 text-center text-slate-400">No pricing rules configured. Click "Add Rule" to create one.</td></tr>
                        ) : (
                            rules.map((rule) => {
                                const typeInfo = getRuleTypeInfo(rule.type);
                                return (
                                    <tr key={rule.id} className="border-b border-white/5 hover:bg-white/5">
                                        <td className="py-4 px-6"><div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center"><typeInfo.icon className={`w-5 h-5 ${typeInfo.color}`} /></div>
                                            <p className="text-white font-medium">{rule.name}</p>
                                        </div></td>
                                        <td className="py-4 px-6"><span className={`px-2 py-1 rounded-lg text-xs ${typeInfo.color} bg-slate-800`}>{typeInfo.label}</span></td>
                                        <td className="py-4 px-6"><span className={`font-medium ${rule.multiplier > 1 ? 'text-red-400' : 'text-green-400'}`}>{rule.multiplier > 1 ? '+' : ''}{Math.round((rule.multiplier - 1) * 100)}%</span></td>
                                        <td className="py-4 px-6 text-slate-400 text-sm">{getConditionText(rule)}</td>
                                        <td className="py-4 px-6">
                                            <button onClick={() => handleToggle(rule.id)} className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm ${rule.active ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                                                {rule.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                                {rule.active ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td className="py-4 px-6"><div className="flex items-center justify-end gap-2">
                                            <button onClick={() => handleEdit(rule)} className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 rounded-lg" title="Edit"><Edit className="w-4 h-4" /></button>
                                            {deleteConfirm === rule.id ? (
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => handleDelete(rule.id)} className="px-2 py-1 bg-red-500 text-white text-xs rounded">Confirm</button>
                                                    <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 bg-slate-600 text-white text-xs rounded">Cancel</button>
                                                </div>
                                            ) : (
                                                <button onClick={() => setDeleteConfirm(rule.id)} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20" title="Delete"><Trash2 className="w-4 h-4" /></button>
                                            )}
                                        </div></td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Rule Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-white">{editingRule ? 'Edit' : 'Add'} Pricing Rule</h2>
                            <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="text-slate-400"><X className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div><label className="block text-sm text-slate-300 mb-2">Rule Name</label>
                                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Last Minute Surge" required className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white" />
                            </div>

                            <div><label className="block text-sm text-slate-300 mb-2">Rule Type</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {ruleTypes.map((type) => (
                                        <button key={type.value} type="button" onClick={() => setFormData({ ...formData, type: type.value as PricingRule['type'] })}
                                            className={`p-3 rounded-xl border-2 text-left ${formData.type === type.value ? 'border-primary-500 bg-primary-500/10' : 'border-white/10'}`}>
                                            <div className="flex items-center gap-2"><type.icon className={`w-4 h-4 ${type.color}`} /><span className="text-white text-sm">{type.label}</span></div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div><label className="block text-sm text-slate-300 mb-2">Price Multiplier</label>
                                <div className="flex items-center gap-4">
                                    <input type="range" min="0.5" max="2" step="0.05" value={formData.multiplier} onChange={(e) => setFormData({ ...formData, multiplier: parseFloat(e.target.value) })} className="flex-1" />
                                    <span className={`text-lg font-bold min-w-16 text-center ${formData.multiplier > 1 ? 'text-red-400' : 'text-green-400'}`}>{formData.multiplier > 1 ? '+' : ''}{Math.round((formData.multiplier - 1) * 100)}%</span>
                                </div>
                                <p className="text-sm text-slate-500 mt-1">1.0 = normal price, 1.2 = 20% increase, 0.8 = 20% discount</p>
                            </div>

                            {formData.type === 'SURGE' && (
                                <div>
                                    <label className="block text-sm text-slate-300 mb-2">Apply Within</label>
                                    <div className="flex gap-2 mb-3">
                                        <button type="button" onClick={() => setTimeUnit('hours')}
                                            className={`flex-1 px-4 py-2 rounded-xl flex items-center justify-center gap-2 ${timeUnit === 'hours' ? 'bg-primary-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                            <Clock className="w-4 h-4" /> Hours
                                        </button>
                                        <button type="button" onClick={() => setTimeUnit('days')}
                                            className={`flex-1 px-4 py-2 rounded-xl flex items-center justify-center gap-2 ${timeUnit === 'days' ? 'bg-primary-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                            <Calendar className="w-4 h-4" /> Days
                                        </button>
                                    </div>
                                    {timeUnit === 'hours' ? (
                                        <input type="number" value={formData.minHoursBefore} onChange={(e) => setFormData({ ...formData, minHoursBefore: parseInt(e.target.value) })} min="1" max="168" placeholder="e.g., 24 (within 24 hours)" className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white" />
                                    ) : (
                                        <input type="number" value={formData.minDaysBefore} onChange={(e) => setFormData({ ...formData, minDaysBefore: parseInt(e.target.value) })} min="1" max="90" placeholder="e.g., 3 (within 3 days)" className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white" />
                                    )}
                                    <p className="text-sm text-slate-500 mt-1">Surge price will apply when booking is within this time before departure</p>
                                </div>
                            )}

                            {formData.type === 'EARLY_BIRD' && (
                                <div><label className="block text-sm text-slate-300 mb-2">Minimum Days Before Departure</label>
                                    <input type="number" value={formData.minDaysBefore} onChange={(e) => setFormData({ ...formData, minDaysBefore: parseInt(e.target.value) })} min="1" max="90" className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white" />
                                    <p className="text-sm text-slate-500 mt-1">Discount applies when booking is at least this many days before departure</p>
                                </div>
                            )}

                            {formData.type === 'SEASONAL' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-sm text-slate-300 mb-2">Start Date</label><input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} required className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white" /></div>
                                    <div><label className="block text-sm text-slate-300 mb-2">End Date</label><input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} required className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white" /></div>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} className="flex-1 px-4 py-3 bg-slate-700 text-white rounded-xl">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : editingRule ? 'Update Rule' : 'Create Rule'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
