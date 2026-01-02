import { useState, useEffect } from 'react';
import { Users, Calendar, MapPin, Loader2, MessageCircle, Clock, CheckCircle, XCircle, Search, User, X, Phone, Mail, AlertCircle, Ticket } from 'lucide-react';
import { driverApi, bookingApi } from '../../services/api';

interface Booking {
    id: string;
    passengerName: string;
    passengerPhone: string;
    passengerEmail?: string;
    seats: string[];
    totalAmount: number;
    status: string;
    createdAt: string;
    schedule: {
        departureTime: string;
        arrivalTime: string;
        route: { origin: string; destination: string };
    };
}

interface PassengerProfile {
    name: string;
    phone: string;
    email: string;
    totalBookings: number;
    memberSince: string;
}

export default function DriverBookings() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [passengerProfile, setPassengerProfile] = useState<PassengerProfile | null>(null);
    const [showPassengerModal, setShowPassengerModal] = useState(false);
    const [cancelModal, setCancelModal] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadBookings();
    }, []);

    const loadBookings = async () => {
        try {
            const res = await driverApi.getBookings();
            setBookings(res.data.bookings || []);
        } catch (err) {
            console.error('Failed to load bookings:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'CONFIRMED': return 'bg-green-500/20 text-green-400';
            case 'COMPLETED': return 'bg-blue-500/20 text-blue-400';
            case 'CANCELLED': return 'bg-red-500/20 text-red-400';
            case 'PENDING': return 'bg-yellow-500/20 text-yellow-400';
            default: return 'bg-slate-500/20 text-slate-400';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'CONFIRMED': return <CheckCircle className="w-4 h-4" />;
            case 'COMPLETED': return <CheckCircle className="w-4 h-4" />;
            case 'CANCELLED': return <XCircle className="w-4 h-4" />;
            default: return <Clock className="w-4 h-4" />;
        }
    };

    const canCancel = (booking: Booking) => {
        const departureTime = new Date(booking.schedule.departureTime).getTime();
        const now = Date.now();
        // Driver can cancel up until departure time
        return booking.status === 'CONFIRMED' && departureTime > now;
    };

    const viewPassengerProfile = (booking: Booking) => {
        setPassengerProfile({
            name: booking.passengerName || 'Unknown Passenger',
            phone: booking.passengerPhone || 'N/A',
            email: booking.passengerEmail || 'N/A',
            totalBookings: Math.floor(Math.random() * 20) + 1, // Mock - in real app fetch from API
            memberSince: new Date(booking.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        });
        setShowPassengerModal(true);
    };

    const handleCancelBooking = async (bookingId: string) => {
        setIsSubmitting(true);
        try {
            await bookingApi.cancelBooking(bookingId);
            setCancelModal(null);
            setSuccess('Booking cancelled successfully. Passenger will be notified.');
            await loadBookings();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to cancel booking');
            setTimeout(() => setError(null), 3000);
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredBookings = bookings.filter(b => {
        const matchesSearch = b.passengerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.schedule.route.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.schedule.route.destination.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    if (isLoading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-primary-500 animate-spin" /></div>;
    }

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-display font-bold text-white mb-1">Bookings</h1>
                <p className="text-slate-400">View and manage passenger bookings on your buses</p>
            </div>

            {/* Success/Error Messages */}
            {success && (
                <div className="mb-6 p-4 bg-green-500/10 border border-green-500/50 rounded-xl text-green-400 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" /> {success}
                </div>
            )}
            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" /> {error}
                </div>
            )}

            {/* Filters */}
            <div className="glass rounded-2xl p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by passenger name or route..."
                            className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500"
                        />
                    </div>
                    <div className="flex gap-2">
                        {['ALL', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map(status => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === status
                                    ? 'bg-primary-500 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    }`}
                            >
                                {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bookings List */}
            {filteredBookings.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                    <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No Bookings Found</h3>
                    <p className="text-slate-400">
                        {bookings.length === 0 ? 'You don\'t have any bookings yet.' : 'No bookings match your search criteria.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredBookings.map(booking => (
                        <div key={booking.id} className="glass rounded-2xl p-6 hover:bg-white/5 transition-colors">
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                                {/* Passenger Info - Clickable */}
                                <button
                                    onClick={() => viewPassengerProfile(booking)}
                                    className="flex items-center gap-4 text-left hover:opacity-80 transition-opacity"
                                >
                                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                                        {booking.passengerName?.charAt(0) || 'P'}
                                    </div>
                                    <div>
                                        <p className="text-white font-medium flex items-center gap-1">
                                            {booking.passengerName || 'Passenger'}
                                            <span className="text-primary-400 text-xs">View →</span>
                                        </p>
                                        <p className="text-slate-400 text-sm">{booking.seats.length} seat(s)</p>
                                    </div>
                                </button>

                                {/* Route & Time */}
                                <div className="flex-1 flex flex-col md:flex-row md:items-center gap-4">
                                    <div className="flex items-center gap-2 text-slate-300">
                                        <MapPin className="w-4 h-4 text-primary-400" />
                                        <span>{booking.schedule.route.origin}</span>
                                        <span className="text-slate-500">→</span>
                                        <span>{booking.schedule.route.destination}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                                        <Calendar className="w-4 h-4" />
                                        <span>{formatDate(booking.schedule.departureTime)}</span>
                                        <span>•</span>
                                        <span>{formatTime(booking.schedule.departureTime)}</span>
                                    </div>
                                </div>

                                {/* Seats & Amount */}
                                <div className="flex items-center gap-4">
                                    <div className="flex gap-1">
                                        {booking.seats.map(seat => (
                                            <span key={seat} className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs font-medium">
                                                {seat}
                                            </span>
                                        ))}
                                    </div>
                                    <p className="text-primary-400 font-bold">Rs. {booking.totalAmount.toLocaleString()}</p>
                                </div>

                                {/* Status & Actions */}
                                <div className="flex items-center gap-2">
                                    <span className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium ${getStatusColor(booking.status)}`}>
                                        {getStatusIcon(booking.status)}
                                        {booking.status}
                                    </span>
                                    <button
                                        onClick={() => window.location.href = `/driver/messages?booking=${booking.id}`}
                                        className="p-2 bg-secondary-500/20 text-secondary-400 rounded-lg hover:bg-secondary-500/30 transition-colors"
                                        title="Chat with passenger"
                                    >
                                        <MessageCircle className="w-5 h-5" />
                                    </button>
                                    {canCancel(booking) && (
                                        <button
                                            onClick={() => setCancelModal(booking.id)}
                                            className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                                            title="Cancel booking"
                                        >
                                            <XCircle className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                <div className="glass rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-white">{bookings.length}</p>
                    <p className="text-slate-400 text-sm">Total Bookings</p>
                </div>
                <div className="glass rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-green-400">{bookings.filter(b => b.status === 'CONFIRMED').length}</p>
                    <p className="text-slate-400 text-sm">Confirmed</p>
                </div>
                <div className="glass rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-blue-400">{bookings.filter(b => b.status === 'COMPLETED').length}</p>
                    <p className="text-slate-400 text-sm">Completed</p>
                </div>
                <div className="glass rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-primary-400">
                        Rs. {bookings.reduce((sum, b) => sum + (b.status !== 'CANCELLED' ? b.totalAmount : 0), 0).toLocaleString()}
                    </p>
                    <p className="text-slate-400 text-sm">Total Revenue</p>
                </div>
            </div>

            {/* Passenger Profile Modal */}
            {showPassengerModal && passengerProfile && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-2xl w-full max-w-md">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-white">Passenger Details</h2>
                            <button onClick={() => setShowPassengerModal(false)} className="text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-20 h-20 bg-gradient-to-br from-secondary-500 to-accent-500 rounded-2xl flex items-center justify-center">
                                    <User className="w-10 h-10 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">{passengerProfile.name}</h3>
                                    <p className="text-slate-400 text-sm">Member since {passengerProfile.memberSince}</p>
                                </div>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-xl">
                                    <Phone className="w-5 h-5 text-primary-400" />
                                    <div>
                                        <p className="text-xs text-slate-400">Phone</p>
                                        <a href={`tel:${passengerProfile.phone}`} className="text-white hover:text-primary-400">{passengerProfile.phone}</a>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-xl">
                                    <Mail className="w-5 h-5 text-secondary-400" />
                                    <div>
                                        <p className="text-xs text-slate-400">Email</p>
                                        <p className="text-white">{passengerProfile.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-xl">
                                    <Ticket className="w-5 h-5 text-accent-400" />
                                    <div>
                                        <p className="text-xs text-slate-400">Total Bookings</p>
                                        <p className="text-white">{passengerProfile.totalBookings} trips</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <a
                                    href={`tel:${passengerProfile.phone}`}
                                    className="flex-1 px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl text-center flex items-center justify-center gap-2"
                                >
                                    <Phone className="w-5 h-5" /> Call
                                </a>
                                <button
                                    onClick={() => setShowPassengerModal(false)}
                                    className="flex-1 px-4 py-3 bg-slate-700 text-white font-medium rounded-xl"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Booking Modal */}
            {cancelModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-2xl w-full max-w-md p-6">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <XCircle className="w-8 h-8 text-red-400" />
                            </div>
                            <h2 className="text-xl font-semibold text-white mb-2">Cancel Booking?</h2>
                            <p className="text-slate-400">This will cancel the passenger's booking. They will be notified and may be eligible for a refund.</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setCancelModal(null)} className="flex-1 px-4 py-3 bg-slate-700 text-white font-medium rounded-xl">Keep Booking</button>
                            <button
                                onClick={() => handleCancelBooking(cancelModal)}
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl disabled:opacity-50"
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Cancel Booking'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
