import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authApi = {
    login: (email: string, password: string) => api.post('/auth/login', { email, password }),
    register: (data: any) => api.post('/auth/register', data),
    logout: () => api.post('/auth/logout'),
    getMe: () => api.get('/auth/me'),
};

// Search API
export const searchApi = {
    searchBuses: (origin: string, destination: string, date: string) =>
        api.get('/search', { params: { origin, destination, date } }),
    getSchedule: (scheduleId: string) => api.get(`/search/schedules/${scheduleId}`),
    getSeats: (scheduleId: string) => api.get(`/search/schedules/${scheduleId}/seats`),
    getRoutes: () => api.get('/search/routes'),
    getCities: () => api.get('/search/cities'),
};

// Booking API
export const bookingApi = {
    createBooking: (data: any) => api.post('/bookings', data),
    getBooking: (bookingId: string) => api.get(`/bookings/${bookingId}`),
    getUserBookings: () => api.get('/bookings/my'),
    cancelBooking: (bookingId: string) => api.delete(`/bookings/${bookingId}`),
};

// Payment API
export const paymentApi = {
    createPaymentIntent: (bookingId: string) => api.post('/payments/create-intent', { bookingId }),
    confirmPayment: (bookingId: string, paymentIntentId: string) =>
        api.post('/payments/confirm', { bookingId, paymentIntentId }),
};

// Driver API
export const driverApi = {
    getDashboard: () => api.get('/drivers/dashboard'),
    getAnalytics: () => api.get('/drivers/analytics'),

    // Buses
    getBuses: () => api.get('/drivers/buses'),
    addBus: (data: any) => api.post('/drivers/buses', data),
    updateBus: (busId: string, data: any) => api.put(`/drivers/buses/${busId}`, data),
    deleteBus: (busId: string) => api.delete(`/drivers/buses/${busId}`),
    getBusSeatLayout: (busId: string) => api.get(`/drivers/buses/${busId}/seat-layout`),

    // Routes
    getRoutes: () => api.get('/drivers/routes'),
    addRoute: (data: any) => api.post('/drivers/routes', data),
    updateRoute: (routeId: string, data: any) => api.put(`/drivers/routes/${routeId}`, data),
    deleteRoute: (routeId: string) => api.delete(`/drivers/routes/${routeId}`),

    // Schedules (legacy - individual trip schedules)
    getSchedules: () => api.get('/drivers/schedules'),
    createSchedule: (data: any) => api.post('/drivers/schedules', data),
    addSchedule: (data: any) => api.post('/drivers/schedules', data),
    updateSchedule: (scheduleId: string, data: any) => api.put(`/drivers/schedules/${scheduleId}`, data),
    deleteSchedule: (scheduleId: string) => api.delete(`/drivers/schedules/${scheduleId}`),

    // Daily Schedules (simplified recurring templates)
    getDailySchedules: () => api.get('/drivers/daily-schedules'),
    createDailySchedule: (data: any) => api.post('/drivers/daily-schedules', data),
    updateDailySchedule: (id: string, data: any) => api.put(`/drivers/daily-schedules/${id}`, data),
    toggleDailySchedule: (id: string) => api.put(`/drivers/daily-schedules/${id}/toggle`),
    deleteDailySchedule: (id: string) => api.delete(`/drivers/daily-schedules/${id}`),

    // Delay Schedule
    delaySchedule: (id: string, data: { delayMinutes: number; reason?: string }) =>
        api.put(`/drivers/schedules/${id}/delay`, data),

    // Upcoming Schedules (monthly view)
    getUpcomingSchedules: () => api.get('/drivers/upcoming-schedules'),
    generateSchedules: () => api.post('/drivers/generate-schedules'),

    // Bookings
    getBookings: () => api.get('/drivers/bookings'),
};

// Admin API
export const adminApi = {
    getDashboard: () => api.get('/admin/dashboard'),

    // Drivers
    getDrivers: () => api.get('/admin/drivers'),
    getDriverDetails: (driverId: string) => api.get(`/admin/drivers/${driverId}`),
    verifyDriver: (driverId: string, status: 'APPROVED' | 'REJECTED') =>
        api.put(`/admin/drivers/${driverId}/verify`, { status }),

    // Buses
    getAllBuses: () => api.get('/admin/buses'),
    getPendingBuses: () => api.get('/admin/buses/pending'),
    approveBus: (busId: string, approved: boolean) =>
        api.put(`/admin/buses/${busId}/approve`, { approved }),

    // Reports
    getReports: (startDate: string, endDate: string) =>
        api.get('/admin/reports', { params: { startDate, endDate } }),
    getDriverAnalytics: (driverId: string) => api.get(`/admin/drivers/${driverId}/analytics`),

    // Pricing rules
    getPricingRules: () => api.get('/admin/pricing-rules'),
    createPricingRule: (data: any) => api.post('/admin/pricing-rules', data),
    updatePricingRule: (ruleId: string, data: any) => api.put(`/admin/pricing-rules/${ruleId}`, data),
    deletePricingRule: (ruleId: string) => api.delete(`/admin/pricing-rules/${ruleId}`),
    togglePricingRule: (ruleId: string) => api.put(`/admin/pricing-rules/${ruleId}/toggle`),

    // Loyalty Offers
    getLoyaltyOffers: () => api.get('/admin/loyalty-offers'),
    createLoyaltyOffer: (data: any) => api.post('/admin/loyalty-offers', data),
    updateLoyaltyOffer: (offerId: string, data: any) => api.put(`/admin/loyalty-offers/${offerId}`, data),
    deleteLoyaltyOffer: (offerId: string) => api.delete(`/admin/loyalty-offers/${offerId}`),
    toggleLoyaltyOffer: (offerId: string) => api.put(`/admin/loyalty-offers/${offerId}/toggle`),
    getLoyaltyStats: () => api.get('/admin/loyalty-stats'),
    getLoyaltyClaims: () => api.get('/admin/loyalty-claims'),
    getUserProfile: (userId: string) => api.get(`/admin/users/${userId}/profile`),
};

// Notification API
export const notificationApi = {
    getNotifications: () => api.get('/notifications'),
    markAsRead: (notificationId: string) => api.put(`/notifications/${notificationId}/read`),
    markAllAsRead: () => api.put('/notifications/read-all'),
};

// Loyalty API
export const loyaltyApi = {
    getStatus: () => api.get('/loyalty/status'),
    calculatePoints: (amount: number, usePoints?: number) =>
        api.get('/loyalty/calculate', { params: { amount, usePoints } }),
    getOffers: () => api.get('/loyalty/offers'),
    claimOffer: (offerId: string) => api.post(`/loyalty/offers/${offerId}/claim`),
    getRedeemed: () => api.get('/loyalty/redeemed'),
    getAvailableRewards: () => api.get('/loyalty/available-rewards'),
};

// Review API
export const reviewApi = {
    getScheduleReviews: (scheduleId: string) => api.get(`/reviews/schedule/${scheduleId}`),
    getDriverReviews: (driverId: string) => api.get(`/reviews/driver/${driverId}`),
    submitReview: (data: { bookingId: string; rating: number; comment?: string }) =>
        api.post('/reviews', data),
    getPendingReviews: () => api.get('/reviews/pending'),
};

// Routes API (public)
export const routesApi = {
    getAll: () => api.get('/routes'),
};

// Support API
export const supportApi = {
    submitTicket: (data: { email: string; category: string; description: string; userId?: string }) =>
        api.post('/support/tickets', data),
    getMyTickets: () => api.get('/support/tickets'),
    getTicket: (ticketId: string) => api.get(`/support/tickets/${ticketId}`),
    addMessage: (ticketId: string, content: string) => api.post(`/support/tickets/${ticketId}/messages`, { content }),
    // Admin
    getAllTickets: (status?: string) => api.get('/support/admin/tickets', { params: { status } }),
    updateTicketStatus: (ticketId: string, status: string) => api.patch(`/support/admin/tickets/${ticketId}`, { status }),
    addAdminMessage: (ticketId: string, content: string) => api.post(`/support/tickets/${ticketId}/messages`, { content }),
};

// Chat API (passenger-driver booking chat)
export const chatApi = {
    getChats: () => api.get('/chat'),
    getMessages: (bookingId: string) => api.get(`/chat/${bookingId}`),
    sendMessage: (bookingId: string, content: string) => api.post(`/chat/${bookingId}`, { content }),
    getMergedChat: (participantId: string) => api.get(`/chat/merged/${participantId}`),
    // Admin endpoints
    getAdminConversations: () => api.get('/chat/admin/conversations'),
    getAdminConversation: (pairId: string) => api.get(`/chat/admin/conversation/${pairId}`),
};

// Profile API
export const profileApi = {
    updateProfile: (data: { name?: string; phone?: string; profilePicture?: string }) => api.put('/auth/profile', data),
    changePassword: (currentPassword: string, newPassword: string) =>
        api.post('/auth/change-password', { currentPassword, newPassword }),
};

// Tracking API (Live bus tracking)
export const trackingApi = {
    getLocation: (scheduleId: string) => api.get(`/tracking/${scheduleId}`),
    updateLocation: (data: { scheduleId: string; latitude: number; longitude: number; speed?: number; heading?: number }) =>
        api.post('/tracking/update', data),
    getHistory: (scheduleId: string) => api.get(`/tracking/${scheduleId}/history`),
    getAllBusLocations: () => api.get('/tracking/admin/all'),
};

// Driver Ratings API
export const ratingsApi = {
    submitRating: (data: { bookingId: string; rating: number; comment?: string }) =>
        api.post('/ratings', data),
    getDriverRatings: (driverId: string, limit?: number) =>
        api.get(`/ratings/driver/${driverId}`, { params: { limit } }),
    canRate: (bookingId: string) => api.get(`/ratings/can-rate/${bookingId}`),
};

// Referrals API
export const referralsApi = {
    getMyCode: () => api.get('/referrals/my-code'),
    applyCode: (code: string) => api.post('/referrals/apply', { code }),
    validateCode: (code: string) => api.get(`/referrals/validate/${code}`),
    completeReferral: () => api.post('/referrals/complete'),
};

// Locations API (for waypoints autocomplete)
export const locationsApi = {
    search: (query: string) => api.get('/locations/search', { params: { q: query } }),
    getAll: () => api.get('/locations'),
    create: (data: { name: string; district?: string; latitude?: number; longitude?: number }) =>
        api.post('/locations', data),
};
