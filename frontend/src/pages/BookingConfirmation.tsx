import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Bus, Calendar, Download, Home, Loader2, AlertCircle, QrCode } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { bookingApi } from '../services/api';

interface BookingData {
    id: string;
    status: string;
    seats: string[];
    totalAmount: number;
    discountAmount: number;
    loyaltyUsed: number;
    passengerName: string;
    passengerEmail: string;
    passengerPhone: string;
    paymentMethod: string;
    createdAt: string;
    hasReview?: boolean;
    hasDriverRating?: boolean;
    schedule: {
        departureTime: string;
        arrivalTime: string;
        price: number;
        route: {
            origin: string;
            destination: string;
            distance: number;
            estimatedTime: number;
        };
        bus: {
            id: string;
            name: string;
            plateNumber: string;
            type: string;
            capacity: number;
            amenities: string[];
            rating: number;
            totalReviews: number;
            hasToilet: boolean;
            photos: string[];
            driver: {
                id: string;
                name: string;
                phone: string;
                email: string;
                rating: number;
                totalReviews: number;
                verified: boolean;
                employedDriverName?: string;
                employedDriverPhone?: string;
            }
        };
    };
}

export default function BookingConfirmation() {
    const { bookingId } = useParams();
    const [isLoaded, setIsLoaded] = useState(false);
    const [booking, setBooking] = useState<BookingData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const ticketRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchBooking = async () => {
            if (!bookingId) return;
            try {
                const res = await bookingApi.getBooking(bookingId);
                setBooking(res.data.booking);
                setTimeout(() => setIsLoaded(true), 300);
            } catch (err: any) {
                setError(err.response?.data?.message || 'Failed to load booking');
            }
        };
        fetchBooking();
    }, [bookingId]);

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getDuration = (dep: string, arr: string) => {
        const depTime = new Date(dep).getTime();
        const arrTime = new Date(arr).getTime();
        const diff = arrTime - depTime;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${mins}m`;
    };

    const downloadTicket = async () => {
        if (!ticketRef.current || !booking) return;

        // Create a printable version
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const ticketHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>BusGo Ticket - ${booking.id}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { background: #f5f5f5; padding: 20px; }
        .ticket { max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 24px; color: white; }
        .header-content { display: flex; justify-content: space-between; align-items: center; }
        .bus-icon { width: 48px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .bus-name { font-size: 20px; font-weight: bold; }
        .operator { opacity: 0.8; font-size: 14px; }
        .booking-id { text-align: right; }
        .booking-id-label { font-size: 12px; opacity: 0.8; }
        .booking-id-value { font-family: monospace; font-weight: bold; font-size: 14px; }
        .content { padding: 24px; }
        .route { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .route-point { text-align: center; }
        .time { font-size: 28px; font-weight: bold; color: #1f2937; }
        .city { color: #6b7280; font-size: 14px; }
        .route-line { flex: 1; height: 2px; background: linear-gradient(90deg, #6366f1, #ec4899); margin: 0 20px; position: relative; }
        .route-line::before, .route-line::after { content: ''; position: absolute; top: -4px; width: 10px; height: 10px; border-radius: 50%; }
        .route-line::before { left: -5px; background: #6366f1; }
        .route-line::after { right: -5px; background: #ec4899; }
        .duration { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 8px; }
        .divider { border-top: 2px dashed #e5e7eb; margin: 24px -24px; position: relative; }
        .divider::before, .divider::after { content: ''; position: absolute; top: -12px; width: 24px; height: 24px; background: #f5f5f5; border-radius: 50%; }
        .divider::before { left: -12px; }
        .divider::after { right: -12px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
        .info-item label { display: block; font-size: 12px; color: #9ca3af; margin-bottom: 4px; }
        .info-item p { font-weight: 500; color: #1f2937; }
        .seats { display: flex; gap: 8px; }
        .seat { background: #ede9fe; color: #6366f1; padding: 4px 12px; border-radius: 6px; font-weight: 600; font-size: 13px; }
        .payment { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid #e5e7eb; }
        .amount { font-size: 24px; font-weight: bold; background: linear-gradient(135deg, #6366f1, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .paid-badge { background: #d1fae5; color: #059669; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 14px; }
        .footer { background: #f9fafb; padding: 16px 24px; text-align: center; font-size: 12px; color: #6b7280; }
        .qr { text-align: center; margin: 16px 0; }
        .qr-placeholder { display: inline-block; padding: 16px; background: #f3f4f6; border-radius: 8px; }
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
                        <div class="bus-name">${booking.schedule.bus.name}</div>
                        <div class="operator">Driver: ${booking.schedule.bus.driver.name}</div>
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
                    <div class="time">${formatTime(booking.schedule.departureTime)}</div>
                    <div class="city">${booking.schedule.route.origin}</div>
                </div>
                <div style="flex: 1; text-align: center;">
                    <div class="route-line"></div>
                    <div class="duration">${getDuration(booking.schedule.departureTime, booking.schedule.arrivalTime)}</div>
                </div>
                <div class="route-point">
                    <div class="time">${formatTime(booking.schedule.arrivalTime)}</div>
                    <div class="city">${booking.schedule.route.destination}</div>
                </div>
            </div>
            <div class="divider"></div>
            <div class="info-grid">
                <div class="info-item">
                    <label>Date</label>
                    <p>${formatDate(booking.schedule.departureTime)}</p>
                </div>
                <div class="info-item">
                    <label>Seats</label>
                    <div class="seats">
                        ${booking.seats.map(s => `<span class="seat">${s}</span>`).join('')}
                    </div>
                </div>
                <div class="info-item">
                    <label>Passenger</label>
                    <p>${booking.passengerName}</p>
                </div>
                <div class="info-item">
                    <label>Bus Number</label>
                    <p>${booking.schedule.bus.plateNumber}</p>
                </div>
            </div>
            <div class="qr">
                <div class="qr-placeholder">
                    <div style="font-size: 48px;">📱</div>
                    <div style="font-size: 10px; color: #9ca3af;">Scan at boarding</div>
                </div>
            </div>
            <div class="payment">
                <div>
                    <div style="font-size: 12px; color: #9ca3af;">Total Paid</div>
                    <div class="amount">Rs. ${booking.totalAmount.toLocaleString()}</div>
                    ${booking.discountAmount > 0 ? `<div style="color: #10b981; font-size: 12px;">You saved Rs. ${booking.discountAmount.toLocaleString()}</div>` : ''}
                </div>
                <div class="paid-badge">✓ PAID</div>
            </div>
        </div>
        <div class="footer">
            Please arrive at the bus station at least 30 minutes before departure.<br>
            Carry a valid ID and this ticket for verification.
        </div>
    </div>
    <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

        printWindow.document.write(ticketHtml);
        printWindow.document.close();
    };

    if (error) {
        return (
            <div className="min-h-screen bg-slate-900">
                <Header />
                <main className="pt-24 pb-16">
                    <div className="container mx-auto px-4 text-center py-20">
                        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">Booking Not Found</h2>
                        <p className="text-slate-400 mb-6">{error}</p>
                        <Link to="/" className="px-6 py-3 bg-primary-500 text-white rounded-xl">Back to Home</Link>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    if (!booking) {
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
                <div className="container mx-auto px-4 lg:px-8 max-w-2xl">
                    {/* Success Animation */}
                    <div className={`text-center mb-8 transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                        <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-gentle">
                            <CheckCircle className="w-12 h-12 text-green-500" />
                        </div>
                        <h1 className="text-3xl font-display font-bold text-white mb-2">
                            Booking Confirmed!
                        </h1>
                        <p className="text-slate-400">
                            Your tickets have been booked successfully. A confirmation has been sent to your email.
                        </p>
                    </div>

                    {/* Ticket Card */}
                    <div ref={ticketRef} className={`glass rounded-3xl overflow-hidden transition-all duration-700 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                        {/* Header */}
                        <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                        <Bus className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">{booking.schedule.bus.name}</h2>
                                        <p className="text-white/80 text-sm">Driver: {booking.schedule.bus.driver.name}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-white/80 text-sm">Booking ID</p>
                                    <p className="text-white font-mono font-bold">{booking.id.slice(0, 8).toUpperCase()}</p>
                                </div>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="p-6 space-y-6">
                            {/* Route */}
                            <div className="flex items-center justify-between">
                                <div className="text-center">
                                    <p className="text-3xl font-bold text-white">{formatTime(booking.schedule.departureTime)}</p>
                                    <p className="text-slate-400">{booking.schedule.route.origin}</p>
                                </div>
                                <div className="flex-1 mx-6">
                                    <div className="relative flex items-center">
                                        <div className="w-3 h-3 rounded-full bg-primary-500" />
                                        <div className="flex-1 h-0.5 bg-gradient-to-r from-primary-500 to-secondary-500" />
                                        <div className="w-3 h-3 rounded-full bg-secondary-500" />
                                    </div>
                                    <p className="text-center text-slate-500 text-sm mt-2">
                                        {getDuration(booking.schedule.departureTime, booking.schedule.arrivalTime)}
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-3xl font-bold text-white">{formatTime(booking.schedule.arrivalTime)}</p>
                                    <p className="text-slate-400">{booking.schedule.route.destination}</p>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-dashed border-white/20 relative">
                                <div className="absolute -left-10 -top-4 w-8 h-8 bg-slate-900 rounded-full" />
                                <div className="absolute -right-10 -top-4 w-8 h-8 bg-slate-900 rounded-full" />
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-slate-400 text-sm mb-1">Date</p>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-primary-400" />
                                        <p className="text-white">{formatDate(booking.schedule.departureTime)}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-slate-400 text-sm mb-1">Seats</p>
                                    <div className="flex items-center gap-2">
                                        <div className="flex gap-1">
                                            {booking.seats.map((seat) => (
                                                <span key={seat} className="px-2 py-1 bg-primary-500/20 text-primary-400 rounded text-sm font-medium">
                                                    {seat}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-slate-400 text-sm mb-1">Passenger</p>
                                    <p className="text-white">{booking.passengerName}</p>
                                </div>
                                <div>
                                    <p className="text-slate-400 text-sm mb-1">Bus Number</p>
                                    <p className="text-white">{booking.schedule.bus.plateNumber}</p>
                                </div>
                            </div>

                            {/* QR Code placeholder */}
                            <div className="text-center">
                                <div className="inline-block p-4 bg-slate-800/50 rounded-xl">
                                    <QrCode className="w-16 h-16 text-slate-400 mx-auto" />
                                    <p className="text-slate-500 text-xs mt-2">Scan at boarding</p>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-dashed border-white/20" />

                            {/* Payment */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-slate-400 text-sm">Total Paid</p>
                                    <p className="text-2xl font-bold text-gradient">Rs. {booking.totalAmount.toLocaleString()}</p>
                                    {booking.discountAmount > 0 && (
                                        <p className="text-green-400 text-sm">You saved Rs. {booking.discountAmount.toLocaleString()}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-lg">
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                    <span className="text-green-400 font-medium">Paid</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className={`mt-8 flex flex-col sm:flex-row gap-4 transition-all duration-700 delay-400 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                        <button
                            onClick={downloadTicket}
                            className="flex-1 px-6 py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl transition-all duration-300 btn-glow flex items-center justify-center gap-2"
                        >
                            <Download className="w-5 h-5" />
                            Download Ticket
                        </button>
                        <Link
                            to="/"
                            className="flex-1 px-6 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
                        >
                            <Home className="w-5 h-5" />
                            Back to Home
                        </Link>
                    </div>

                    {/* Info Box */}
                    <div className={`mt-8 p-4 bg-slate-800/50 rounded-xl border border-white/10 transition-all duration-700 delay-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                        <p className="text-slate-400 text-sm text-center">
                            Please arrive at the bus station at least 30 minutes before departure.
                            Carry a valid ID and this ticket (printed or digital) for verification.
                        </p>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
