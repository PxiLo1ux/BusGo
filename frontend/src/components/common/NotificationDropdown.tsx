import { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { notificationApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
}

export default function NotificationDropdown() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (user) fetchNotifications();
    }, [user]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        try {
            setIsLoading(true);
            const response = await notificationApi.getNotifications();
            setNotifications(response.data.notifications || []);
            setUnreadCount(response.data.unreadCount || 0);
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
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark as read', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await notificationApi.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read', error);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'BOOKING_CONFIRMATION': return '✅';
            case 'TRIP_REMINDER': return '⏰';
            case 'DRIVER_NEW_BOOKING': return '📋';
            case 'REVIEW_REQUEST': return '⭐';
            case 'LOYALTY_EARNED': return '🎁';
            default: return '📢';
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        return date.toLocaleDateString();
    };

    if (!user) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-400 hover:text-white transition-colors"
            >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-800 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
                    <div className="p-4 border-b border-white/10 flex items-center justify-between">
                        <h3 className="font-semibold text-white">Notifications</h3>
                        {unreadCount > 0 && (
                            <button onClick={markAllAsRead} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
                                <CheckCheck className="w-4 h-4" /> Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-72 overflow-y-auto">
                        {isLoading ? (
                            <div className="p-8 text-center text-slate-400">Loading...</div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">No notifications</div>
                        ) : (
                            notifications.slice(0, 5).map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${!notification.read ? 'bg-primary-500/5' : ''}`}
                                    onClick={() => !notification.read && markAsRead(notification.id)}
                                >
                                    <div className="flex gap-3">
                                        <span className="text-xl">{getTypeIcon(notification.type)}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="font-medium text-white text-sm truncate">{notification.title}</p>
                                                {!notification.read && <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0" />}
                                            </div>
                                            <p className="text-slate-400 text-xs mt-1 line-clamp-2">{notification.message}</p>
                                            <p className="text-slate-500 text-xs mt-1">{formatTime(notification.createdAt)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* View All Link */}
                    <Link
                        to="/notifications"
                        onClick={() => setIsOpen(false)}
                        className="block p-3 text-center text-primary-400 hover:text-primary-300 hover:bg-white/5 transition-colors border-t border-white/10 font-medium text-sm flex items-center justify-center gap-2"
                    >
                        View All Notifications <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            )}
        </div>
    );
}

