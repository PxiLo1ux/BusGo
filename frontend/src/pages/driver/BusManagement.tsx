import { useState, useEffect, useRef } from 'react';
import {
    Plus, Bus, Edit, Trash2, X, Check, AlertCircle, Users, Loader2, Upload, FileText, Camera, Shield, Grid3X3
} from 'lucide-react';
import { driverApi } from '../../services/api';
import BusSeatLayout from '../../components/BusSeatLayout';

interface BusData {
    id: string;
    name: string;
    plateNumber: string;
    capacity: number;
    type: 'STANDARD' | 'DELUXE' | 'TOURIST';
    approved: boolean;
    amenities: string[];
    hasToilet: boolean;
    employedDriverName?: string;
    employedDriverPhone?: string;
    photos?: string[];
    bluebookImage?: string;
    taxClearance?: string;
    insuranceDoc?: string;
    documentsVerified?: boolean;
}

const amenityOptions = [
    { id: 'wifi', label: 'WiFi' },
    { id: 'ac', label: 'Air Conditioning' },
    { id: 'tv', label: 'TV/Entertainment' },
    { id: 'charging', label: 'Charging Ports' },
    { id: 'toilet', label: 'Toilet' },
    { id: 'reclining', label: 'Reclining Seats' },
];

export default function BusManagement() {
    const [buses, setBuses] = useState<BusData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBus, setEditingBus] = useState<BusData | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [seatLayoutBus, setSeatLayoutBus] = useState<BusData | null>(null);

    const [formData, setFormData] = useState({
        name: '', plateNumber: '', capacity: 35,
        type: 'DELUXE' as 'STANDARD' | 'DELUXE' | 'TOURIST',
        amenities: [] as string[],
        employedDriverName: '',
        employedDriverPhone: '',
        photos: [] as string[],
        bluebookImage: '',
        taxClearance: '',
        insuranceDoc: '',
    });

    const photoInputRef = useRef<HTMLInputElement>(null);
    const bluebookInputRef = useRef<HTMLInputElement>(null);
    const taxInputRef = useRef<HTMLInputElement>(null);
    const insuranceInputRef = useRef<HTMLInputElement>(null);

    // Fetch buses from API
    const fetchBuses = async () => {
        try {
            setIsLoading(true);
            const response = await driverApi.getBuses();
            setBuses(response.data.buses || []);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load buses');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchBuses(); }, []);

    const openAddModal = () => {
        setFormData({
            name: '', plateNumber: '', capacity: 35, type: 'DELUXE', amenities: [],
            employedDriverName: '', employedDriverPhone: '',
            photos: [], bluebookImage: '', taxClearance: '', insuranceDoc: ''
        });
        setEditingBus(null);
        setIsModalOpen(true);
    };

    const openEditModal = (bus: BusData) => {
        setFormData({
            name: bus.name, plateNumber: bus.plateNumber, capacity: bus.capacity,
            type: bus.type, amenities: bus.amenities,
            employedDriverName: bus.employedDriverName || '',
            employedDriverPhone: bus.employedDriverPhone || '',
            photos: bus.photos || [],
            bluebookImage: bus.bluebookImage || '',
            taxClearance: bus.taxClearance || '',
            insuranceDoc: bus.insuranceDoc || '',
        });
        setEditingBus(bus);
        setIsModalOpen(true);
    };

    // Convert file to base64
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
        });
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newPhotos: string[] = [];
        for (let i = 0; i < Math.min(files.length, 5 - formData.photos.length); i++) {
            const base64 = await fileToBase64(files[i]);
            newPhotos.push(base64);
        }
        setFormData(prev => ({ ...prev, photos: [...prev.photos, ...newPhotos] }));
    };

    const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'bluebookImage' | 'taxClearance' | 'insuranceDoc') => {
        const file = e.target.files?.[0];
        if (!file) return;
        const base64 = await fileToBase64(file);
        setFormData(prev => ({ ...prev, [field]: base64 }));
    };

    const removePhoto = (index: number) => {
        setFormData(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const hasToilet = formData.amenities.includes('toilet');
            const data = { ...formData, hasToilet };

            if (editingBus) {
                await driverApi.updateBus(editingBus.id, data);
            } else {
                await driverApi.addBus(data);
            }
            await fetchBuses();
            setIsModalOpen(false);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to save bus');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await driverApi.deleteBus(id);
            await fetchBuses();
            setDeleteConfirm(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to delete bus');
        }
    };

    const toggleAmenity = (amenityId: string) => {
        setFormData(prev => ({
            ...prev,
            amenities: prev.amenities.includes(amenityId)
                ? prev.amenities.filter(a => a !== amenityId)
                : [...prev.amenities, amenityId]
        }));
    };

    const getBusTypeColor = (type: string) => {
        switch (type) {
            case 'TOURIST': return 'bg-primary-500/20 text-primary-400';
            case 'DELUXE': return 'bg-secondary-500/20 text-secondary-400';
            default: return 'bg-slate-700 text-slate-400';
        }
    };

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
                    <h1 className="text-2xl font-display font-bold text-white mb-1">My Buses</h1>
                    <p className="text-slate-400">Manage your fleet of buses</p>
                </div>
                <button onClick={openAddModal} className="px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl btn-glow flex items-center gap-2">
                    <Plus className="w-5 h-5" /> Add New Bus
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" /> {error}
                </div>
            )}

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {buses.map((bus) => (
                    <div key={bus.id} className="glass rounded-2xl p-6 group hover:border-primary-500/50 border border-transparent transition-all">
                        {/* Bus Photo Preview */}
                        {bus.photos && bus.photos.length > 0 && (
                            <div className="mb-4 -mx-6 -mt-6">
                                <img src={bus.photos[0]} alt={bus.name} className="w-full h-32 object-cover rounded-t-2xl" />
                            </div>
                        )}

                        <div className="flex items-start justify-between mb-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                                <Bus className="w-7 h-7 text-white" />
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                {bus.approved ? (
                                    <span className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs">
                                        <Check className="w-3 h-3" /> Approved
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg text-xs">
                                        <AlertCircle className="w-3 h-3" /> Pending
                                    </span>
                                )}
                                {bus.documentsVerified && (
                                    <span className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs">
                                        <Shield className="w-3 h-3" /> Verified
                                    </span>
                                )}
                            </div>
                        </div>

                        <h3 className="text-xl font-semibold text-white mb-1">{bus.name}</h3>
                        <p className="text-slate-400 text-sm mb-4">{bus.plateNumber}</p>

                        <div className="space-y-3 mb-4">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-400 text-sm">Type</span>
                                <span className={`px-2 py-1 rounded-lg text-xs font-medium capitalize ${getBusTypeColor(bus.type)}`}>
                                    {bus.type.toLowerCase()}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-400 text-sm">Capacity</span>
                                <span className="text-white text-sm flex items-center gap-1">
                                    <Users className="w-4 h-4" /> {bus.capacity} seats
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-400 text-sm">Documents</span>
                                <span className="text-slate-300 text-sm">
                                    {[bus.bluebookImage, bus.taxClearance, bus.insuranceDoc].filter(Boolean).length}/3
                                </span>
                            </div>
                        </div>

                        {bus.amenities.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-4">
                                {bus.amenities.map((amenity) => (
                                    <span key={amenity} className="px-2 py-1 bg-slate-800 text-slate-400 rounded text-xs capitalize">
                                        {amenity}
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="flex gap-2 pt-4 border-t border-white/10">
                            <button onClick={() => setSeatLayoutBus(bus)} className="px-3 py-2 bg-primary-500/10 text-primary-400 rounded-lg flex items-center gap-1" title="View Seat Layout">
                                <Grid3X3 className="w-4 h-4" />
                            </button>
                            <button onClick={() => openEditModal(bus)} className="flex-1 px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                                <Edit className="w-4 h-4" /> Edit
                            </button>
                            {deleteConfirm === bus.id ? (
                                <div className="flex gap-2">
                                    <button onClick={() => handleDelete(bus.id)} className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm">Confirm</button>
                                    <button onClick={() => setDeleteConfirm(null)} className="px-3 py-2 bg-slate-700 text-white rounded-lg text-sm">Cancel</button>
                                </div>
                            ) : (
                                <button onClick={() => setDeleteConfirm(bus.id)} className="px-3 py-2 bg-red-500/10 text-red-400 rounded-lg">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                <button onClick={openAddModal} className="glass rounded-2xl p-6 border-2 border-dashed border-white/20 hover:border-primary-500/50 transition-all flex flex-col items-center justify-center min-h-[300px] group">
                    <div className="w-16 h-16 bg-white/5 group-hover:bg-primary-500/20 rounded-2xl flex items-center justify-center mb-4">
                        <Plus className="w-8 h-8 text-slate-400 group-hover:text-primary-400" />
                    </div>
                    <p className="text-slate-400 group-hover:text-white font-medium">Add New Bus</p>
                </button>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-white">{editingBus ? 'Edit Bus' : 'Add New Bus'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Bus Name</label>
                                    <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Himalayan Deluxe" required className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Plate Number</label>
                                    <input type="text" value={formData.plateNumber} onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })} placeholder="e.g. BA-1-KA-1234" required className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Bus Type</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['STANDARD', 'DELUXE', 'TOURIST'] as const).map((type) => (
                                        <button key={type} type="button" onClick={() => setFormData({ ...formData, type })} className={`py-2 rounded-lg font-medium capitalize transition-all ${formData.type === type ? 'bg-primary-500 text-white' : 'bg-slate-900/50 text-slate-400 hover:bg-slate-700'}`}>
                                            {type.toLowerCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Seat Capacity</label>
                                <input type="number" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 35 })} min={10} max={60} required className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Amenities</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {amenityOptions.map((amenity) => (
                                        <button key={amenity.id} type="button" onClick={() => toggleAmenity(amenity.id)} className={`py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${formData.amenities.includes(amenity.id) ? 'bg-primary-500/20 text-primary-400 border border-primary-500/50' : 'bg-slate-900/50 text-slate-400 border border-transparent'}`}>
                                            {formData.amenities.includes(amenity.id) && <Check className="w-4 h-4" />}
                                            {amenity.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Bus Photos Section */}
                            <div className="border-t border-white/10 pt-6">
                                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                                    <Camera className="w-4 h-4" /> Bus Photos (Max 5)
                                </h3>
                                <div className="grid grid-cols-5 gap-2 mb-2">
                                    {formData.photos.map((photo, idx) => (
                                        <div key={idx} className="relative aspect-square">
                                            <img src={photo} alt={`Bus photo ${idx + 1}`} className="w-full h-full object-cover rounded-lg" />
                                            <button type="button" onClick={() => removePhoto(idx)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                                                <X className="w-4 h-4 text-white" />
                                            </button>
                                        </div>
                                    ))}
                                    {formData.photos.length < 5 && (
                                        <button type="button" onClick={() => photoInputRef.current?.click()} className="aspect-square border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center hover:border-primary-500/50 transition-colors">
                                            <Plus className="w-6 h-6 text-slate-400" />
                                        </button>
                                    )}
                                </div>
                                <input ref={photoInputRef} type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                            </div>

                            {/* Documents Section */}
                            <div className="border-t border-white/10 pt-6">
                                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                                    <FileText className="w-4 h-4" /> Required Documents
                                </h3>
                                <div className="grid grid-cols-3 gap-4">
                                    {/* Bluebook */}
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-2">Bluebook</label>
                                        {formData.bluebookImage ? (
                                            <div className="relative">
                                                <img src={formData.bluebookImage} alt="Bluebook" className="w-full h-24 object-cover rounded-lg" />
                                                <button type="button" onClick={() => setFormData({ ...formData, bluebookImage: '' })} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                                                    <X className="w-3 h-3 text-white" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button type="button" onClick={() => bluebookInputRef.current?.click()} className="w-full h-24 border-2 border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center hover:border-primary-500/50">
                                                <Upload className="w-5 h-5 text-slate-400 mb-1" />
                                                <span className="text-xs text-slate-400">Upload</span>
                                            </button>
                                        )}
                                        <input ref={bluebookInputRef} type="file" accept="image/*" onChange={(e) => handleDocUpload(e, 'bluebookImage')} className="hidden" />
                                    </div>

                                    {/* Tax Clearance */}
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-2">Tax Clearance</label>
                                        {formData.taxClearance ? (
                                            <div className="relative">
                                                <img src={formData.taxClearance} alt="Tax Clearance" className="w-full h-24 object-cover rounded-lg" />
                                                <button type="button" onClick={() => setFormData({ ...formData, taxClearance: '' })} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                                                    <X className="w-3 h-3 text-white" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button type="button" onClick={() => taxInputRef.current?.click()} className="w-full h-24 border-2 border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center hover:border-primary-500/50">
                                                <Upload className="w-5 h-5 text-slate-400 mb-1" />
                                                <span className="text-xs text-slate-400">Upload</span>
                                            </button>
                                        )}
                                        <input ref={taxInputRef} type="file" accept="image/*" onChange={(e) => handleDocUpload(e, 'taxClearance')} className="hidden" />
                                    </div>

                                    {/* Insurance */}
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-2">Insurance</label>
                                        {formData.insuranceDoc ? (
                                            <div className="relative">
                                                <img src={formData.insuranceDoc} alt="Insurance" className="w-full h-24 object-cover rounded-lg" />
                                                <button type="button" onClick={() => setFormData({ ...formData, insuranceDoc: '' })} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                                                    <X className="w-3 h-3 text-white" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button type="button" onClick={() => insuranceInputRef.current?.click()} className="w-full h-24 border-2 border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center hover:border-primary-500/50">
                                                <Upload className="w-5 h-5 text-slate-400 mb-1" />
                                                <span className="text-xs text-slate-400">Upload</span>
                                            </button>
                                        )}
                                        <input ref={insuranceInputRef} type="file" accept="image/*" onChange={(e) => handleDocUpload(e, 'insuranceDoc')} className="hidden" />
                                    </div>
                                </div>
                            </div>

                            {/* Employed Driver Section */}
                            <div className="border-t border-white/10 pt-6">
                                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                                    <Users className="w-4 h-4" /> Employed Driver (Optional)
                                </h3>
                                <p className="text-xs text-slate-400 mb-4">If someone else drives this bus, enter their contact details below.</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Driver Name</label>
                                        <input
                                            type="text"
                                            value={formData.employedDriverName}
                                            onChange={(e) => setFormData({ ...formData, employedDriverName: e.target.value })}
                                            placeholder="e.g. Ram Bahadur"
                                            className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Driver Phone</label>
                                        <input
                                            type="tel"
                                            value={formData.employedDriverPhone}
                                            onChange={(e) => setFormData({ ...formData, employedDriverPhone: e.target.value })}
                                            placeholder="e.g. 9841234567"
                                            className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 bg-slate-700 text-white font-medium rounded-xl">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl btn-glow disabled:opacity-50 flex items-center justify-center gap-2">
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : editingBus ? 'Save Changes' : 'Add Bus'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Seat Layout Modal */}
            {seatLayoutBus && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="p-4 border-b border-white/10 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-white">Seat Layout</h2>
                            <button onClick={() => setSeatLayoutBus(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6">
                            <BusSeatLayout
                                capacity={seatLayoutBus.capacity}
                                hasToilet={seatLayoutBus.hasToilet}
                                hasWifi={seatLayoutBus.amenities.includes('wifi')}
                                hasTV={seatLayoutBus.amenities.includes('tv')}
                                hasAC={seatLayoutBus.amenities.includes('ac')}
                                hasCharging={seatLayoutBus.amenities.includes('charging')}
                                busName={seatLayoutBus.name}
                                showLegend={true}
                                interactive={false}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
