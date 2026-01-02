import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, Calendar, Bus, MapPin, Clock, ChevronRight, AlertCircle, Star, Loader2, Download, XCircle, CheckCircle, User, X, Navigation, Phone, Mail, MessageSquare, Send, Wifi, Snowflake, Zap, Eye } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { useAuth } from '../context/AuthContext';
import { bookingApi, reviewApi, ratingsApi, chatApi } from '../services/api';
import BusTracker from '../components/BusTracker';

interface Booking {
    id: string;
    busName: string;
    operator: string;
    origin: string;
    destination: string;
    departureTime: string;
    arrivalTime: string;
    date: string;
    seats: string[];
    totalAmount: number;
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
    paymentMethod: 'ONLINE' | 'CASH';
    driverPhone?: string;
    driverEmail?: string;
    driverId?: string;
    driverRating?: number;
    driverTotalReviews?: number;
    hasReview?: boolean;
    hasDriverRating?: boolean;
    passengerName?: string;
    plateNumber?: string;
    scheduleId?: string;
}

interface DriverReview {
    rating: number;
    comment: string;
    userName: string;
    createdAt: string;
}

interface DriverProfile {
    id: string;
    name: string;
    phone: string;
    email: string;
    rating: number;
    totalReviews: number;
    totalTrips: number;
    reviews: DriverReview[];
}

export default function MyBookings() {
    const { user } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [reviewModal, setReviewModal] = useState<{ bookingId: string; busName: string; driverId?: string } | null>(null);
    const [cancelModal, setCancelModal] = useState<string | null>(null);
    const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
    const [showDriverModal, setShowDriverModal] = useState(false);
    const [trackingModal, setTrackingModal] = useState<{ scheduleId: string; origin: string; destination: string } | null>(null);
    const [reviewData, setReviewData] = useState({ rating: 5, comment: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Chat state
    const [chatModal, setChatModal] = useState<{ bookingId: string; driverName: string; route: string } | null>(null);
    const [chatMessages, setChatMessages] = useState<Array<{ id: string; content: string; senderName: string; isDriver: boolean; createdAt: string }>>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSendingMessage, setIsSendingMessage] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Booking detail modal state
    const [bookingDetailModal, setBookingDetailModal] = useState<{
        id: string;
        busName: string;
        busType: string;
        plateNumber: string;
        amenities: string[];
        hasToilet: boolean;
        busRating: number;
        busTotalReviews: number;
        driverName: string;
        driverPhone: string;
        driverEmail: string;
        driverRating: number;
        employedDriverName?: string;
        employedDriverPhone?: string;
        origin: string;
        destination: string;
        distance: number;
        estimatedTime: number;
        departureTime: string;
        arrivalTime: string;
        seats: string[];
        totalAmount: number;
        discountAmount: number;
        paymentMethod: string;
        status: string;
        createdAt: string;
        busPhotos?: string[];
    } | null>(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);

    useEffect(() => {
        if (user) fetchBookings();
    }, [user]);

    const fetchBookings = async () => {
        try {
            setIsLoading(true);
            const response = await bookingApi.getUserBookings();
            setBookings(response.data.bookings || []);
        } catch (err) {
            console.error('Failed to load bookings', err);
        } finally {
            setIsLoading(false);
        }
    };

    const today = new Date().toISOString().split('T')[0];

    const filteredBookings = bookings.filter(booking => {
        const bookingDate = new Date(booking.date).toISOString().split('T')[0];
        if (filter === 'upcoming') return bookingDate >= today && booking.status !== 'CANCELLED';
        if (filter === 'past') return bookingDate < today || booking.status === 'COMPLETED';
        return true;
    });

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reviewModal) return;

        setIsSubmitting(true);
        try {
            // Submit bus/trip review
            await reviewApi.submitReview({
                bookingId: reviewModal.bookingId,
                rating: reviewData.rating,
                comment: reviewData.comment
            });

            // Also submit driver rating if available
            if (reviewModal.driverId) {
                try {
                    await ratingsApi.submitRating({
                        bookingId: reviewModal.bookingId,
                        rating: reviewData.rating,
                        comment: reviewData.comment
                    });
                } catch (e) { /* Driver rating might fail if already rated */ }
            }

            setReviewModal(null);
            setReviewData({ rating: 5, comment: '' });
            setSuccess('Review submitted successfully! Thank you for your feedback.');
            await fetchBookings();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to submit review');
            setTimeout(() => setError(null), 3000);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelBooking = async (bookingId: string) => {
        setIsSubmitting(true);
        try {
            await bookingApi.cancelBooking(bookingId);
            setCancelModal(null);
            setSuccess('Booking cancelled successfully. Refund will be processed within 5-7 business days.');
            await fetchBookings();
            setTimeout(() => setSuccess(null), 5000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to cancel booking');
            setTimeout(() => setError(null), 5000);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Chat functions
    const openChat = async (booking: Booking) => {
        setChatModal({
            bookingId: booking.id,
            driverName: booking.operator,
            route: `${booking.origin} → ${booking.destination}`
        });
        setChatMessages([]);
        try {
            const res = await chatApi.getMessages(booking.id);
            setChatMessages(res.data.messages || []);
            setTimeout(() => {
                if (chatContainerRef.current) {
                    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                }
            }, 100);
        } catch (err) {
            console.error('Failed to load chat messages', err);
        }
    };

    // Poll for new messages when chat is open
    useEffect(() => {
        if (!chatModal) return;

        const pollMessages = async () => {
            try {
                const res = await chatApi.getMessages(chatModal.bookingId);
                const newMessages = res.data.messages || [];
                if (newMessages.length !== chatMessages.length) {
                    setChatMessages(newMessages);
                    setTimeout(() => {
                        if (chatContainerRef.current) {
                            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                        }
                    }, 100);
                }
            } catch (err) {
                console.error('Failed to poll messages', err);
            }
        };

        const interval = setInterval(pollMessages, 3000); // Poll every 3 seconds
        return () => clearInterval(interval);
    }, [chatModal, chatMessages.length]);

    const sendChatMessage = async () => {
        if (!chatModal || !newMessage.trim()) return;

        const messageContent = newMessage.trim();
        // Clear input immediately for better UX
        setNewMessage('');
        setIsSendingMessage(true);

        // Optimistic update - add message immediately  
        const optimisticMessage = {
            id: `temp-${Date.now()}`,
            content: messageContent,
            senderName: user?.name || 'You',
            isDriver: false,
            createdAt: new Date().toISOString()
        };
        setChatMessages(prev => [...prev, optimisticMessage]);

        // Scroll to bottom
        setTimeout(() => {
            if (chatContainerRef.current) {
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
        }, 50);

        try {
            const res = await chatApi.sendMessage(chatModal.bookingId, messageContent);
            // Replace optimistic message with real one
            setChatMessages(prev => prev.map(m =>
                m.id === optimisticMessage.id ? res.data.message : m
            ));
        } catch (err: any) {
            // Remove optimistic message on error
            setChatMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
            setError(err.response?.data?.message || 'Failed to send message');
            setTimeout(() => setError(null), 3000);
        } finally {
            setIsSendingMessage(false);
        }
    };

    const viewDriverProfile = async (booking: Booking) => {
        // Fetch driver ratings with reviews from API
        let reviews: DriverReview[] = [];
        let avgRating = booking.driverRating || 0;
        let totalReviews = booking.driverTotalReviews || 0;

        if (booking.driverId) {
            try {
                const res = await ratingsApi.getDriverRatings(booking.driverId, 5);
                if (res.data.ratings) {
                    reviews = res.data.ratings.map((r: any) => ({
                        rating: r.rating,
                        comment: r.comment || '',
                        userName: r.userName || r.user?.name || 'Anonymous',
                        createdAt: r.createdAt
                    }));
                }
                avgRating = res.data.averageRating || res.data.driver?.rating || avgRating;
                totalReviews = res.data.totalRatings || res.data.driver?.totalReviews || totalReviews;
            } catch (e) {
                console.log('Failed to fetch driver ratings:', e);
                // Use booking data as fallback
            }
        }

        setDriverProfile({
            id: booking.driverId || '',
            name: booking.operator,
            phone: booking.driverPhone || 'N/A',
            email: booking.driverEmail || 'N/A',
            rating: avgRating,
            totalReviews: totalReviews,
            totalTrips: Math.max(totalReviews * 5, 50), // Estimate based on reviews
            reviews: reviews
        });
        setShowDriverModal(true);
    };

    const openBookingDetail = async (bookingId: string) => {
        setIsLoadingDetail(true);
        try {
            const res = await bookingApi.getBooking(bookingId);
            const b = res.data.booking;
            setBookingDetailModal({
                id: b.id,
                busName: b.schedule?.bus?.name || 'N/A',
                busType: b.schedule?.bus?.type || 'DELUXE',
                plateNumber: b.schedule?.bus?.plateNumber || 'N/A',
                amenities: b.schedule?.bus?.amenities || [],
                hasToilet: b.schedule?.bus?.hasToilet || false,
                busRating: b.schedule?.bus?.rating || 0,
                busTotalReviews: b.schedule?.bus?.totalReviews || 0,
                driverName: b.schedule?.bus?.driver?.name || 'N/A',
                driverPhone: b.schedule?.bus?.driver?.phone || 'N/A',
                driverEmail: b.schedule?.bus?.driver?.email || 'N/A',
                driverRating: b.schedule?.bus?.driver?.rating || 0,
                employedDriverName: b.schedule?.bus?.driver?.employedDriverName,
                employedDriverPhone: b.schedule?.bus?.driver?.employedDriverPhone,
                origin: b.schedule?.route?.origin || 'N/A',
                destination: b.schedule?.route?.destination || 'N/A',
                distance: b.schedule?.route?.distance || 0,
                estimatedTime: b.schedule?.route?.estimatedTime || 0,
                departureTime: b.schedule?.departureTime || '',
                arrivalTime: b.schedule?.arrivalTime || '',
                seats: b.seats || [],
                totalAmount: b.totalAmount || 0,
                discountAmount: b.discountAmount || 0,
                paymentMethod: b.paymentMethod || 'ONLINE',
                status: b.status || 'PENDING',
                createdAt: b.createdAt || '',
                busPhotos: b.schedule?.bus?.photos || []
            });
        } catch (err) {
            console.error('Failed to load booking details', err);
            setError('Failed to load booking details');
            setTimeout(() => setError(null), 3000);
        } finally {
            setIsLoadingDetail(false);
        }
    };

    const handleDownloadTicket = (booking: Booking) => {
        const ticketHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>BusGo Ticket - ${booking.id}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', sans-serif; }
        body { background: #f5f5f5; padding: 20px; }
        .ticket { max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 24px; color: white; }
        .header-content { display: flex; justify-content: space-between; align-items: center; }
        .bus-icon { width: 48px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
        .bus-name { font-size: 20px; font-weight: bold; }
        .operator { opacity: 0.8; font-size: 14px; }
        .booking-id { text-align: right; }
        .booking-id-label { font-size: 12px; opacity: 0.8; }
        .booking-id-value { font-family: monospace; font-weight: bold; }
        .content { padding: 24px; }
        .route { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .route-point { text-align: center; }
        .time { font-size: 28px; font-weight: bold; color: #1f2937; }
        .city { color: #6b7280; font-size: 14px; }
        .divider { border-top: 2px dashed #e5e7eb; margin: 24px -24px; position: relative; }
        .divider::before, .divider::after { content: ''; position: absolute; top: -12px; width: 24px; height: 24px; background: #f5f5f5; border-radius: 50%; }
        .divider::before { left: -12px; }
        .divider::after { right: -12px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
        .info-item label { display: block; font-size: 12px; color: #9ca3af; margin-bottom: 4px; }
        .info-item p { font-weight: 500; color: #1f2937; }
        .seats { display: flex; gap: 8px; }
        .seat { background: #ede9fe; color: #6366f1; padding: 4px 12px; border-radius: 6px; font-weight: 600; }
        .payment { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid #e5e7eb; }
        .amount { font-size: 24px; font-weight: bold; color: #6366f1; }
        .status { background: #d1fae5; color: #059669; padding: 8px 16px; border-radius: 8px; font-weight: 600; }
        .footer { background: #f9fafb; padding: 16px 24px; text-align: center; font-size: 12px; color: #6b7280; }
        @media print { body { background: white; padding: 0; } .ticket { box-shadow: none; } }
    </style>
</head>
<body>
    <div class="ticket">
        <div class="header">
            <div class="header-content">
                <div style="display: flex; gap: 12px; align-items: center;">
                    <div class="bus-icon">🚌</div>
                    <div>
                        <div class="bus-name">${booking.busName}</div>
                        <div class="operator">${booking.operator}</div>
                    </div>
                </div>
                <div class="booking-id">
                    <div class="booking-id-label">Booking ID</div>
                    <div class="booking-id-value">${booking.id.slice(0, 8).toUpperCase()}</div>
                </div>
            </div>
        </div>
        <div class="content">
            <div class="route">
                <div class="route-point">
                    <div class="time">${new Date(booking.departureTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
                    <div class="city">${booking.origin}</div>
                </div>
                <div style="flex: 1; text-align: center;">
                    <div style="height: 2px; background: linear-gradient(90deg, #6366f1, #ec4899); margin: 0 20px; position: relative;">
                        <div style="position: absolute; left: -5px; top: -4px; width: 10px; height: 10px; background: #6366f1; border-radius: 50%;"></div>
                        <div style="position: absolute; right: -5px; top: -4px; width: 10px; height: 10px; background: #ec4899; border-radius: 50%;"></div>
                    </div>
                </div>
                <div class="route-point">
                    <div class="time">${new Date(booking.arrivalTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
                    <div class="city">${booking.destination}</div>
                </div>
            </div>
            <div class="divider"></div>
            <div class="info-grid">
                <div class="info-item">
                    <label>Date</label>
                    <p>${new Date(booking.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <div class="info-item">
                    <label>Seats</label>
                    <div class="seats">${booking.seats.map(s => `<span class="seat">${s}</span>`).join('')}</div>
                </div>
                <div class="info-item">
                    <label>Passenger</label>
                    <p>${booking.passengerName || user?.name || 'Passenger'}</p>
                </div>
                <div class="info-item">
                    <label>Bus Number</label>
                    <p>${booking.plateNumber || 'N/A'}</p>
                </div>
            </div>
            <div class="payment">
                <div>
                    <div style="font-size: 12px; color: #9ca3af;">Total Amount</div>
                    <div class="amount">Rs. ${booking.totalAmount.toLocaleString()}</div>
                </div>
                <div class="status">${booking.status}</div>
            </div>
        </div>
        <div class="footer">
            Please arrive at the bus station 30 minutes before departure.<br>
            Carry a valid ID and this ticket for verification.
        </div>
    </div>
    <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(ticketHtml);
            printWindow.document.close();
        }
    };

    const isCompleted = (booking: Booking) => {
        const departureTime = new Date(booking.departureTime).getTime();
        return departureTime < Date.now() || booking.status === 'COMPLETED';
    };

    const canCancel = (booking: Booking) => {
        const departureTime = new Date(booking.departureTime).getTime();
        const now = Date.now();
        const hoursUntilDeparture = (departureTime - now) / (1000 * 60 * 60);
        return booking.status === 'CONFIRMED' && hoursUntilDeparture > 2;
    };

    const canRate = (booking: Booking) => {
        return isCompleted(booking) && !booking.hasReview && booking.status !== 'CANCELLED';
    };

    const canTrack = (booking: Booking) => {
        const departureTime = new Date(booking.departureTime).getTime();
        const arrivalTime = new Date(booking.arrivalTime).getTime();
        const now = Date.now();
        // Can track 1 hour before departure until 1 hour after arrival
        return booking.status === 'CONFIRMED' && now > (departureTime - 3600000) && now < (arrivalTime + 3600000);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'CONFIRMED': return <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs font-medium">Confirmed</span>;
            case 'PENDING': return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg text-xs font-medium">Pending</span>;
            case 'CANCELLED': return <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs font-medium">Cancelled</span>;
            case 'COMPLETED': return <span className="px-2 py-1 bg-slate-500/20 text-slate-400 rounded-lg text-xs font-medium">Completed</span>;
            default: return null;
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-900">
                <Header />
                <main className="pt-24 pb-16">
                    <div className="container mx-auto px-4 text-center py-20">
                        <AlertCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">Please Login</h2>
                        <p className="text-slate-400 mb-6">You need to login to view your bookings</p>
                        <Link to="/login?redirect=/my-bookings" className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl">Login</Link>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900">
            <Header />

            <main className="pt-24 pb-16">
                <div className="container mx-auto px-4 lg:px-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl font-display font-bold text-white mb-2">My <span className="text-gradient">Bookings</span></h1>
                            <p className="text-slate-400">View and manage your bus tickets</p>
                        </div>

                        <div className="flex gap-2">
                            {(['all', 'upcoming', 'past'] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-4 py-2 rounded-lg font-medium capitalize ${filter === f ? 'bg-primary-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
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

                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
                        </div>
                    ) : filteredBookings.length === 0 ? (
                        <div className="text-center py-20">
                            <Ticket className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                            <h2 className="text-xl font-bold text-white mb-2">No Bookings Found</h2>
                            <p className="text-slate-400 mb-6">You haven't made any bookings yet</p>
                            <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl">
                                Search Buses <ChevronRight className="w-5 h-5" />
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredBookings.map((booking) => (
                                <div key={booking.id} className="glass rounded-2xl p-6 hover:border-primary-500/30 border border-transparent transition-all">
                                    <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                                        <div className="flex items-center gap-4 lg:w-1/4">
                                            <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <Bus className="w-7 h-7 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-white">{booking.busName}</h3>
                                                <button
                                                    onClick={() => viewDriverProfile(booking)}
                                                    className="text-sm text-primary-400 hover:text-primary-300 hover:underline"
                                                >
                                                    {booking.operator} →
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="flex items-center gap-3">
                                                <Calendar className="w-5 h-5 text-secondary-400" />
                                                <div>
                                                    <p className="text-sm text-slate-400">Date</p>
                                                    <p className="text-white font-medium">{new Date(booking.date).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <MapPin className="w-5 h-5 text-primary-400" />
                                                <div>
                                                    <p className="text-sm text-slate-400">Route</p>
                                                    <p className="text-white font-medium">{booking.origin} → {booking.destination}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Clock className="w-5 h-5 text-accent-400" />
                                                <div>
                                                    <p className="text-sm text-slate-400">Time</p>
                                                    <p className="text-white font-medium">{new Date(booking.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col md:flex-row lg:flex-col items-start md:items-center lg:items-end gap-3 lg:w-1/4">
                                            <div className="flex items-center gap-3">
                                                {getStatusBadge(booking.status)}
                                                <span className="text-lg font-bold text-gradient">Rs. {booking.totalAmount?.toLocaleString()}</span>
                                            </div>
                                            <div className="text-sm text-slate-400">Seats: <span className="text-white">{booking.seats?.join(', ')}</span></div>

                                            {/* Action Buttons */}
                                            <div className="flex flex-wrap gap-2">
                                                {/* For upcoming: Track Bus, Download, Chat, Cancel */}
                                                {!isCompleted(booking) && booking.status === 'CONFIRMED' && (
                                                    <>
                                                        {canTrack(booking) && booking.scheduleId && (
                                                            <button
                                                                onClick={() => setTrackingModal({ scheduleId: booking.scheduleId!, origin: booking.origin, destination: booking.destination })}
                                                                className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30"
                                                            >
                                                                <Navigation className="w-4 h-4" /> Track
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => openChat(booking)}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-secondary-500/20 text-secondary-400 rounded-lg text-sm hover:bg-secondary-500/30"
                                                        >
                                                            <MessageSquare className="w-4 h-4" /> Chat
                                                        </button>
                                                        <button
                                                            onClick={() => handleDownloadTicket(booking)}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-primary-500/20 text-primary-400 rounded-lg text-sm hover:bg-primary-500/30"
                                                        >
                                                            <Download className="w-4 h-4" /> Ticket
                                                        </button>
                                                        {canCancel(booking) && (
                                                            <button
                                                                onClick={() => setCancelModal(booking.id)}
                                                                className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30"
                                                            >
                                                                <XCircle className="w-4 h-4" /> Cancel
                                                            </button>
                                                        )}
                                                    </>
                                                )}

                                                {/* For completed: Rate button only, no download */}
                                                {canRate(booking) && (
                                                    <button
                                                        onClick={() => setReviewModal({ bookingId: booking.id, busName: booking.busName, driverId: booking.driverId })}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-secondary-500/20 text-secondary-400 rounded-lg text-sm hover:bg-secondary-500/30"
                                                    >
                                                        <Star className="w-4 h-4" /> Rate Trip
                                                    </button>
                                                )}

                                                {/* Already reviewed */}
                                                {booking.hasReview && (
                                                    <span className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 text-slate-400 rounded-lg text-sm">
                                                        <CheckCircle className="w-4 h-4" /> Reviewed
                                                    </span>
                                                )}

                                                {/* View Details - Always shown */}
                                                <button
                                                    onClick={() => openBookingDetail(booking.id)}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20"
                                                >
                                                    <Eye className="w-4 h-4" /> Details
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {/* Tracking Modal */}
                    {trackingModal && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-slate-800 rounded-2xl w-full max-w-lg">
                                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-white">Track Your Bus</h2>
                                    <button onClick={() => setTrackingModal(null)} className="text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
                                </div>
                                <div className="p-4">
                                    <BusTracker
                                        scheduleId={trackingModal.scheduleId}
                                        origin={trackingModal.origin}
                                        destination={trackingModal.destination}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Cancel Modal */}
                    {cancelModal && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-slate-800 rounded-2xl w-full max-w-md p-6">
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <XCircle className="w-8 h-8 text-red-400" />
                                    </div>
                                    <h2 className="text-xl font-semibold text-white mb-2">Cancel Booking?</h2>
                                    <p className="text-slate-400">Are you sure you want to cancel this booking?</p>
                                </div>
                                <div className="bg-slate-900/50 rounded-xl p-4 mb-6">
                                    <p className="text-sm text-slate-400 mb-2">Cancellation Policy:</p>
                                    <ul className="text-sm text-slate-300 space-y-1">
                                        <li>• Full refund if cancelled 24+ hours before departure</li>
                                        <li>• 50% refund if cancelled 2-24 hours before departure</li>
                                        <li>• No refund within 2 hours of departure</li>
                                    </ul>
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

                    {/* Review Modal */}
                    {reviewModal && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-slate-800 rounded-2xl w-full max-w-md">
                                <div className="p-6 border-b border-white/10">
                                    <h2 className="text-xl font-semibold text-white">Rate Your Trip</h2>
                                    <p className="text-slate-400 text-sm">{reviewModal.busName}</p>
                                </div>
                                <form onSubmit={handleSubmitReview} className="p-6 space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-3">How was your experience?</label>
                                        <div className="flex gap-2 justify-center">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    onClick={() => setReviewData({ ...reviewData, rating: star })}
                                                    className={`p-2 rounded-lg transition-all hover:scale-110 ${reviewData.rating >= star ? 'text-yellow-400' : 'text-slate-600'}`}
                                                >
                                                    <Star className="w-10 h-10" fill={reviewData.rating >= star ? 'currentColor' : 'none'} />
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-center text-slate-400 text-sm mt-2">
                                            {reviewData.rating === 1 && 'Poor'}
                                            {reviewData.rating === 2 && 'Fair'}
                                            {reviewData.rating === 3 && 'Good'}
                                            {reviewData.rating === 4 && 'Very Good'}
                                            {reviewData.rating === 5 && 'Excellent'}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Your Feedback</label>
                                        <textarea
                                            value={reviewData.comment}
                                            onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                                            placeholder="Share your experience with the bus, driver, and overall trip..."
                                            rows={4}
                                            className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <button type="button" onClick={() => setReviewModal(null)} className="flex-1 px-4 py-3 bg-slate-700 text-white font-medium rounded-xl">Cancel</button>
                                        <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl btn-glow disabled:opacity-50">
                                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Submit Review'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                </div>
            </main>

            {/* Driver Profile Modal */}
            {showDriverModal && driverProfile && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-slate-800 rounded-2xl w-full max-w-lg my-8">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-white">Driver Profile</h2>
                            <button onClick={() => setShowDriverModal(false)} className="text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="p-6 max-h-[70vh] overflow-y-auto">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center">
                                    <User className="w-10 h-10 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">{driverProfile.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                        <span className="text-white font-medium">{driverProfile.rating.toFixed(1)}</span>
                                        <span className="text-slate-400 text-sm">({driverProfile.totalReviews} reviews)</span>
                                    </div>
                                    <span className="inline-block mt-2 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-lg">✓ Verified Driver</span>
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="space-y-3 mb-6">
                                <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-xl">
                                    <Phone className="w-5 h-5 text-primary-400" />
                                    <div>
                                        <p className="text-xs text-slate-400">Phone</p>
                                        <a href={`tel:${driverProfile.phone}`} className="text-white hover:text-primary-400">{driverProfile.phone}</a>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-xl">
                                    <Mail className="w-5 h-5 text-secondary-400" />
                                    <div>
                                        <p className="text-xs text-slate-400">Email</p>
                                        <a href={`mailto:${driverProfile.email}`} className="text-white hover:text-secondary-400">{driverProfile.email}</a>
                                    </div>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-primary-400">{driverProfile.totalTrips}</p>
                                    <p className="text-sm text-slate-400">Total Trips</p>
                                </div>
                                <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-green-400">{driverProfile.rating.toFixed(1)}</p>
                                    <p className="text-sm text-slate-400">Avg Rating</p>
                                </div>
                            </div>

                            {/* Reviews Section */}
                            <div>
                                <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5" /> Recent Reviews
                                </h4>
                                {driverProfile.reviews.length === 0 ? (
                                    <div className="text-center py-6 text-slate-400">
                                        <Star className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                        <p>No reviews yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {driverProfile.reviews.map((review, idx) => (
                                            <div key={idx} className="bg-slate-900/50 rounded-xl p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center justify-center text-primary-400 text-sm font-bold">
                                                            {review.userName.charAt(0)}
                                                        </div>
                                                        <span className="text-white font-medium text-sm">{review.userName}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {[1, 2, 3, 4, 5].map(star => (
                                                            <Star
                                                                key={star}
                                                                className={`w-4 h-4 ${star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                                {review.comment && (
                                                    <p className="text-slate-300 text-sm">{review.comment}</p>
                                                )}
                                                <p className="text-slate-500 text-xs mt-2">
                                                    {new Date(review.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Chat Modal */}
            {chatModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setChatModal(null)}>
                    <div className="bg-slate-800 rounded-2xl w-full max-w-lg flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
                        <div className="p-4 border-b border-white/10 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-primary-400" />
                                    Chat with Driver
                                </h2>
                                <p className="text-slate-400 text-sm">{chatModal.driverName} • {chatModal.route}</p>
                            </div>
                            <button onClick={() => setChatModal(null)} className="text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
                        </div>

                        {/* Messages */}
                        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[400px]">
                            {chatMessages.length === 0 ? (
                                <div className="text-center py-12 text-slate-400">
                                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>No messages yet</p>
                                    <p className="text-sm mt-2">Start a conversation with your driver</p>
                                </div>
                            ) : (
                                chatMessages.map((msg) => (
                                    <div key={msg.id} className={`flex ${msg.isDriver ? 'justify-start' : 'justify-end'}`}>
                                        <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${msg.isDriver ? 'bg-slate-700' : 'bg-primary-500'}`}>
                                            <p className="text-white">{msg.content}</p>
                                            <p className={`text-xs mt-1 ${msg.isDriver ? 'text-slate-400' : 'text-primary-200'}`}>
                                                {msg.senderName} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-white/10">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                                    placeholder="Type a message..."
                                    className="flex-1 px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
                                />
                                <button
                                    onClick={sendChatMessage}
                                    disabled={isSendingMessage || !newMessage.trim()}
                                    className="px-4 py-3 bg-primary-500 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-600 transition-colors"
                                >
                                    {isSendingMessage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Booking Detail Modal */}
            {bookingDetailModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-slate-800/95 backdrop-blur z-10">
                            <div>
                                <h2 className="text-xl font-semibold text-white">Booking Details</h2>
                                <p className="text-sm text-slate-400">ID: {bookingDetailModal.id.slice(0, 8).toUpperCase()}</p>
                            </div>
                            <button onClick={() => setBookingDetailModal(null)} className="text-slate-400 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {isLoadingDetail ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                            </div>
                        ) : (
                            <div className="p-6 space-y-6">
                                {/* Route & Time */}
                                <div className="glass rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-white">{new Date(bookingDetailModal.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            <p className="text-slate-400">{bookingDetailModal.origin}</p>
                                        </div>
                                        <div className="flex-1 px-4">
                                            <div className="flex items-center gap-2 justify-center text-slate-500">
                                                <div className="h-px flex-1 bg-gradient-to-r from-primary-500 to-secondary-500"></div>
                                                <span className="text-xs">{bookingDetailModal.distance} km • {Math.floor(bookingDetailModal.estimatedTime / 60)}h {bookingDetailModal.estimatedTime % 60}m</span>
                                                <div className="h-px flex-1 bg-gradient-to-r from-secondary-500 to-accent-500"></div>
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-white">{new Date(bookingDetailModal.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            <p className="text-slate-400">{bookingDetailModal.destination}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-center gap-4 text-sm">
                                        <span className="text-slate-400"><Calendar className="w-4 h-4 inline mr-1" />{new Date(bookingDetailModal.departureTime).toLocaleDateString()}</span>
                                        <span className="text-slate-400">Seats: <span className="text-white font-medium">{bookingDetailModal.seats.join(', ')}</span></span>
                                    </div>
                                </div>

                                {/* Bus Info */}
                                <div className="glass rounded-xl p-4">
                                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2"><Bus className="w-5 h-5 text-primary-400" /> Bus Details</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-slate-400">Bus Name</p>
                                            <p className="text-white font-medium">{bookingDetailModal.busName}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-400">Type</p>
                                            <p className="text-white font-medium">{bookingDetailModal.busType}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-400">Plate Number</p>
                                            <p className="text-white font-medium">{bookingDetailModal.plateNumber}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-400">Rating</p>
                                            <p className="text-white font-medium flex items-center gap-1">
                                                <Star className="w-4 h-4 text-yellow-400" fill="currentColor" />
                                                {bookingDetailModal.busRating.toFixed(1)} ({bookingDetailModal.busTotalReviews} reviews)
                                            </p>
                                        </div>
                                    </div>
                                    {bookingDetailModal.amenities.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-white/10">
                                            <p className="text-sm text-slate-400 mb-2">Amenities</p>
                                            <div className="flex flex-wrap gap-2">
                                                {bookingDetailModal.amenities.map((a, i) => (
                                                    <span key={i} className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1">
                                                        {a.toLowerCase().includes('wifi') && <Wifi className="w-3 h-3" />}
                                                        {a.toLowerCase().includes('ac') && <Snowflake className="w-3 h-3" />}
                                                        {a.toLowerCase().includes('charging') && <Zap className="w-3 h-3" />}
                                                        {a}
                                                    </span>
                                                ))}
                                                {bookingDetailModal.hasToilet && (
                                                    <span className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs">🚽 Toilet</span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {/* Bus Photos */}
                                    {bookingDetailModal.busPhotos && bookingDetailModal.busPhotos.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-white/10">
                                            <p className="text-sm text-slate-400 mb-3">Bus Photos</p>
                                            <div className="flex gap-3 overflow-x-auto pb-2">
                                                {bookingDetailModal.busPhotos.map((photo, i) => (
                                                    <img
                                                        key={i}
                                                        src={photo}
                                                        alt={`Bus photo ${i + 1}`}
                                                        className="w-32 h-24 rounded-lg object-cover flex-shrink-0 hover:scale-105 transition-transform cursor-pointer"
                                                        onClick={() => window.open(photo, '_blank')}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Driver Info */}
                                <div className="glass rounded-xl p-4">
                                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2"><User className="w-5 h-5 text-secondary-400" /> Driver Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-slate-400">Driver Name</p>
                                            <p className="text-white font-medium">{bookingDetailModal.driverName}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-400">Rating</p>
                                            <p className="text-white font-medium flex items-center gap-1">
                                                <Star className="w-4 h-4 text-yellow-400" fill="currentColor" />
                                                {bookingDetailModal.driverRating.toFixed(1)}
                                            </p>
                                        </div>
                                        <div className="md:col-span-2">
                                            <p className="text-sm text-slate-400 mb-1">Contact</p>
                                            <div className="flex flex-wrap gap-3">
                                                <a href={`tel:${bookingDetailModal.driverPhone}`} className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30">
                                                    <Phone className="w-5 h-5" />
                                                    <span className="font-medium">{bookingDetailModal.driverPhone}</span>
                                                </a>
                                                <a href={`mailto:${bookingDetailModal.driverEmail}`} className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30">
                                                    <Mail className="w-5 h-5" />
                                                    <span>{bookingDetailModal.driverEmail}</span>
                                                </a>
                                            </div>
                                        </div>
                                        {bookingDetailModal.employedDriverName && (
                                            <div className="md:col-span-2 pt-3 border-t border-white/10">
                                                <p className="text-sm text-slate-400 mb-1">Current Driver (Employed)</p>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-white font-medium">{bookingDetailModal.employedDriverName}</span>
                                                    {bookingDetailModal.employedDriverPhone && (
                                                        <a href={`tel:${bookingDetailModal.employedDriverPhone}`} className="flex items-center gap-1 text-green-400 hover:text-green-300">
                                                            <Phone className="w-4 h-4" /> {bookingDetailModal.employedDriverPhone}
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Payment Info */}
                                <div className="glass rounded-xl p-4">
                                    <h3 className="text-lg font-semibold text-white mb-3">Payment Details</h3>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-slate-400">Total Amount</p>
                                            <p className="text-2xl font-bold text-gradient">Rs. {bookingDetailModal.totalAmount.toLocaleString()}</p>
                                            {bookingDetailModal.discountAmount > 0 && (
                                                <p className="text-sm text-green-400">Saved Rs. {bookingDetailModal.discountAmount}</p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-slate-400">Payment Method</p>
                                            <p className="text-white font-medium">{bookingDetailModal.paymentMethod}</p>
                                            <span className={`inline-block mt-1 px-2 py-1 rounded text-xs ${bookingDetailModal.status === 'CONFIRMED' ? 'bg-green-500/20 text-green-400' :
                                                bookingDetailModal.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    bookingDetailModal.status === 'CANCELLED' ? 'bg-red-500/20 text-red-400' :
                                                        'bg-slate-500/20 text-slate-400'
                                                }`}>{bookingDetailModal.status}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
}

