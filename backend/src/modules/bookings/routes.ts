import { Router } from 'express';
import { prisma } from '../../index.js';
import { authenticate, AuthRequest } from '../../middleware/auth.js';
import { AppError } from '../../middleware/errorHandler.js';
import { awardPoints, redeemPoints } from '../loyalty/routes.js';
import { createNotification } from '../notifications/routes.js';

const router = Router();

// Create booking
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { scheduleId, seats, passengerName, passengerEmail, passengerPhone, paymentMethod, loyaltyPointsToUse, rewardId } = req.body;

        const schedule = await prisma.schedule.findUnique({
            where: { id: scheduleId },
            include: { route: true, bus: { include: { driver: { include: { user: true } } } } }
        });
        if (!schedule) throw new AppError('Schedule not found', 404);

        // Check seat availability
        const bookedSeats = await prisma.seat.findMany({
            where: { scheduleId, name: { in: seats }, isBooked: true }
        });
        if (bookedSeats.length > 0) throw new AppError('Some seats are already booked', 400);

        // Calculate price with dynamic pricing
        let price = schedule.dynamicPrice || schedule.price;
        let baseTotal = price * seats.length;
        let totalAmount = baseTotal;
        let discountAmount = 0;
        let loyaltyUsed = 0;

        // 1. Apply tier discount (from loyalty tier)
        const loyaltyData = await prisma.loyaltyPoints.findUnique({ where: { userId: req.user!.id } });
        let tierDiscount = 0;
        if (loyaltyData) {
            const tierDiscounts: { [key: string]: number } = { BRONZE: 0, SILVER: 5, GOLD: 10 };
            tierDiscount = tierDiscounts[loyaltyData.tier] || 0;
            if (tierDiscount > 0) {
                const tierDiscountAmount = Math.round(totalAmount * (tierDiscount / 100));
                discountAmount += tierDiscountAmount;
                totalAmount -= tierDiscountAmount;
            }
        }

        // 2. Apply reward discount (from redeemed offers)
        let rewardDiscount = 0;
        if (rewardId) {
            // Find the claim transaction
            const claimTransaction = await prisma.loyaltyTransaction.findUnique({ where: { id: rewardId } });
            if (claimTransaction) {
                const offerName = claimTransaction.description?.replace('Claimed: ', '');
                const offer = await prisma.loyaltyOffer.findFirst({ where: { name: offerName } });
                if (offer && offer.discountPercent > 0) {
                    rewardDiscount = offer.discountPercent;
                    const rewardDiscountAmount = Math.round(totalAmount * (rewardDiscount / 100));
                    discountAmount += rewardDiscountAmount;
                    totalAmount -= rewardDiscountAmount;
                }
            }
        }

        // 3. Apply loyalty points discount
        if (loyaltyPointsToUse && loyaltyPointsToUse > 0) {
            try {
                const pointsDiscountAmount = await redeemPoints(req.user!.id, loyaltyPointsToUse, `Booking ${scheduleId}`);
                loyaltyUsed = loyaltyPointsToUse;
                discountAmount += pointsDiscountAmount;
                totalAmount -= pointsDiscountAmount;
            } catch (e) {
                // Ignore if points can't be redeemed
            }
        }

        // Ensure minimum total of 0
        totalAmount = Math.max(0, Math.round(totalAmount));

        const booking = await prisma.booking.create({
            data: {
                userId: req.user!.id,
                scheduleId,
                seats,
                totalAmount,
                discountAmount,
                loyaltyUsed,
                paymentMethod: paymentMethod || 'ONLINE',
                passengerName: passengerName || '',
                passengerEmail: passengerEmail || req.user!.email,
                passengerPhone,
                status: paymentMethod === 'CASH' ? 'CONFIRMED' : 'PENDING'
            }
        });

        // Mark seats as booked
        await prisma.seat.updateMany({
            where: { scheduleId, name: { in: seats } },
            data: { isBooked: true }
        });

        // Update available seats
        await prisma.schedule.update({
            where: { id: scheduleId },
            data: { availableSeats: { decrement: seats.length } }
        });

        // Award loyalty points for confirmed (cash) bookings
        if (paymentMethod === 'CASH') {
            await awardPoints(req.user!.id, totalAmount, `Booking on ${schedule.route.origin} to ${schedule.route.destination}`);
        }

        // Send notification to passenger
        await createNotification(
            req.user!.id,
            'BOOKING_CONFIRMATION',
            'Booking Confirmed!',
            `Your booking from ${schedule.route.origin} to ${schedule.route.destination} on ${new Date(schedule.departureTime).toLocaleDateString()} is confirmed. Total: Rs. ${totalAmount}${discountAmount > 0 ? ` (Saved Rs. ${discountAmount})` : ''}`
        );

        // Notify driver about new booking
        await createNotification(
            schedule.bus.driver.userId,
            'DRIVER_NEW_BOOKING',
            'New Booking',
            `New booking received for ${schedule.route.origin} → ${schedule.route.destination}. Seats: ${seats.join(', ')}`
        );

        res.json({
            success: true,
            booking: {
                ...booking,
                baseTotal,
                tierDiscount,
                rewardDiscount,
                savedAmount: discountAmount
            },
            driverPhone: schedule.bus.driver.phone
        });
    } catch (error) { next(error); }
});

// Get user's bookings
router.get('/my', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const bookings = await prisma.booking.findMany({
            where: { userId: req.user!.id },
            include: {
                schedule: { include: { bus: { include: { driver: { include: { user: true, driverRatings: true } } } }, route: true } },
                review: true,
                driverRating: true
            },
            orderBy: { createdAt: 'desc' }
        });

        const formatted = bookings.map(b => ({
            id: b.id,
            scheduleId: b.scheduleId,
            busName: b.schedule.bus.name,
            plateNumber: b.schedule.bus.plateNumber,
            operator: b.schedule.bus.driver.user.name,
            origin: b.schedule.route.origin,
            destination: b.schedule.route.destination,
            departureTime: b.schedule.departureTime,
            arrivalTime: b.schedule.arrivalTime,
            date: b.schedule.departureTime,
            seats: b.seats,
            totalAmount: b.totalAmount,
            status: b.status,
            paymentMethod: b.paymentMethod,
            // Driver info
            driverId: b.schedule.bus.driver.id,
            driverPhone: b.schedule.bus.driver.phone,
            driverEmail: b.schedule.bus.driver.user.email,
            driverRating: b.schedule.bus.driver.rating,
            driverTotalReviews: b.schedule.bus.driver.totalReviews,
            // Review status
            hasReview: !!b.review,
            hasDriverRating: !!b.driverRating
        }));

        res.json({ success: true, bookings: formatted });
    } catch (error) { next(error); }
});

// Get single booking with full details
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const booking = await prisma.booking.findUnique({
            where: { id: req.params.id },
            include: {
                schedule: {
                    include: {
                        bus: { include: { driver: { include: { user: true } } } },
                        route: true
                    }
                },
                payment: true,
                review: true,
                driverRating: true
            }
        });
        if (!booking) throw new AppError('Booking not found', 404);

        // Format comprehensive response
        const bus = booking.schedule.bus;
        const driver = bus.driver;
        const route = booking.schedule.route;

        res.json({
            success: true,
            booking: {
                id: booking.id,
                status: booking.status,
                seats: booking.seats,
                totalAmount: booking.totalAmount,
                discountAmount: booking.discountAmount,
                loyaltyUsed: booking.loyaltyUsed,
                passengerName: booking.passengerName,
                passengerEmail: booking.passengerEmail,
                passengerPhone: booking.passengerPhone,
                paymentMethod: booking.paymentMethod,
                createdAt: booking.createdAt,
                // Schedule info
                schedule: {
                    departureTime: booking.schedule.departureTime,
                    arrivalTime: booking.schedule.arrivalTime,
                    price: booking.schedule.price,
                    // Route details
                    route: {
                        origin: route.origin,
                        destination: route.destination,
                        distance: route.distance,
                        estimatedTime: route.estimatedTime
                    },
                    // Bus details
                    bus: {
                        id: bus.id,
                        name: bus.name,
                        plateNumber: bus.plateNumber,
                        type: bus.type,
                        capacity: bus.capacity,
                        amenities: bus.amenities,
                        rating: bus.rating,
                        totalReviews: bus.totalReviews,
                        hasToilet: bus.hasToilet,
                        photos: bus.photos || [],
                        // Driver details
                        driver: {
                            id: driver.id,
                            name: driver.user.name,
                            phone: driver.phone,
                            email: driver.user.email,
                            rating: driver.rating,
                            totalReviews: driver.totalReviews,
                            verified: bus.documentsVerified || false,
                            employedDriverName: bus.employedDriverName,
                            employedDriverPhone: bus.employedDriverPhone
                        }
                    }
                },
                // Review status
                hasReview: !!booking.review,
                hasDriverRating: !!booking.driverRating
            },
            driverPhone: driver.phone
        });
    } catch (error) { next(error); }
});

// Cancel booking
router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const booking = await prisma.booking.findUnique({
            where: { id: req.params.id },
            include: { schedule: true }
        });
        if (!booking) throw new AppError('Booking not found', 404);
        if (booking.userId !== req.user!.id) throw new AppError('Not authorized', 403);

        // Free up seats
        await prisma.seat.updateMany({
            where: { scheduleId: booking.scheduleId, name: { in: booking.seats } },
            data: { isBooked: false }
        });

        await prisma.schedule.update({
            where: { id: booking.scheduleId },
            data: { availableSeats: { increment: booking.seats.length } }
        });

        await prisma.booking.update({
            where: { id: req.params.id },
            data: { status: 'CANCELLED' }
        });

        // Refund loyalty points if used
        if (booking.loyaltyUsed > 0) {
            await awardPoints(req.user!.id, booking.loyaltyUsed / 10, 'Refund from cancelled booking');
        }

        res.json({ success: true });
    } catch (error) { next(error); }
});

export default router;
