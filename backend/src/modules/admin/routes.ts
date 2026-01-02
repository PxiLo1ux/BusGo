import { Router } from 'express';
import { prisma } from '../../index.js';
import { authenticate, requireRole, AuthRequest } from '../../middleware/auth.js';
import { AppError } from '../../middleware/errorHandler.js';
import { generateSeatsForSchedule } from '../../utils/seatGenerator.js';

const router = Router();

router.use(authenticate, requireRole('ADMIN'));

// Dashboard with analytics
router.get('/dashboard', async (req: AuthRequest, res, next) => {
    try {
        const [totalRevenue, driverCount, busCount, pendingDrivers, pendingBuses, userCount, recentBookings] = await Promise.all([
            prisma.booking.aggregate({ where: { status: 'CONFIRMED' }, _sum: { totalAmount: true } }),
            prisma.driver.count({ where: { status: 'APPROVED' } }),
            prisma.bus.count({ where: { approved: true } }),
            prisma.driver.count({ where: { status: 'PENDING' } }),
            prisma.bus.count({ where: { approved: false } }),
            prisma.user.count({ where: { role: 'PASSENGER' } }),
            prisma.booking.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { user: true, schedule: { include: { route: true } } } })
        ]);

        // Get monthly revenue for chart
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const monthlyBookings = await prisma.booking.groupBy({
            by: ['createdAt'],
            where: { createdAt: { gte: sixMonthsAgo }, status: 'CONFIRMED' },
            _sum: { totalAmount: true }
        });

        // Get top drivers with analytics
        const drivers = await prisma.driver.findMany({
            where: { status: 'APPROVED' },
            include: {
                user: { select: { name: true, email: true } },
                buses: true
            },
            take: 10
        });

        // Calculate driver revenue and bookings
        const driverAnalytics = await Promise.all(drivers.map(async (driver) => {
            const revenue = await prisma.booking.aggregate({
                where: { schedule: { bus: { driverId: driver.id } }, status: 'CONFIRMED' },
                _sum: { totalAmount: true }
            });
            const bookingsCount = await prisma.booking.count({
                where: { schedule: { bus: { driverId: driver.id } } }
            });
            return {
                id: driver.id,
                name: driver.user.name,
                email: driver.user.email,
                rating: driver.rating || 0,
                totalReviews: driver.totalReviews || 0,
                busCount: driver.buses.length,
                totalRevenue: revenue._sum.totalAmount || 0,
                totalBookings: bookingsCount
            };
        }));

        // Sort by revenue
        driverAnalytics.sort((a, b) => b.totalRevenue - a.totalRevenue);

        res.json({
            success: true,
            totalRevenue: totalRevenue._sum.totalAmount || 0,
            driverCount, busCount, pendingDrivers, pendingBuses, userCount,
            recentBookings: recentBookings.map(b => ({
                id: b.id, passenger: b.user.name, route: `${b.schedule.route.origin} → ${b.schedule.route.destination}`,
                amount: b.totalAmount, status: b.status, date: b.createdAt
            })),
            topDrivers: driverAnalytics.slice(0, 5)
        });
    } catch (error) { next(error); }
});

// All drivers
router.get('/drivers', async (req: AuthRequest, res, next) => {
    try {
        const drivers = await prisma.driver.findMany({ include: { user: { select: { name: true, email: true, phone: true } }, buses: true } });
        res.json({ success: true, drivers });
    } catch (error) { next(error); }
});

// Get detailed driver info with analytics
router.get('/drivers/:id', async (req: AuthRequest, res, next) => {
    try {
        const driverId = req.params.id;

        const driver = await prisma.driver.findUnique({
            where: { id: driverId },
            include: {
                user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } },
                buses: { include: { schedules: { take: 5, orderBy: { departureTime: 'desc' } } } }
            }
        });

        if (!driver) {
            return res.status(404).json({ success: false, message: 'Driver not found' });
        }

        // Get all bookings for this driver's buses
        const bookings = await prisma.booking.findMany({
            where: { schedule: { bus: { driverId } } },
            include: {
                user: { select: { name: true, email: true } },
                schedule: { include: { route: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        // Get ratings
        const ratings = await prisma.driverRating.findMany({
            where: { driverId },
            include: {
                user: { select: { name: true } },
                booking: { include: { schedule: { include: { route: true } } } }
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        // Analytics
        const totalBookings = await prisma.booking.count({ where: { schedule: { bus: { driverId } } } });
        const totalRevenue = await prisma.booking.aggregate({
            where: { schedule: { bus: { driverId } }, status: 'CONFIRMED' },
            _sum: { totalAmount: true }
        });
        const totalTrips = await prisma.schedule.count({
            where: { bus: { driverId }, status: 'COMPLETED' }
        });

        res.json({
            success: true,
            driver: {
                id: driver.id,
                name: driver.user.name,
                email: driver.user.email,
                phone: driver.phone || driver.user.phone,
                licenseNumber: driver.licenseNumber,
                status: driver.status,
                rating: driver.rating,
                totalReviews: driver.totalReviews,
                createdAt: driver.createdAt,
                userCreatedAt: driver.user.createdAt
            },
            buses: driver.buses.map(b => ({
                id: b.id,
                name: b.name,
                plateNumber: b.plateNumber,
                type: b.type,
                capacity: b.capacity,
                approved: b.approved,
                rating: b.rating,
                amenities: b.amenities,
                schedulesCount: b.schedules.length
            })),
            recentBookings: bookings.map(b => ({
                id: b.id,
                passengerName: b.user.name,
                passengerEmail: b.user.email,
                route: `${b.schedule.route.origin} → ${b.schedule.route.destination}`,
                date: b.schedule.departureTime,
                amount: b.totalAmount,
                status: b.status,
                seats: b.seats
            })),
            ratings: ratings.map(r => ({
                id: r.id,
                userName: r.user.name,
                rating: r.rating,
                comment: r.comment,
                route: r.booking?.schedule?.route ? `${r.booking.schedule.route.origin} → ${r.booking.schedule.route.destination}` : '',
                createdAt: r.createdAt
            })),
            analytics: {
                totalBookings,
                totalRevenue: totalRevenue._sum.totalAmount || 0,
                totalTrips,
                avgRating: driver.rating,
                busCount: driver.buses.length,
                approvedBuses: driver.buses.filter(b => b.approved).length
            }
        });
    } catch (error) { next(error); }
});

// Verify driver
router.put('/drivers/:id/verify', async (req: AuthRequest, res, next) => {
    try {
        const { status } = req.body;
        const driver = await prisma.driver.update({ where: { id: req.params.id }, data: { status: status.toUpperCase() } });

        // Send notification to driver
        await prisma.notification.create({
            data: {
                userId: driver.userId,
                type: status === 'APPROVED' ? 'BOOKING_CONFIRMATION' : 'BOOKING_CANCELLED',
                title: status === 'APPROVED' ? 'Account Approved!' : 'Account Status Update',
                message: status === 'APPROVED' ? 'Your driver account has been approved. You can now add buses and create schedules.' : 'Your driver application has been reviewed.'
            }
        });

        res.json({ success: true, driver });
    } catch (error) { next(error); }
});

// Get driver analytics (for admin to view same data as driver)
router.get('/drivers/:id/analytics', async (req: AuthRequest, res, next) => {
    try {
        const driverId = req.params.id;

        const driver = await prisma.driver.findUnique({
            where: { id: driverId },
            include: { user: { select: { name: true } } }
        });
        if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

        const buses = await prisma.bus.findMany({
            where: { driverId },
            include: {
                schedules: {
                    include: {
                        bookings: { include: { user: true } },
                        route: true
                    }
                }
            }
        });

        // Bus earnings breakdown
        const busEarnings = buses.map(bus => {
            const totalEarnings = bus.schedules.reduce((sum, s) =>
                sum + s.bookings.filter(b => b.status === 'CONFIRMED').reduce((bs, b) => bs + b.totalAmount, 0), 0);
            const totalBookings = bus.schedules.reduce((sum, s) => sum + s.bookings.length, 0);
            const completedTrips = bus.schedules.filter(s => s.status === 'COMPLETED').length;
            return {
                id: bus.id, name: bus.name, plateNumber: bus.plateNumber, type: bus.type, capacity: bus.capacity,
                totalEarnings, totalBookings, completedTrips, approved: bus.approved, rating: bus.rating || 0
            };
        });

        // Route popularity
        const routeMap: Record<string, { routeId: string; origin: string; destination: string; bookings: number; revenue: number; trips: number }> = {};
        buses.forEach(bus => {
            bus.schedules.forEach(schedule => {
                const key = schedule.routeId;
                if (!routeMap[key]) {
                    routeMap[key] = { routeId: key, origin: schedule.route.origin, destination: schedule.route.destination, bookings: 0, revenue: 0, trips: 0 };
                }
                routeMap[key].bookings += schedule.bookings.length;
                routeMap[key].revenue += schedule.bookings.filter(b => b.status === 'CONFIRMED').reduce((sum, b) => sum + b.totalAmount, 0);
                routeMap[key].trips += 1;
            });
        });
        const popularRoutes = Object.values(routeMap).sort((a, b) => b.revenue - a.revenue);

        // Top Passengers
        const passengerMap: Record<string, { userId: string; name: string; email: string; totalBookings: number; totalSpent: number; lastBooking: Date | null }> = {};
        buses.forEach(bus => {
            bus.schedules.forEach(schedule => {
                schedule.bookings.forEach(booking => {
                    const key = booking.userId;
                    if (!passengerMap[key]) {
                        passengerMap[key] = { userId: key, name: booking.user.name, email: booking.user.email, totalBookings: 0, totalSpent: 0, lastBooking: null };
                    }
                    passengerMap[key].totalBookings += 1;
                    if (booking.status === 'CONFIRMED') passengerMap[key].totalSpent += booking.totalAmount;
                    if (!passengerMap[key].lastBooking || new Date(booking.createdAt) > passengerMap[key].lastBooking!) {
                        passengerMap[key].lastBooking = new Date(booking.createdAt);
                    }
                });
            });
        });

        const topPassengerIds = Object.keys(passengerMap);
        const passengerRatings = await prisma.driverRating.findMany({
            where: { driverId, userId: { in: topPassengerIds } },
            orderBy: { createdAt: 'desc' }
        });

        const topPassengers = Object.values(passengerMap)
            .map(p => {
                const ratings = passengerRatings.filter(r => r.userId === p.userId);
                const avgRating = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : 0;
                const latestReview = ratings.find(r => r.comment);
                return { ...p, averageRating: avgRating, reviewCount: ratings.length, latestReview: latestReview ? { rating: latestReview.rating, comment: latestReview.comment, date: latestReview.createdAt } : null };
            })
            .sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10);

        // Monthly earnings
        const monthlyEarnings: { month: string; earnings: number; bookings: number }[] = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            let earnings = 0, bookings = 0;
            buses.forEach(bus => bus.schedules.forEach(schedule => schedule.bookings.forEach(booking => {
                const bookingDate = new Date(booking.createdAt);
                if (bookingDate >= monthStart && bookingDate <= monthEnd && booking.status === 'CONFIRMED') {
                    earnings += booking.totalAmount;
                    bookings += 1;
                }
            })));
            monthlyEarnings.push({ month: monthStart.toLocaleDateString('en-US', { month: 'short' }), earnings, bookings });
        }

        const totalEarnings = busEarnings.reduce((sum, b) => sum + b.totalEarnings, 0);
        const totalBookings = busEarnings.reduce((sum, b) => sum + b.totalBookings, 0);
        const totalTrips = busEarnings.reduce((sum, b) => sum + b.completedTrips, 0);

        res.json({
            success: true,
            driverName: driver.user.name,
            summary: { totalEarnings, totalBookings, totalTrips, busCount: buses.length, routeCount: popularRoutes.length, passengerCount: Object.keys(passengerMap).length, driverRating: driver.rating || 0, totalReviews: driver.totalReviews || 0 },
            busEarnings: busEarnings.sort((a, b) => b.totalEarnings - a.totalEarnings),
            popularRoutes, topPassengers, monthlyEarnings
        });
    } catch (error) { next(error); }
});
// Pending buses
router.get('/buses/pending', async (req: AuthRequest, res, next) => {
    try {
        const buses = await prisma.bus.findMany({ where: { approved: false }, include: { driver: { include: { user: true } } } });
        res.json({ success: true, buses });
    } catch (error) { next(error); }
});

// All buses
router.get('/buses', async (req: AuthRequest, res, next) => {
    try {
        const buses = await prisma.bus.findMany({
            include: {
                driver: { include: { user: true } },
                schedules: {
                    include: { route: true },
                    orderBy: { departureTime: 'desc' },
                    take: 20
                }
            }
        });
        res.json({ success: true, buses });
    } catch (error) { next(error); }
});

// Approve bus
router.put('/buses/:id/approve', async (req: AuthRequest, res, next) => {
    try {
        const { approved } = req.body;
        const bus = await prisma.bus.update({ where: { id: req.params.id }, data: { approved }, include: { driver: true } });

        // Notify driver
        await prisma.notification.create({
            data: {
                userId: bus.driver.userId,
                type: approved ? 'BOOKING_CONFIRMATION' : 'BOOKING_CANCELLED',
                title: approved ? 'Bus Approved!' : 'Bus Review Update',
                message: approved ? `Your bus "${bus.name}" has been approved and is now available for scheduling.` : `Your bus "${bus.name}" needs attention.`
            }
        });

        res.json({ success: true, bus });
    } catch (error) { next(error); }
});

// Get bus seat layout preview (for admin viewing)
router.get('/buses/:id/seat-layout', async (req: AuthRequest, res, next) => {
    try {
        const bus = await prisma.bus.findUnique({ where: { id: req.params.id } });
        if (!bus) throw new AppError('Bus not found', 404);

        const seatLayout = generateSeatsForSchedule('preview', bus.capacity, bus.hasToilet);
        const regularSeats = seatLayout.filter(s => s.position === 'REGULAR');
        const backSeats = seatLayout.filter(s => s.position === 'BACK');
        const toiletSeat = seatLayout.find(s => s.position === 'TOILET');
        const rows = [...new Set(regularSeats.map(s => s.row))].sort((a, b) => a - b);

        res.json({
            success: true,
            busInfo: { id: bus.id, name: bus.name, capacity: bus.capacity, hasToilet: bus.hasToilet, type: bus.type },
            layout: {
                totalSeats: seatLayout.length - (toiletSeat ? 1 : 0),
                regularSeats: regularSeats.length,
                backSeats: backSeats.length,
                hasToilet: !!toiletSeat,
                rows: rows.length,
                seats: seatLayout.map(s => ({ name: s.name, row: s.row, column: s.column, position: s.position }))
            }
        });
    } catch (error) { next(error); }
});

// Reports with detailed analytics
router.get('/reports', async (req: AuthRequest, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate as string) : new Date();

        const [bookings, routeStats] = await Promise.all([
            prisma.booking.findMany({
                where: { createdAt: { gte: start, lte: end }, status: 'CONFIRMED' },
                include: { schedule: { include: { route: true, bus: true } } }
            }),
            prisma.schedule.groupBy({
                by: ['routeId'],
                _count: { id: true },
                _sum: { price: true }
            })
        ]);

        const totalRevenue = bookings.reduce((sum, b) => sum + b.totalAmount, 0);
        const totalBookings = bookings.length;

        // Group by route
        const routeBreakdown: Record<string, { bookings: number, revenue: number }> = {};
        bookings.forEach(b => {
            const key = `${b.schedule.route.origin} → ${b.schedule.route.destination}`;
            if (!routeBreakdown[key]) routeBreakdown[key] = { bookings: 0, revenue: 0 };
            routeBreakdown[key].bookings++;
            routeBreakdown[key].revenue += b.totalAmount;
        });

        res.json({
            success: true,
            totalRevenue, totalBookings, period: { start, end },
            routeBreakdown: Object.entries(routeBreakdown).map(([route, data]) => ({ route, ...data }))
        });
    } catch (error) { next(error); }
});

// Pricing rules management
router.get('/pricing-rules', async (req: AuthRequest, res, next) => {
    try {
        const rules = await prisma.pricingRule.findMany({
            include: { route: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, rules });
    } catch (error) { next(error); }
});

router.post('/pricing-rules', async (req: AuthRequest, res, next) => {
    try {
        const { routeId, name, type, multiplier, startDate, endDate, minDaysBefore, minHoursBefore, active } = req.body;
        const rule = await prisma.pricingRule.create({
            data: {
                routeId: routeId || null,
                name,
                type,
                multiplier: parseFloat(multiplier),
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                minDaysBefore: minDaysBefore ? parseInt(minDaysBefore) : null,
                minHoursBefore: minHoursBefore ? parseInt(minHoursBefore) : null,
                active: active !== undefined ? active : true
            }
        });
        res.json({ success: true, rule });
    } catch (error) { next(error); }
});

router.put('/pricing-rules/:id', async (req: AuthRequest, res, next) => {
    try {
        const { name, type, multiplier, startDate, endDate, minDaysBefore, minHoursBefore, active, routeId } = req.body;
        const rule = await prisma.pricingRule.update({
            where: { id: req.params.id },
            data: {
                name,
                type,
                multiplier: multiplier !== undefined ? parseFloat(multiplier) : undefined,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                minDaysBefore: minDaysBefore !== undefined ? (minDaysBefore ? parseInt(minDaysBefore) : null) : undefined,
                minHoursBefore: minHoursBefore !== undefined ? (minHoursBefore ? parseInt(minHoursBefore) : null) : undefined,
                active: active !== undefined ? active : undefined,
                routeId: routeId !== undefined ? (routeId || null) : undefined
            }
        });
        res.json({ success: true, rule });
    } catch (error) { next(error); }
});

router.delete('/pricing-rules/:id', async (req: AuthRequest, res, next) => {
    try {
        await prisma.pricingRule.delete({ where: { id: req.params.id } });
        res.json({ success: true, message: 'Pricing rule deleted' });
    } catch (error) { next(error); }
});

// Toggle pricing rule active status
router.put('/pricing-rules/:id/toggle', async (req: AuthRequest, res, next) => {
    try {
        const rule = await prisma.pricingRule.findUnique({ where: { id: req.params.id } });
        if (!rule) {
            return res.status(404).json({ success: false, message: 'Rule not found' });
        }
        const updated = await prisma.pricingRule.update({
            where: { id: req.params.id },
            data: { active: !rule.active }
        });
        res.json({ success: true, rule: updated });
    } catch (error) { next(error); }
});

// ========== LOYALTY OFFERS CRUD ==========

// Get all loyalty offers (including inactive)
router.get('/loyalty-offers', async (req: AuthRequest, res, next) => {
    try {
        const offers = await prisma.loyaltyOffer.findMany({
            orderBy: { createdAt: 'desc' }
        });

        // Get claim stats per offer
        const claimCounts = await prisma.loyaltyTransaction.groupBy({
            by: ['description'],
            where: { type: 'REDEEMED' },
            _count: true
        });

        const offersWithStats = offers.map(offer => ({
            ...offer,
            claimCount: claimCounts.find(c => c.description?.includes(offer.name))?._count || 0
        }));

        res.json({ success: true, offers: offersWithStats });
    } catch (error) { next(error); }
});

// Create loyalty offer
router.post('/loyalty-offers', async (req: AuthRequest, res, next) => {
    try {
        const { name, description, pointsCost, discountPercent, category, validUntil, isActive,
            maxClaims, minBookings, minSpent, routeRestrictions, dayRestrictions } = req.body;

        if (!name || !description || !pointsCost || !validUntil) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const offer = await prisma.loyaltyOffer.create({
            data: {
                name,
                description,
                pointsCost: parseInt(pointsCost),
                discountPercent: parseInt(discountPercent) || 0,
                category: category || 'discount',
                validUntil: new Date(validUntil),
                isActive: isActive !== false
            }
        });

        res.json({ success: true, offer });
    } catch (error) { next(error); }
});

// Update loyalty offer
router.put('/loyalty-offers/:id', async (req: AuthRequest, res, next) => {
    try {
        const { name, description, pointsCost, discountPercent, category, validUntil, isActive } = req.body;

        const offer = await prisma.loyaltyOffer.update({
            where: { id: req.params.id },
            data: {
                name,
                description,
                pointsCost: parseInt(pointsCost),
                discountPercent: parseInt(discountPercent) || 0,
                category,
                validUntil: new Date(validUntil),
                isActive
            }
        });

        res.json({ success: true, offer });
    } catch (error) { next(error); }
});

// Toggle offer active status
router.put('/loyalty-offers/:id/toggle', async (req: AuthRequest, res, next) => {
    try {
        const offer = await prisma.loyaltyOffer.findUnique({ where: { id: req.params.id } });
        if (!offer) {
            return res.status(404).json({ success: false, message: 'Offer not found' });
        }

        const updated = await prisma.loyaltyOffer.update({
            where: { id: req.params.id },
            data: { isActive: !offer.isActive }
        });

        res.json({ success: true, offer: updated });
    } catch (error) { next(error); }
});

// Delete loyalty offer
router.delete('/loyalty-offers/:id', async (req: AuthRequest, res, next) => {
    try {
        await prisma.loyaltyOffer.delete({ where: { id: req.params.id } });
        res.json({ success: true, message: 'Offer deleted' });
    } catch (error) { next(error); }
});

// Get loyalty stats for dashboard
router.get('/loyalty-stats', async (req: AuthRequest, res, next) => {
    try {
        const [totalOffers, activeOffers, totalClaims, topClaimedOffers] = await Promise.all([
            prisma.loyaltyOffer.count(),
            prisma.loyaltyOffer.count({ where: { isActive: true } }),
            prisma.loyaltyTransaction.count({ where: { type: 'REDEEMED' } }),
            prisma.loyaltyTransaction.groupBy({
                by: ['description'],
                where: { type: 'REDEEMED' },
                _count: true,
                orderBy: { _count: { description: 'desc' } },
                take: 5
            })
        ]);

        res.json({
            success: true,
            stats: { totalOffers, activeOffers, totalClaims },
            topClaimed: topClaimedOffers
        });
    } catch (error) { next(error); }
});

// Get all claims with user details
router.get('/loyalty-claims', async (req: AuthRequest, res, next) => {
    try {
        const claims = await prisma.loyaltyTransaction.findMany({
            where: { type: 'REDEEMED' },
            orderBy: { createdAt: 'desc' },
            include: {
                loyalty: {
                    include: {
                        user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } }
                    }
                }
            }
        });

        const claimsWithUsers = claims.map(c => ({
            id: c.id,
            offerName: c.description?.replace('Claimed: ', '') || 'Unknown',
            points: Math.abs(c.points),
            claimedAt: c.createdAt,
            user: c.loyalty?.user ? {
                id: c.loyalty.user.id,
                name: c.loyalty.user.name,
                email: c.loyalty.user.email,
                phone: c.loyalty.user.phone,
                joinedAt: c.loyalty.user.createdAt
            } : null
        }));

        res.json({ success: true, claims: claimsWithUsers });
    } catch (error) { next(error); }
});

// Get full user profile for admin (for claims modal view)
router.get('/users/:id/profile', async (req: AuthRequest, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.id },
            select: {
                id: true, name: true, email: true, phone: true, role: true, createdAt: true
            }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Get loyalty data
        const loyalty = await prisma.loyaltyPoints.findUnique({ where: { userId: user.id } });

        // Get booking stats
        const bookingStats = await prisma.booking.aggregate({
            where: { userId: user.id },
            _count: true,
            _sum: { totalAmount: true }
        });

        // Get referral stats
        const referralStats = await prisma.referral.aggregate({
            where: { referrerId: user.id, status: 'COMPLETED' },
            _count: true
        });

        // Get referral points earned
        const referralPoints = await prisma.loyaltyTransaction.aggregate({
            where: {
                loyalty: { userId: user.id },
                description: { contains: 'Referral' }
            },
            _sum: { points: true }
        });

        // Get recent bookings
        const recentBookings = await prisma.booking.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
                schedule: {
                    include: { route: true }
                }
            }
        });

        // Get redeemed offers
        const redeemedOffers = loyalty ? await prisma.loyaltyTransaction.findMany({
            where: { loyaltyId: loyalty.id, type: 'REDEEMED' },
            orderBy: { createdAt: 'desc' },
            take: 10
        }) : [];

        res.json({
            success: true,
            profile: {
                ...user,
                loyalty: loyalty ? {
                    points: loyalty.points,
                    tier: loyalty.tier,
                    totalEarned: loyalty.totalEarned
                } : { points: 0, tier: 'BRONZE', totalEarned: 0 },
                stats: {
                    totalBookings: bookingStats._count || 0,
                    totalSpent: bookingStats._sum.totalAmount || 0,
                    friendsReferred: referralStats._count || 0,
                    referralPointsEarned: referralPoints._sum.points || 0
                },
                recentBookings: recentBookings.map(b => ({
                    id: b.id,
                    route: b.schedule?.route ? `${b.schedule.route.origin} → ${b.schedule.route.destination}` : 'N/A',
                    date: b.schedule?.departureTime,
                    amount: b.totalAmount,
                    status: b.status
                })),
                redeemedOffers: redeemedOffers.map(r => ({
                    id: r.id,
                    name: r.description?.replace('Claimed: ', '') || 'Unknown',
                    points: Math.abs(r.points),
                    date: r.createdAt
                }))
            }
        });
    } catch (error) { next(error); }
});

export default router;
