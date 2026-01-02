import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './modules/auth/routes.js';
import searchRoutes from './modules/search/routes.js';
import bookingRoutes from './modules/bookings/routes.js';
import driverRoutes from './modules/drivers/routes.js';
import adminRoutes from './modules/admin/routes.js';
import paymentRoutes from './modules/payments/routes.js';
import notificationRoutes from './modules/notifications/routes.js';
import loyaltyRoutes from './modules/loyalty/routes.js';
import reviewRoutes from './modules/reviews/routes.js';
import supportRoutes from './modules/support/routes.js';
import chatRoutes from './modules/chat/routes.js';
import trackingRoutes from './modules/tracking/routes.js';
import ratingsRoutes from './modules/ratings/routes.js';
import referralsRoutes from './modules/referrals/routes.js';
import locationsRoutes from './modules/locations/routes.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
export const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));  // Increased limit for base64 image uploads
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/referrals', referralsRoutes);
app.use('/api/locations', locationsRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚌 BusGo API running on http://localhost:${PORT}`);
});
