import { Router } from 'express';
import { prisma } from '../../index.js';
import { authenticate, requireRole, AuthRequest } from '../../middleware/auth.js';
import { AppError } from '../../middleware/errorHandler.js';
import { generateSeatsForSchedule } from '../../utils/seatGenerator.js';

const router = Router();

router.use(authenticate, requireRole('DRIVER'));

// Dashboard stats
router.get('/dashboard', async (req: AuthRequest, res, next) => {
    try {
        const driver = await prisma.driver.findUnique({
            where: { userId: req.user!.id },
            include: { user: { select: { name: true, email: true } } }
        });
        if (!driver) throw new AppError('Driver not found', 404);

        const buses = await prisma.bus.findMany({ where: { driverId: driver.id } });
        const busIds = buses.map(b => b.id);
        const schedules = await prisma.schedule.findMany({
            where: { busId: { in: busIds } },
            include: { bookings: true, route: true }
        });

        const totalEarnings = schedules.reduce((sum, s) =>
            sum + s.bookings.reduce((bs, b) => bs + b.totalAmount, 0), 0);
        const totalTrips = schedules.filter(s => s.status === 'COMPLETED').length;
        const totalPassengers = schedules.reduce((sum, s) => sum + s.bookings.length, 0);
        const upcomingTrips = schedules.filter(s => s.status === 'SCHEDULED' && new Date(s.departureTime) > new Date()).length;

        // Recent bookings
        const recentBookings = await prisma.booking.findMany({
            where: { scheduleId: { in: schedules.map(s => s.id) } },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: { schedule: { include: { route: true } }, user: true }
        });

        // Get recent reviews for the driver
        const recentReviews = await prisma.driverRating.findMany({
            where: { driverId: driver.id },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
                user: { select: { name: true } },
                booking: {
                    select: {
                        schedule: { select: { route: { select: { origin: true, destination: true } } } }
                    }
                }
            }
        });

        // Weekly bookings for chart (last 7 days)
        const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weeklyBookings = weekDays.map((day, i) => {
            const dayDate = new Date();
            const diff = (dayDate.getDay() - i + 7) % 7;
            dayDate.setDate(dayDate.getDate() - diff);
            dayDate.setHours(0, 0, 0, 0);
            const nextDay = new Date(dayDate);
            nextDay.setDate(nextDay.getDate() + 1);

            const count = schedules.reduce((sum, s) => sum + s.bookings.filter(b => {
                const created = new Date(b.createdAt);
                return created >= dayDate && created < nextDay;
            }).length, 0);
            return { day, bookings: count };
        });

        res.json({
            success: true,
            totalEarnings, totalTrips, totalPassengers, busCount: buses.length, upcomingTrips,
            weeklyBookings,
            driver: {
                id: driver.id,
                name: driver.user.name,
                email: driver.user.email,
                phone: driver.phone,
                licenseNumber: driver.licenseNumber,
                rating: driver.rating,
                totalReviews: driver.totalReviews,
                status: driver.status
            },
            buses: buses.map(b => ({ id: b.id, name: b.name, plateNumber: b.plateNumber, approved: b.approved })),
            recentReviews: recentReviews.map(r => ({
                id: r.id,
                rating: r.rating,
                comment: r.comment,
                userName: r.user.name,
                route: r.booking?.schedule?.route ? `${r.booking.schedule.route.origin} → ${r.booking.schedule.route.destination}` : 'Trip',
                createdAt: r.createdAt
            })),
            recentBookings: recentBookings.map(b => ({
                id: b.id,
                passengerName: b.passengerName || b.user.name,
                route: `${b.schedule.route.origin} → ${b.schedule.route.destination}`,
                date: b.schedule.departureTime,
                amount: b.totalAmount,
                status: b.status
            }))
        });
    } catch (error) { next(error); }
});

// Analytics endpoint - bus earnings, route popularity, top passengers
router.get('/analytics', async (req: AuthRequest, res, next) => {
    try {
        const driver = await prisma.driver.findUnique({
            where: { userId: req.user!.id },
            include: { user: { select: { name: true } } }
        });
        if (!driver) throw new AppError('Driver not found', 404);

        const buses = await prisma.bus.findMany({
            where: { driverId: driver.id },
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
                id: bus.id,
                name: bus.name,
                plateNumber: bus.plateNumber,
                type: bus.type,
                capacity: bus.capacity,
                totalEarnings,
                totalBookings,
                completedTrips,
                approved: bus.approved,
                rating: bus.rating || 0
            };
        });

        // Route popularity
        const routeMap: Record<string, { routeId: string; origin: string; destination: string; bookings: number; revenue: number; trips: number }> = {};
        buses.forEach(bus => {
            bus.schedules.forEach(schedule => {
                const key = schedule.routeId;
                if (!routeMap[key]) {
                    routeMap[key] = {
                        routeId: key,
                        origin: schedule.route.origin,
                        destination: schedule.route.destination,
                        bookings: 0,
                        revenue: 0,
                        trips: 0
                    };
                }
                routeMap[key].bookings += schedule.bookings.length;
                routeMap[key].revenue += schedule.bookings.filter(b => b.status === 'CONFIRMED').reduce((sum, b) => sum + b.totalAmount, 0);
                routeMap[key].trips += 1;
            });
        });
        const popularRoutes = Object.values(routeMap).sort((a, b) => b.revenue - a.revenue);

        // Top Passengers (most bookings + good reviews)
        const passengerMap: Record<string, { userId: string; name: string; email: string; totalBookings: number; totalSpent: number; lastBooking: Date | null }> = {};
        buses.forEach(bus => {
            bus.schedules.forEach(schedule => {
                schedule.bookings.forEach(booking => {
                    const key = booking.userId;
                    if (!passengerMap[key]) {
                        passengerMap[key] = {
                            userId: key,
                            name: booking.user.name,
                            email: booking.user.email,
                            totalBookings: 0,
                            totalSpent: 0,
                            lastBooking: null
                        };
                    }
                    passengerMap[key].totalBookings += 1;
                    if (booking.status === 'CONFIRMED') {
                        passengerMap[key].totalSpent += booking.totalAmount;
                    }
                    if (!passengerMap[key].lastBooking || new Date(booking.createdAt) > passengerMap[key].lastBooking!) {
                        passengerMap[key].lastBooking = new Date(booking.createdAt);
                    }
                });
            });
        });

        // Get driver ratings from top passengers
        const topPassengerIds = Object.keys(passengerMap);
        const passengerRatings = await prisma.driverRating.findMany({
            where: { driverId: driver.id, userId: { in: topPassengerIds } },
            orderBy: { createdAt: 'desc' }
        });

        const topPassengers = Object.values(passengerMap)
            .map(p => {
                const ratings = passengerRatings.filter(r => r.userId === p.userId);
                const avgRating = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : 0;
                const latestReview = ratings.find(r => r.comment);
                return {
                    ...p,
                    averageRating: avgRating,
                    reviewCount: ratings.length,
                    latestReview: latestReview ? { rating: latestReview.rating, comment: latestReview.comment, date: latestReview.createdAt } : null
                };
            })
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 10);

        // Monthly earnings trend (last 6 months)
        const monthlyEarnings: { month: string; earnings: number; bookings: number }[] = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            let earnings = 0;
            let bookings = 0;
            buses.forEach(bus => {
                bus.schedules.forEach(schedule => {
                    schedule.bookings.forEach(booking => {
                        const bookingDate = new Date(booking.createdAt);
                        if (bookingDate >= monthStart && bookingDate <= monthEnd && booking.status === 'CONFIRMED') {
                            earnings += booking.totalAmount;
                            bookings += 1;
                        }
                    });
                });
            });

            monthlyEarnings.push({
                month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
                earnings,
                bookings
            });
        }

        // Summary stats
        const totalEarnings = busEarnings.reduce((sum, b) => sum + b.totalEarnings, 0);
        const totalBookings = busEarnings.reduce((sum, b) => sum + b.totalBookings, 0);
        const totalTrips = busEarnings.reduce((sum, b) => sum + b.completedTrips, 0);

        res.json({
            success: true,
            summary: {
                totalEarnings,
                totalBookings,
                totalTrips,
                busCount: buses.length,
                routeCount: popularRoutes.length,
                passengerCount: Object.keys(passengerMap).length,
                driverRating: driver.rating || 0,
                totalReviews: driver.totalReviews || 0
            },
            busEarnings: busEarnings.sort((a, b) => b.totalEarnings - a.totalEarnings),
            popularRoutes,
            topPassengers,
            monthlyEarnings
        });
    } catch (error) { next(error); }
});

// Get all bookings for driver's buses
router.get('/bookings', async (req: AuthRequest, res, next) => {
    try {
        const driver = await prisma.driver.findUnique({ where: { userId: req.user!.id } });
        if (!driver) throw new AppError('Driver not found', 404);

        const buses = await prisma.bus.findMany({ where: { driverId: driver.id } });
        const schedules = await prisma.schedule.findMany({ where: { busId: { in: buses.map(b => b.id) } } });

        const bookings = await prisma.booking.findMany({
            where: { scheduleId: { in: schedules.map(s => s.id) } },
            orderBy: { createdAt: 'desc' },
            include: {
                schedule: { include: { route: true } },
                user: true,
                review: true,
                driverRating: true
            }
        });

        res.json({
            success: true,
            bookings: bookings.map(b => ({
                id: b.id,
                passengerName: b.passengerName || b.user.name,
                passengerPhone: b.passengerPhone || b.user.phone || '',
                passengerEmail: b.passengerEmail || b.user.email,
                seats: b.seats,
                totalAmount: b.totalAmount,
                status: b.status,
                createdAt: b.createdAt,
                hasReview: !!b.review,
                hasDriverRating: !!b.driverRating,
                driverRating: b.driverRating ? {
                    rating: b.driverRating.rating,
                    comment: b.driverRating.comment,
                    createdAt: b.driverRating.createdAt
                } : null,
                schedule: {
                    departureTime: b.schedule.departureTime,
                    arrivalTime: b.schedule.arrivalTime,
                    route: { origin: b.schedule.route.origin, destination: b.schedule.route.destination }
                }
            }))
        });
    } catch (error) { next(error); }
});

// Buses CRUD
router.get('/buses', async (req: AuthRequest, res, next) => {
    try {
        const driver = await prisma.driver.findUnique({ where: { userId: req.user!.id } });
        if (!driver) throw new AppError('Driver not found', 404);
        const buses = await prisma.bus.findMany({ where: { driverId: driver.id } });
        res.json({ success: true, buses });
    } catch (error) { next(error); }
});

router.post('/buses', async (req: AuthRequest, res, next) => {
    try {
        const driver = await prisma.driver.findUnique({ where: { userId: req.user!.id } });
        if (!driver) throw new AppError('Driver not found', 404);
        const { name, plateNumber, capacity, type, amenities, hasToilet, employedDriverName, employedDriverPhone, photos, bluebookImage, taxClearance, insuranceDoc } = req.body;
        const bus = await prisma.bus.create({
            data: {
                driverId: driver.id, name, plateNumber,
                capacity: parseInt(capacity), type: type.toUpperCase(),
                amenities: amenities || [], hasToilet: hasToilet || false,
                employedDriverName: employedDriverName || null,
                employedDriverPhone: employedDriverPhone || null,
                photos: photos || [],
                bluebookImage: bluebookImage || null,
                taxClearance: taxClearance || null,
                insuranceDoc: insuranceDoc || null
            }
        });
        res.json({ success: true, bus });
    } catch (error) { next(error); }
});

router.put('/buses/:id', async (req: AuthRequest, res, next) => {
    try {
        const { name, plateNumber, capacity, type, amenities, hasToilet, employedDriverName, employedDriverPhone, photos, bluebookImage, taxClearance, insuranceDoc } = req.body;
        const bus = await prisma.bus.update({
            where: { id: req.params.id },
            data: {
                name, plateNumber, capacity: parseInt(capacity),
                type: type?.toUpperCase(), amenities: amenities || [],
                hasToilet: hasToilet || false,
                employedDriverName: employedDriverName || null,
                employedDriverPhone: employedDriverPhone || null,
                photos: photos || undefined,
                bluebookImage: bluebookImage !== undefined ? bluebookImage : undefined,
                taxClearance: taxClearance !== undefined ? taxClearance : undefined,
                insuranceDoc: insuranceDoc !== undefined ? insuranceDoc : undefined
            }
        });
        res.json({ success: true, bus });
    } catch (error) { next(error); }
});

router.delete('/buses/:id', async (req: AuthRequest, res, next) => {
    try {
        await prisma.bus.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (error) { next(error); }
});

// Get bus seat layout preview (without creating actual seats)
router.get('/buses/:id/seat-layout', async (req: AuthRequest, res, next) => {
    try {
        const bus = await prisma.bus.findUnique({ where: { id: req.params.id } });
        if (!bus) throw new AppError('Bus not found', 404);

        // Generate seat layout preview using the shared utility
        const seatLayout = generateSeatsForSchedule('preview', bus.capacity, bus.hasToilet);

        // Group seats by position
        const regularSeats = seatLayout.filter(s => s.position === 'REGULAR');
        const backSeats = seatLayout.filter(s => s.position === 'BACK');
        const toiletSeat = seatLayout.find(s => s.position === 'TOILET');

        // Get unique rows
        const rows = [...new Set(regularSeats.map(s => s.row))].sort((a, b) => a - b);

        res.json({
            success: true,
            busInfo: {
                id: bus.id,
                name: bus.name,
                capacity: bus.capacity,
                hasToilet: bus.hasToilet,
                type: bus.type
            },
            layout: {
                totalSeats: seatLayout.length - (toiletSeat ? 1 : 0), // Exclude toilet from count
                regularSeats: regularSeats.length,
                backSeats: backSeats.length,
                hasToilet: !!toiletSeat,
                rows: rows.length,
                seatsPerRow: 4,
                seats: seatLayout.map(s => ({
                    name: s.name,
                    row: s.row,
                    column: s.column,
                    position: s.position
                }))
            }
        });
    } catch (error) { next(error); }
});

// Routes
router.get('/routes', async (req: AuthRequest, res, next) => {
    try {
        const routes = await prisma.route.findMany({ orderBy: { origin: 'asc' } });
        res.json({ success: true, routes });
    } catch (error) { next(error); }
});

router.post('/routes', async (req: AuthRequest, res, next) => {
    try {
        const { origin, destination, distance, estimatedTime, baseFare, waypoints, originLat, originLng, destinationLat, destinationLng } = req.body;
        const route = await prisma.route.create({
            data: {
                origin, destination,
                distance: parseFloat(distance),
                estimatedTime: parseInt(estimatedTime),
                baseFare: parseFloat(baseFare),
                waypoints: waypoints || [],
                originLat: originLat ? parseFloat(originLat) : null,
                originLng: originLng ? parseFloat(originLng) : null,
                destinationLat: destinationLat ? parseFloat(destinationLat) : null,
                destinationLng: destinationLng ? parseFloat(destinationLng) : null
            }
        });
        res.json({ success: true, route });
    } catch (error) { next(error); }
});

router.put('/routes/:id', async (req: AuthRequest, res, next) => {
    try {
        const { origin, destination, distance, estimatedTime, baseFare, waypoints, originLat, originLng, destinationLat, destinationLng } = req.body;
        const route = await prisma.route.update({
            where: { id: req.params.id },
            data: {
                origin, destination,
                distance: parseFloat(distance),
                estimatedTime: parseInt(estimatedTime),
                baseFare: parseFloat(baseFare),
                waypoints: waypoints || [],
                originLat: originLat !== undefined ? parseFloat(originLat) : undefined,
                originLng: originLng !== undefined ? parseFloat(originLng) : undefined,
                destinationLat: destinationLat !== undefined ? parseFloat(destinationLat) : undefined,
                destinationLng: destinationLng !== undefined ? parseFloat(destinationLng) : undefined
            }
        });
        res.json({ success: true, route });
    } catch (error) { next(error); }
});

router.delete('/routes/:id', async (req: AuthRequest, res, next) => {
    try {
        await prisma.route.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (error) { next(error); }
});

// Schedules
router.get('/schedules', async (req: AuthRequest, res, next) => {
    try {
        const driver = await prisma.driver.findUnique({ where: { userId: req.user!.id } });
        if (!driver) throw new AppError('Driver not found', 404);
        const buses = await prisma.bus.findMany({ where: { driverId: driver.id } });
        const schedules = await prisma.schedule.findMany({
            where: { busId: { in: buses.map(b => b.id) } },
            include: { bus: true, route: true, _count: { select: { bookings: true } } },
            orderBy: { departureTime: 'desc' }
        });
        res.json({ success: true, schedules });
    } catch (error) { next(error); }
});

router.post('/schedules', async (req: AuthRequest, res, next) => {
    try {
        const { busId, routeId, departureTime, arrivalTime, price, recurring, recurringDays, createReturnTrip, returnDepartureTime } = req.body;
        const bus = await prisma.bus.findUnique({ where: { id: busId } });
        if (!bus) throw new AppError('Bus not found', 404);

        const route = await prisma.route.findUnique({ where: { id: routeId } });
        if (!route) throw new AppError('Route not found', 404);

        // Create main schedule
        const schedule = await prisma.schedule.create({
            data: {
                busId, routeId,
                departureTime: new Date(departureTime),
                arrivalTime: new Date(arrivalTime),
                price: parseFloat(price),
                availableSeats: bus.capacity,
                recurring: recurring || false,
                recurringDays: recurringDays || [],
                isReturnTrip: false
            }
        });

        // Generate seats for main schedule using shared utility
        await prisma.seat.createMany({ data: generateSeatsForSchedule(schedule.id, bus.capacity, bus.hasToilet) });

        let returnSchedule = null;

        // Create return trip if requested
        if (createReturnTrip && returnDepartureTime) {
            // Find or create reverse route
            let reverseRoute = await prisma.route.findFirst({
                where: { origin: route.destination, destination: route.origin }
            });

            if (!reverseRoute) {
                reverseRoute = await prisma.route.create({
                    data: {
                        origin: route.destination,
                        destination: route.origin,
                        distance: route.distance,
                        estimatedTime: route.estimatedTime,
                        baseFare: route.baseFare,
                        waypoints: route.waypoints.reverse(),
                        originLat: route.destinationLat,
                        originLng: route.destinationLng,
                        destinationLat: route.originLat,
                        destinationLng: route.originLng
                    }
                });
            }

            // Calculate return arrival time
            const returnDep = new Date(returnDepartureTime);
            const returnArr = new Date(returnDep.getTime() + route.estimatedTime * 60 * 1000);

            returnSchedule = await prisma.schedule.create({
                data: {
                    busId,
                    routeId: reverseRoute.id,
                    departureTime: returnDep,
                    arrivalTime: returnArr,
                    price: parseFloat(price),
                    availableSeats: bus.capacity,
                    recurring: recurring || false,
                    recurringDays: recurringDays || [],
                    isReturnTrip: true,
                    returnScheduleId: schedule.id
                }
            });

            // Generate seats for return schedule
            await prisma.seat.createMany({ data: generateSeatsForSchedule(returnSchedule.id, bus.capacity, bus.hasToilet) });

            // Link main schedule to return
            await prisma.schedule.update({
                where: { id: schedule.id },
                data: { returnScheduleId: returnSchedule.id }
            });
        }

        const result = await prisma.schedule.findUnique({
            where: { id: schedule.id },
            include: { bus: true, route: true }
        });

        res.json({
            success: true,
            schedule: result,
            returnSchedule: returnSchedule ? await prisma.schedule.findUnique({
                where: { id: returnSchedule.id },
                include: { bus: true, route: true }
            }) : null
        });
    } catch (error) { next(error); }
});

router.put('/schedules/:id', async (req: AuthRequest, res, next) => {
    try {
        const { departureTime, arrivalTime, price, status } = req.body;
        const schedule = await prisma.schedule.update({
            where: { id: req.params.id },
            data: { departureTime: new Date(departureTime), arrivalTime: new Date(arrivalTime), price: parseFloat(price), status }
        });
        res.json({ success: true, schedule });
    } catch (error) { next(error); }
});

router.delete('/schedules/:id', async (req: AuthRequest, res, next) => {
    try {
        await prisma.schedule.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (error) { next(error); }
});

// ============ DAILY SCHEDULES (Simplified recurring schedule templates) ============

// Get all daily schedules for driver's buses
router.get('/daily-schedules', async (req: AuthRequest, res, next) => {
    try {
        const driver = await prisma.driver.findUnique({ where: { userId: req.user!.id } });
        if (!driver) throw new AppError('Driver not found', 404);

        const buses = await prisma.bus.findMany({ where: { driverId: driver.id } });

        // Try to get daily schedules - may fail if migration not run
        try {
            const dailySchedules = await prisma.dailySchedule.findMany({
                where: { busId: { in: buses.map(b => b.id) } },
                include: {
                    bus: { select: { name: true, plateNumber: true } },
                    route: { select: { origin: true, destination: true, estimatedTime: true } }
                },
                orderBy: [{ busId: 'asc' }, { departureTime: 'asc' }]
            });
            res.json({ success: true, dailySchedules });
        } catch (dbError: any) {
            // If table doesn't exist, return empty array
            if (dbError.code === 'P2021' || dbError.message?.includes('does not exist')) {
                res.json({ success: true, dailySchedules: [], migrationNeeded: true });
            } else {
                throw dbError;
            }
        }
    } catch (error) { next(error); }
});

// Create daily schedule
router.post('/daily-schedules', async (req: AuthRequest, res, next) => {
    try {
        const { busId, routeId, departureTime, arrivalTime, price, isReturnTrip } = req.body;

        // Verify bus belongs to driver
        const driver = await prisma.driver.findUnique({ where: { userId: req.user!.id } });
        if (!driver) throw new AppError('Driver not found', 404);

        const bus = await prisma.bus.findFirst({ where: { id: busId, driverId: driver.id } });
        if (!bus) throw new AppError('Bus not found or unauthorized', 404);

        const dailySchedule = await prisma.dailySchedule.create({
            data: {
                busId, routeId,
                departureTime, arrivalTime,
                price: parseFloat(price),
                isActive: true,
                isReturnTrip: isReturnTrip || false
            },
            include: {
                bus: { select: { name: true, plateNumber: true } },
                route: { select: { origin: true, destination: true } }
            }
        });

        // Update bus primary route if not set
        if (!bus.primaryRouteId) {
            await prisma.bus.update({ where: { id: busId }, data: { primaryRouteId: routeId } });
        }

        res.json({ success: true, dailySchedule });
    } catch (error) { next(error); }
});

// Update daily schedule
router.put('/daily-schedules/:id', async (req: AuthRequest, res, next) => {
    try {
        const { departureTime, arrivalTime, price, isReturnTrip } = req.body;

        const dailySchedule = await prisma.dailySchedule.update({
            where: { id: req.params.id },
            data: {
                departureTime, arrivalTime,
                price: parseFloat(price),
                isReturnTrip: isReturnTrip || false
            },
            include: {
                bus: { select: { name: true, plateNumber: true } },
                route: { select: { origin: true, destination: true } }
            }
        });

        res.json({ success: true, dailySchedule });
    } catch (error) { next(error); }
});

// Toggle active/inactive
router.put('/daily-schedules/:id/toggle', async (req: AuthRequest, res, next) => {
    try {
        const existing = await prisma.dailySchedule.findUnique({ where: { id: req.params.id } });
        if (!existing) throw new AppError('Daily schedule not found', 404);

        const dailySchedule = await prisma.dailySchedule.update({
            where: { id: req.params.id },
            data: { isActive: !existing.isActive }
        });
        res.json({ success: true, dailySchedule, isActive: dailySchedule.isActive });
    } catch (error) { next(error); }
});

// Delete daily schedule
router.delete('/daily-schedules/:id', async (req: AuthRequest, res, next) => {
    try {
        await prisma.dailySchedule.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (error) { next(error); }
});

// ============ DELAY FEATURE ============

// Delay a schedule (max 6 hours = 360 minutes)
router.put('/schedules/:id/delay', async (req: AuthRequest, res, next) => {
    try {
        const { delayMinutes, reason } = req.body;
        const scheduleId = req.params.id;

        // Validate delay (max 6 hours)
        if (delayMinutes < 0 || delayMinutes > 360) {
            throw new AppError('Delay must be between 0 and 360 minutes (6 hours)', 400);
        }

        const schedule = await prisma.schedule.findUnique({
            where: { id: scheduleId },
            include: { bus: true, route: true, bookings: { include: { user: true } } }
        });

        if (!schedule) throw new AppError('Schedule not found', 404);

        // Verify schedule belongs to this driver
        const driver = await prisma.driver.findUnique({ where: { userId: req.user!.id } });
        if (!driver || schedule.bus.driverId !== driver.id) {
            throw new AppError('Unauthorized', 403);
        }

        // Store original departure time if not already stored
        const originalDep = schedule.originalDepartureTime || schedule.departureTime;

        // Calculate new times
        const newDepartureTime = new Date(originalDep.getTime() + delayMinutes * 60 * 1000);
        const duration = schedule.arrivalTime.getTime() - (schedule.originalDepartureTime || schedule.departureTime).getTime();
        const newArrivalTime = new Date(newDepartureTime.getTime() + duration);

        // Update schedule
        const updatedSchedule = await prisma.schedule.update({
            where: { id: scheduleId },
            data: {
                delayMinutes,
                delayReason: reason || null,
                originalDepartureTime: originalDep,
                departureTime: newDepartureTime,
                arrivalTime: newArrivalTime
            },
            include: { route: true, bus: true }
        });

        // Notify all passengers
        const notifications = schedule.bookings.map(booking => ({
            userId: booking.userId,
            type: 'SCHEDULE_UPDATE' as const,
            title: delayMinutes > 0 ? 'Trip Delayed' : 'Trip Delay Cancelled',
            message: delayMinutes > 0
                ? `Your trip from ${schedule.route.origin} to ${schedule.route.destination} has been delayed by ${delayMinutes} minutes. New departure: ${newDepartureTime.toLocaleTimeString()}. ${reason ? `Reason: ${reason}` : ''}`
                : `The delay for your trip from ${schedule.route.origin} to ${schedule.route.destination} has been cancelled. Original time restored.`
        }));

        if (notifications.length > 0) {
            await prisma.notification.createMany({ data: notifications });
        }

        res.json({
            success: true,
            schedule: updatedSchedule,
            notifiedPassengers: notifications.length,
            allowCancellation: delayMinutes >= 120 // Refund allowed if delay >= 2 hours
        });
    } catch (error) { next(error); }
});

// ============ UPCOMING SCHEDULES (Monthly View) ============

// Get upcoming schedules for driver's buses (next 30 days)
router.get('/upcoming-schedules', async (req: AuthRequest, res, next) => {
    try {
        const driver = await prisma.driver.findUnique({ where: { userId: req.user!.id } });
        if (!driver) throw new AppError('Driver not found', 404);

        const buses = await prisma.bus.findMany({ where: { driverId: driver.id } });
        const now = new Date();
        const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const schedules = await prisma.schedule.findMany({
            where: {
                busId: { in: buses.map(b => b.id) },
                departureTime: { gte: now, lte: thirtyDaysLater },
                status: { in: ['SCHEDULED', 'DELAYED'] }
            },
            include: {
                bus: { select: { name: true, plateNumber: true } },
                route: { select: { origin: true, destination: true } },
                _count: { select: { bookings: true } }
            },
            orderBy: { departureTime: 'asc' }
        });

        res.json({ success: true, schedules });
    } catch (error) { next(error); }
});

// Generate schedules for the next 30 days from daily schedule templates
router.post('/generate-schedules', async (req: AuthRequest, res, next) => {
    try {
        const driver = await prisma.driver.findUnique({ where: { userId: req.user!.id } });
        if (!driver) throw new AppError('Driver not found', 404);

        const buses = await prisma.bus.findMany({
            where: { driverId: driver.id, approved: true }
        });

        const dailySchedules = await prisma.dailySchedule.findMany({
            where: {
                busId: { in: buses.map(b => b.id) },
                isActive: true
            },
            include: { bus: true, route: true }
        });

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        let created = 0;
        let skipped = 0;

        // Generate schedules for next 30 days
        for (let day = 0; day < 30; day++) {
            const targetDate = new Date(now.getTime() + day * 24 * 60 * 60 * 1000);

            for (const ds of dailySchedules) {
                const [depHour, depMin] = ds.departureTime.split(':').map(Number);
                const [arrHour, arrMin] = ds.arrivalTime.split(':').map(Number);

                const departureTime = new Date(targetDate);
                departureTime.setHours(depHour, depMin, 0, 0);

                const arrivalTime = new Date(targetDate);
                arrivalTime.setHours(arrHour, arrMin, 0, 0);
                if (arrHour < depHour) arrivalTime.setDate(arrivalTime.getDate() + 1);

                // Skip if departure is in the past
                if (departureTime < new Date()) {
                    skipped++;
                    continue;
                }

                // Check if schedule already exists
                const existing = await prisma.schedule.findFirst({
                    where: {
                        busId: ds.busId,
                        routeId: ds.routeId,
                        departureTime: departureTime
                    }
                });

                if (existing) {
                    skipped++;
                    continue;
                }

                // Create schedule
                const schedule = await prisma.schedule.create({
                    data: {
                        busId: ds.busId,
                        routeId: ds.routeId,
                        departureTime,
                        arrivalTime,
                        price: ds.price,
                        availableSeats: ds.bus.capacity,
                        dailyScheduleId: ds.id
                    }
                });

                // Generate seats for this schedule using shared utility
                await prisma.seat.createMany({ data: generateSeatsForSchedule(schedule.id, ds.bus.capacity, ds.bus.hasToilet) });
                created++;
            }
        }

        res.json({ success: true, created, skipped, message: `Generated ${created} schedules, skipped ${skipped}` });
    } catch (error) { next(error); }
});

export default router;

