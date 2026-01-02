import { Router } from 'express';
import { prisma } from '../../index.js';
import { authenticate, AuthRequest } from '../../middleware/auth.js';
import { AppError } from '../../middleware/errorHandler.js';
import { createNotification } from '../notifications/routes.js';

const router = Router();

router.use(authenticate);

// Get reviews for a schedule/bus
router.get('/schedule/:scheduleId', async (req: AuthRequest, res, next) => {
    try {
        const reviews = await prisma.review.findMany({
            where: { scheduleId: req.params.scheduleId },
            include: { user: { select: { name: true } } },
            orderBy: { createdAt: 'desc' }
        });

        const avg = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
        res.json({ success: true, reviews, averageRating: Math.round(avg * 10) / 10, totalReviews: reviews.length });
    } catch (error) { next(error); }
});

// Get reviews for a driver
router.get('/driver/:driverId', async (req: AuthRequest, res, next) => {
    try {
        const buses = await prisma.bus.findMany({ where: { driverId: req.params.driverId } });
        const schedules = await prisma.schedule.findMany({ where: { busId: { in: buses.map(b => b.id) } } });
        const reviews = await prisma.review.findMany({
            where: { scheduleId: { in: schedules.map(s => s.id) } },
            include: { user: { select: { name: true } }, schedule: { include: { route: true } } },
            orderBy: { createdAt: 'desc' }
        });

        const avg = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
        res.json({ success: true, reviews, averageRating: Math.round(avg * 10) / 10, totalReviews: reviews.length });
    } catch (error) { next(error); }
});

// Submit a review (after completing a trip)
router.post('/', async (req: AuthRequest, res, next) => {
    try {
        const { bookingId, rating, comment } = req.body;

        // Validate rating
        if (rating < 1 || rating > 5) throw new AppError('Rating must be between 1 and 5', 400);

        // Get booking
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: { schedule: { include: { bus: { include: { driver: true } } } } }
        });

        if (!booking) throw new AppError('Booking not found', 404);
        if (booking.userId !== req.user!.id) throw new AppError('Not authorized', 403);
        if (booking.status !== 'COMPLETED' && booking.status !== 'CONFIRMED') throw new AppError('Cannot review uncompleted booking', 400);

        // Check if already reviewed
        const existing = await prisma.review.findUnique({ where: { bookingId } });
        if (existing) throw new AppError('Already reviewed', 400);

        // Create review
        const review = await prisma.review.create({
            data: { userId: req.user!.id, bookingId, scheduleId: booking.scheduleId, rating, comment }
        });

        // Update bus and driver ratings
        const busReviews = await prisma.review.findMany({
            where: { schedule: { busId: booking.schedule.busId } }
        });
        const busAvg = busReviews.reduce((sum, r) => sum + r.rating, 0) / busReviews.length;
        await prisma.bus.update({
            where: { id: booking.schedule.busId },
            data: { rating: busAvg, totalReviews: busReviews.length }
        });

        const driverId = booking.schedule.bus.driverId;
        const driverBuses = await prisma.bus.findMany({ where: { driverId } });
        const driverSchedules = await prisma.schedule.findMany({ where: { busId: { in: driverBuses.map(b => b.id) } } });
        const driverReviews = await prisma.review.findMany({ where: { scheduleId: { in: driverSchedules.map(s => s.id) } } });
        const driverAvg = driverReviews.reduce((sum, r) => sum + r.rating, 0) / driverReviews.length;
        await prisma.driver.update({
            where: { id: driverId },
            data: { rating: driverAvg, totalReviews: driverReviews.length }
        });

        // Notify driver about new review
        await createNotification(
            booking.schedule.bus.driver.userId,
            'REVIEW_REQUEST',
            'New Review',
            `You received a ${rating}-star review: "${comment || 'No comment'}"`
        );

        res.json({ success: true, review });
    } catch (error) { next(error); }
});

// Get user's pending reviews (completed trips without reviews)
router.get('/pending', async (req: AuthRequest, res, next) => {
    try {
        const bookings = await prisma.booking.findMany({
            where: {
                userId: req.user!.id,
                status: { in: ['CONFIRMED', 'COMPLETED'] },
                schedule: { departureTime: { lt: new Date() } },
                review: null
            },
            include: { schedule: { include: { route: true, bus: true } } },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, pendingReviews: bookings });
    } catch (error) { next(error); }
});

export default router;
