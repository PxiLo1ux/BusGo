import { Router } from 'express';
import { prisma } from '../../index.js';
import { authenticate, AuthRequest } from '../../middleware/auth.js';

const router = Router();

// Submit driver rating
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { bookingId, rating, comment } = req.body;
        const userId = req.user!.id;

        if (!bookingId || !rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: 'Valid booking ID and rating (1-5) are required' });
        }

        // Get booking with schedule and bus info
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                schedule: { include: { bus: { include: { driver: true } } } },
                driverRating: true
            }
        });

        if (!booking || booking.userId !== userId) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        if (booking.driverRating) {
            return res.status(400).json({ success: false, message: 'You have already rated this driver for this booking' });
        }

        // Check if trip is completed (departure time has passed)
        if (new Date(booking.schedule.departureTime) > new Date()) {
            return res.status(400).json({ success: false, message: 'You can only rate after the trip is completed' });
        }

        const driverId = booking.schedule.bus.driver.id;

        // Create driver rating
        const driverRating = await prisma.driverRating.create({
            data: {
                driverId,
                userId,
                bookingId,
                rating: parseInt(rating),
                comment: comment || null
            }
        });

        // Update driver's average rating
        const allRatings = await prisma.driverRating.findMany({
            where: { driverId },
            select: { rating: true }
        });

        const avgRating = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;

        await prisma.driver.update({
            where: { id: driverId },
            data: {
                rating: Math.round(avgRating * 10) / 10,
                totalReviews: allRatings.length
            }
        });

        res.json({ success: true, driverRating, message: 'Thank you for your feedback!' });
    } catch (error) { next(error); }
});

// Get driver ratings
router.get('/driver/:driverId', async (req, res, next) => {
    try {
        const { driverId } = req.params;
        const { limit = 10 } = req.query;

        const driver = await prisma.driver.findUnique({
            where: { id: driverId },
            include: { user: { select: { name: true } } }
        });

        if (!driver) {
            return res.status(404).json({ success: false, message: 'Driver not found' });
        }

        const ratings = await prisma.driverRating.findMany({
            where: { driverId },
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit as string),
            include: {
                user: { select: { name: true } },
                booking: {
                    select: {
                        schedule: {
                            select: { route: { select: { origin: true, destination: true } } }
                        }
                    }
                }
            }
        });

        // Calculate rating distribution
        const distribution = [0, 0, 0, 0, 0];
        const allRatings = await prisma.driverRating.findMany({
            where: { driverId },
            select: { rating: true }
        });
        allRatings.forEach(r => distribution[r.rating - 1]++);

        res.json({
            success: true,
            driver: {
                id: driver.id,
                name: driver.user.name,
                rating: driver.rating,
                totalReviews: driver.totalReviews
            },
            ratings: ratings.map(r => ({
                id: r.id,
                rating: r.rating,
                comment: r.comment,
                user: { name: r.user.name },
                userName: r.user.name,
                route: r.booking.schedule.route,
                createdAt: r.createdAt
            })),
            averageRating: driver.rating || 0,
            totalRatings: driver.totalReviews || 0,
            distribution
        });
    } catch (error) { next(error); }
});

// Check if user can rate a booking
router.get('/can-rate/:bookingId', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { bookingId } = req.params;
        const userId = req.user!.id;

        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                schedule: true,
                driverRating: true
            }
        });

        if (!booking || booking.userId !== userId) {
            return res.json({ success: true, canRate: false, reason: 'Booking not found' });
        }

        if (booking.driverRating) {
            return res.json({ success: true, canRate: false, reason: 'Already rated' });
        }

        if (new Date(booking.schedule.departureTime) > new Date()) {
            return res.json({ success: true, canRate: false, reason: 'Trip not completed' });
        }

        res.json({ success: true, canRate: true });
    } catch (error) { next(error); }
});

export default router;
