import { useState, useEffect } from 'react';
import { Bell, CheckCheck, Loader2, ArrowLeft, Filter, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { useAuth } from '../context/AuthContext';
import { notificationApi } from '../services/api';

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
}

export default function Notifications() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    useEffect(() => {
        if (user) fetchNotifications();
    }, [user]);

    const fetchNotifications = async () => {
        try {
            setIsLoading(true);
            const response = await notificationApi.getNotifications();
            setNotifications(response.data.notifications || []);
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        } finally {
            setIsLoading(false);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            await notificationApi.markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (error) {
            console.error('Failed to mark as read', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await notificationApi.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (error) {
            console.error('Failed to mark all as read', error);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'BOOKING_CONFIRMATION': return '✅';
            case 'TRIP_REMINDER': return '⏰';
            case 'BOOKING_CANCELLED': return '❌';
            case 'DRIVER_NEW_BOOKING': return '📋';
            case 'REVIEW_REQUEST': return '⭐';
            case 'LOYALTY_EARNED': return '🎁';
            case 'PROMOTION': return '🎉';
            default: return '📢';
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'BOOKING_CONFIRMATION': return 'Booking';
            case 'TRIP_REMINDER': return 'Reminder';
            case 'BOOKING_CANCELLED': return 'Cancelled';
            case 'DRIVER_NEW_BOOKING': return 'New Booking';
            case 'REVIEW_REQUEST': return 'Review';
            case 'LOYALTY_EARNED': return 'Loyalty';
            case 'PROMOTION': return 'Promo';
            default: return 'Other';
        }
    };

    const getTypeBadgeColor = (type: string) => {
        switch (type) {
            case 'BOOKING_CONFIRMATION': return 'bg-green-500/20 text-green-400';
            case 'TRIP_REMINDER': return 'bg-amber-500/20 text-amber-400';
            case 'BOOKING_CANCELLED': return 'bg-red-500/20 text-red-400';
            case 'DRIVER_NEW_BOOKING': return 'bg-blue-500/20 text-blue-400';
            case 'REVIEW_REQUEST': return 'bg-purple-500/20 text-purple-400';
            case 'LOYALTY_EARNED': return 'bg-primary-500/20 text-primary-400';
            case 'PROMOTION': return 'bg-pink-500/20 text-pink-400';
            default: return 'bg-slate-500/20 text-slate-400';
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const filteredNotifications = filter === 'unread'
        ? notifications.filter(n => !n.read)
        : notifications;

    const unreadCount = notifications.filter(n => !n.read).length;

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 pt-32 pb-16">
                    <div className="container mx-auto px-4 text-center">
                        <Bell className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <h2 className="text-2xl font-semibold text-white mb-2">Sign in to view notifications</h2>
                        <p className="text-slate-400 mb-6">You need to be logged in to see your notifications.</p>
                        <Link to="/login" className="px-6 py-3 bg-primary-500 text-white rounded-xl inline-block">
                            Sign In
                        </Link>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 pt-32 pb-16">
                <div className="container mx-auto px-4 lg:px-8 max-w-3xl">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <Link to="/" className="p-2 glass rounded-xl hover:bg-white/10 transition-colors">
                                <ArrowLeft className="w-5 h-5 text-white" />
                            </Link>
                            <div>
                                <h1 className="text-2xl font-display font-bold text-white">Notifications</h1>
                                <p className="text-slate-400">{unreadCount} unread notifications</p>
                            </div>
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="px-4 py-2 bg-primary-500/20 text-primary-400 rounded-xl flex items-center gap-2 hover:bg-primary-500/30 transition-colors"
                            >
                                <CheckCheck className="w-4 h-4" />
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Filters */}
                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === 'all'
                                    ? 'bg-primary-500 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:text-white'
                                }`}
                        >
                            All ({notifications.length})
                        </button>
                        <button
                            onClick={() => setFilter('unread')}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === 'unread'
                                    ? 'bg-primary-500 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:text-white'
                                }`}
                        >
                            Unread ({unreadCount})
                        </button>
                    </div>

                    {/* Notifications List */}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                        </div>
                    ) : filteredNotifications.length === 0 ? (
                        <div className="glass rounded-2xl p-12 text-center">
                            <Bell className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                            <h2 className="text-xl font-semibold text-white mb-2">
                                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                            </h2>
                            <p className="text-slate-400">
                                {filter === 'unread'
                                    ? 'You\'re all caught up!'
                                    : 'When you receive notifications, they\'ll appear here.'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredNotifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    onClick={() => !notification.read && markAsRead(notification.id)}
                                    className={`glass rounded-2xl p-5 cursor-pointer transition-all hover:border-primary-500/30 ${!notification.read ? 'border-l-4 border-l-primary-500 bg-primary-500/5' : ''
                                        }`}
                                >
                                    <div className="flex gap-4">
                                        <div className="text-3xl flex-shrink-0">
                                            {getTypeIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4 mb-2">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <h3 className="font-semibold text-white">{notification.title}</h3>
                                                    <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${getTypeBadgeColor(notification.type)}`}>
                                                        {getTypeLabel(notification.type)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {!notification.read && (
                                                        <span className="w-2 h-2 bg-primary-500 rounded-full" />
                                                    )}
                                                    <span className="text-slate-500 text-sm">
                                                        {formatTime(notification.createdAt)}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-slate-400">{notification.message}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}
