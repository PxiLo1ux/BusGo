import { Router } from 'express';
import { prisma } from '../../index.js';

const router = Router();

// Helper function to calculate dynamic price
// Strategy: Apply ONE rule per category (the most applicable), not compounding all
async function calculateDynamicPrice(schedulePrice: number, departureTime: Date, routeId: string): Promise<number> {
    const pricingRules = await prisma.pricingRule.findMany({
        where: {
            active: true,
            OR: [{ routeId: null }, { routeId }]
        }
    });

    if (pricingRules.length === 0) {
        console.log('[Pricing] No active pricing rules found, returning base price:', schedulePrice);
        return schedulePrice;
    }

    const now = new Date();
    const timeDiff = departureTime.getTime() - now.getTime();
    const hoursBefore = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60))); // Use floor for hours
    const daysBefore = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24))); // Use floor for days

    console.log(`[Pricing] Departure: ${departureTime.toISOString()}, Now: ${now.toISOString()}`);
    console.log(`[Pricing] Hours before: ${hoursBefore}, Days before: ${daysBefore}`);
    console.log(`[Pricing] Found ${pricingRules.length} active rules`);

    // Separate rules by type and find the best applicable rule for each category
    let bestSurgeRule: { multiplier: number; priority: number; name: string } | null = null;
    let bestEarlyBirdRule: { multiplier: number; priority: number; name: string } | null = null;
    let seasonalMultiplier = 1.0;
    let discountMultiplier = 1.0;

    for (const rule of pricingRules) {
        if (rule.type === 'SURGE') {
            // SURGE: Check if departure is within the surge window
            // minHoursBefore = 24 means: if trip departs in <= 24 hours, apply surge
            if (rule.minHoursBefore && hoursBefore <= rule.minHoursBefore) {
                const priority = rule.minHoursBefore; // Lower hours = higher priority (more specific)
                console.log(`[Pricing] SURGE rule "${rule.name}" matches (${hoursBefore}h <= ${rule.minHoursBefore}h)`);
                if (!bestSurgeRule || priority < bestSurgeRule.priority) {
                    bestSurgeRule = { multiplier: rule.multiplier, priority, name: rule.name };
                }
            }
        } else if (rule.type === 'EARLY_BIRD') {
            // EARLY_BIRD: Check if booking is made far enough in advance
            // minDaysBefore = 3 means: if trip departs in >= 3 days, apply discount
            if (rule.minDaysBefore && daysBefore >= rule.minDaysBefore) {
                const priority = rule.minDaysBefore;
                console.log(`[Pricing] EARLY_BIRD rule "${rule.name}" matches (${daysBefore}d >= ${rule.minDaysBefore}d)`);
                if (!bestEarlyBirdRule || priority > bestEarlyBirdRule.priority) {
                    bestEarlyBirdRule = { multiplier: rule.multiplier, priority, name: rule.name };
                }
            }
        } else if (rule.type === 'SEASONAL') {
            if (rule.startDate && rule.endDate && now >= rule.startDate && now <= rule.endDate) {
                if (rule.multiplier > seasonalMultiplier) {
                    seasonalMultiplier = rule.multiplier;
                    console.log(`[Pricing] SEASONAL rule "${rule.name}" applies, multiplier: ${rule.multiplier}`);
                }
            }
        } else if (rule.type === 'DISCOUNT') {
            if (rule.multiplier < discountMultiplier) {
                discountMultiplier = rule.multiplier;
            }
        }
    }

    // Calculate final price
    // SURGE and EARLY_BIRD are mutually exclusive - surge takes precedence
    let dynamicPrice = schedulePrice;

    if (bestSurgeRule) {
        console.log(`[Pricing] Applying SURGE: "${bestSurgeRule.name}" x${bestSurgeRule.multiplier}`);
        dynamicPrice *= bestSurgeRule.multiplier;
    } else if (bestEarlyBirdRule) {
        console.log(`[Pricing] Applying EARLY_BIRD: "${bestEarlyBirdRule.name}" x${bestEarlyBirdRule.multiplier}`);
        dynamicPrice *= bestEarlyBirdRule.multiplier;
    } else {
        console.log('[Pricing] No surge or early bird rules applied');
    }

    if (seasonalMultiplier > 1.0) {
        dynamicPrice *= seasonalMultiplier;
    }
    if (discountMultiplier < 1.0) {
        dynamicPrice *= discountMultiplier;
    }

    console.log(`[Pricing] Base: ${schedulePrice} -> Dynamic: ${Math.round(dynamicPrice)}`);
    return Math.round(dynamicPrice);
}

// Search schedules by origin, destination, date
router.get('/', async (req, res, next) => {
    try {
        const { origin, destination, date } = req.query;
        const now = new Date();

        // Always filter out buses that have already departed
        // For today: use current time + 5 min buffer
        // For future dates: use start of that day
        let minDepartureTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 min buffer

        if (date) {
            const searchDate = new Date(date as string);
            searchDate.setHours(0, 0, 0, 0);
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);

            // If searching for a future date (not today), use start of that day
            if (searchDate.getTime() > todayStart.getTime()) {
                minDepartureTime = searchDate;
            }
            // If searching for today, keep using current time + buffer
        }

        // First find matching routes (case-insensitive)
        const matchingRoutes = await prisma.route.findMany({
            where: {
                origin: { equals: origin as string, mode: 'insensitive' },
                destination: { equals: destination as string, mode: 'insensitive' }
            }
        });

        if (matchingRoutes.length === 0) {
            return res.json({ success: true, schedules: [] });
        }

        const schedules = await prisma.schedule.findMany({
            where: {
                routeId: { in: matchingRoutes.map(r => r.id) },
                departureTime: { gte: minDepartureTime }, // Only future departures
                status: 'SCHEDULED',
                bus: { approved: true }
            },
            include: {
                bus: { include: { driver: { include: { user: true } } } },
                route: true,
                _count: { select: { seats: true } }
            },
            orderBy: { departureTime: 'asc' },
            take: 20
        });

        // Calculate dynamic prices for all schedules
        const formattedSchedules = await Promise.all(schedules.map(async schedule => {
            const dynamicPrice = await calculateDynamicPrice(
                schedule.price,
                schedule.departureTime,
                schedule.routeId
            );

            return {
                id: schedule.id,
                busId: schedule.busId,
                busName: schedule.bus.name,
                busType: schedule.bus.type,
                operator: schedule.bus.driver.user.name,
                driverPhone: schedule.bus.driver.phone,
                origin: schedule.route.origin,
                destination: schedule.route.destination,
                departureTime: schedule.departureTime,
                arrivalTime: schedule.arrivalTime,
                price: schedule.price,
                dynamicPrice,
                availableSeats: schedule.availableSeats,
                totalSeats: schedule.bus.capacity,
                amenities: schedule.bus.amenities || [],
                hasToilet: schedule.bus.hasToilet,
                rating: schedule.bus.rating || 4.0,
                totalReviews: schedule.bus.totalReviews || 0
            };
        }));

        res.json({ success: true, schedules: formattedSchedules });
    } catch (error) { next(error); }
});

// Get single schedule with full details (includes dynamic price)
router.get('/schedules/:id', async (req, res, next) => {
    try {
        const schedule = await prisma.schedule.findUnique({
            where: { id: req.params.id },
            include: {
                bus: { include: { driver: { include: { user: true } } } },
                route: true,
                seats: true
            }
        });

        if (!schedule) {
            return res.status(404).json({ success: false, message: 'Schedule not found' });
        }

        // Calculate dynamic price consistently
        const dynamicPrice = await calculateDynamicPrice(
            schedule.price,
            schedule.departureTime,
            schedule.routeId
        );

        res.json({
            success: true,
            schedule: {
                id: schedule.id,
                busId: schedule.busId,
                busName: schedule.bus.name,
                busType: schedule.bus.type,
                operator: schedule.bus.driver.user.name,
                driverPhone: schedule.bus.driver.phone,
                origin: schedule.route.origin,
                destination: schedule.route.destination,
                departureTime: schedule.departureTime,
                arrivalTime: schedule.arrivalTime,
                price: schedule.price,
                dynamicPrice,
                totalSeats: schedule.bus.capacity,
                availableSeats: schedule.availableSeats,
                amenities: schedule.bus.amenities || [],
                hasToilet: schedule.bus.hasToilet,
                rating: schedule.bus.rating || 4.0
            }
        });
    } catch (error) { next(error); }
});

// Get seats for a schedule (auto-generate if missing)
router.get('/schedules/:id/seats', async (req, res, next) => {
    try {
        let schedule = await prisma.schedule.findUnique({
            where: { id: req.params.id },
            include: {
                bus: true,
                route: true,
                seats: { orderBy: [{ row: 'asc' }, { column: 'asc' }] }
            }
        });

        if (!schedule) {
            return res.status(404).json({ success: false, message: 'Schedule not found' });
        }

        // Auto-generate seats if none exist
        if (schedule.seats.length === 0) {
            const { generateSeatsForSchedule } = await import('../../utils/seatGenerator.js');
            const newSeats = generateSeatsForSchedule(schedule.id, schedule.bus.capacity, schedule.bus.hasToilet);
            await prisma.seat.createMany({ data: newSeats });

            // Refetch with new seats
            schedule = await prisma.schedule.findUnique({
                where: { id: req.params.id },
                include: {
                    bus: true,
                    route: true,
                    seats: { orderBy: [{ row: 'asc' }, { column: 'asc' }] }
                }
            });
        }

        // Calculate dynamic price for consistency
        const dynamicPrice = await calculateDynamicPrice(
            schedule!.price,
            schedule!.departureTime,
            schedule!.routeId
        );

        const seats = schedule!.seats.map(seat => ({
            id: seat.id,
            name: seat.name,
            row: seat.row,
            column: seat.column,
            position: seat.position,
            isBooked: seat.isBooked
        }));

        res.json({
            success: true,
            seats,
            busInfo: {
                name: schedule!.bus.name,
                capacity: schedule!.bus.capacity,
                type: schedule!.bus.type,
                hasToilet: schedule!.bus.hasToilet
            },
            scheduleInfo: {
                price: schedule!.price,
                dynamicPrice,
                departureTime: schedule!.departureTime,
                arrivalTime: schedule!.arrivalTime
            }
        });
    } catch (error) { next(error); }
});

// Get available routes for autocomplete
router.get('/routes', async (req, res, next) => {
    try {
        const routes = await prisma.route.findMany({
            distinct: ['origin', 'destination'],
            select: { origin: true, destination: true }
        });

        const origins = [...new Set(routes.map(r => r.origin))];
        const destinations = [...new Set(routes.map(r => r.destination))];

        res.json({ success: true, origins, destinations });
    } catch (error) { next(error); }
});

export default router;
