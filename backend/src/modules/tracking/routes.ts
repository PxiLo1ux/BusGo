import { Router } from 'express';
import { prisma } from '../../index.js';
import { authenticate, requireRole, AuthRequest } from '../../middleware/auth.js';

const router = Router();

// Get current location of a bus for a schedule
router.get('/:scheduleId', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { scheduleId } = req.params;

        // Get the latest location for this schedule
        const location = await prisma.busLocation.findFirst({
            where: { scheduleId },
            orderBy: { updatedAt: 'desc' },
            include: {
                bus: { select: { name: true, plateNumber: true } },
                schedule: {
                    select: {
                        departureTime: true,
                        arrivalTime: true,
                        route: { select: { origin: true, destination: true } }
                    }
                }
            }
        });

        if (!location) {
            return res.json({
                success: true,
                tracking: null,
                message: 'No tracking data available yet'
            });
        }

        res.json({
            success: true,
            tracking: {
                latitude: location.latitude,
                longitude: location.longitude,
                speed: location.speed,
                heading: location.heading,
                updatedAt: location.updatedAt,
                bus: location.bus,
                schedule: location.schedule
            }
        });
    } catch (error) { next(error); }
});

// Driver updates bus location
router.post('/update', authenticate, requireRole(['DRIVER']), async (req: AuthRequest, res, next) => {
    try {
        const { scheduleId, latitude, longitude, speed, heading } = req.body;

        if (!scheduleId || latitude === undefined || longitude === undefined) {
            return res.status(400).json({ success: false, message: 'Schedule ID and coordinates are required' });
        }

        // Get driver's bus for this schedule
        const driver = await prisma.driver.findUnique({
            where: { userId: req.user!.id },
            include: { buses: true }
        });

        if (!driver) {
            return res.status(403).json({ success: false, message: 'Driver not found' });
        }

        const schedule = await prisma.schedule.findUnique({
            where: { id: scheduleId },
            include: { bus: true }
        });

        if (!schedule || !driver.buses.some(b => b.id === schedule.busId)) {
            return res.status(403).json({ success: false, message: 'You can only update location for your own buses' });
        }

        // Upsert location - delete old ones and create new
        await prisma.busLocation.deleteMany({
            where: { scheduleId, busId: schedule.busId }
        });

        const location = await prisma.busLocation.create({
            data: {
                busId: schedule.busId,
                scheduleId,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                speed: speed ? parseFloat(speed) : null,
                heading: heading ? parseFloat(heading) : null
            }
        });

        // Update schedule status to IN_PROGRESS if still scheduled
        if (schedule.status === 'SCHEDULED') {
            await prisma.schedule.update({
                where: { id: scheduleId },
                data: { status: 'IN_PROGRESS' }
            });
        }

        res.json({ success: true, location });
    } catch (error) { next(error); }
});

// Get tracking history for a schedule (admin/driver only)
router.get('/:scheduleId/history', authenticate, requireRole(['ADMIN', 'DRIVER']), async (req: AuthRequest, res, next) => {
    try {
        const { scheduleId } = req.params;

        const locations = await prisma.busLocation.findMany({
            where: { scheduleId },
            orderBy: { updatedAt: 'asc' },
            take: 100
        });

        res.json({ success: true, locations });
    } catch (error) { next(error); }
});

// Admin: Get all active bus locations
router.get('/admin/all', authenticate, requireRole(['ADMIN']), async (_req: AuthRequest, res, next) => {
    try {
        // Get all schedules that are currently in progress or about to start
        const now = new Date();
        const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

        const activeSchedules = await prisma.schedule.findMany({
            where: {
                OR: [
                    { status: 'IN_PROGRESS' },
                    {
                        status: 'SCHEDULED',
                        departureTime: { gte: twoHoursAgo, lte: twoHoursFromNow }
                    }
                ]
            },
            include: {
                bus: {
                    include: {
                        driver: { include: { user: { select: { name: true } } } }
                    }
                },
                route: { select: { origin: true, destination: true } }
            }
        });

        // Get locations for all these schedules
        const scheduleIds = activeSchedules.map(s => s.id);
        const locations = await prisma.busLocation.findMany({
            where: { scheduleId: { in: scheduleIds } },
            orderBy: { updatedAt: 'desc' }
        });

        // Map locations to schedules (keep only latest per schedule)
        const locationMap = new Map();
        locations.forEach(loc => {
            if (!locationMap.has(loc.scheduleId)) {
                locationMap.set(loc.scheduleId, loc);
            }
        });

        const result = activeSchedules.map(schedule => ({
            scheduleId: schedule.id,
            busName: schedule.bus.name,
            plateNumber: schedule.bus.plateNumber,
            driverName: schedule.bus.employedDriverName || schedule.bus.driver.user.name,
            driverPhone: schedule.bus.employedDriverPhone || schedule.bus.driver.phone,
            origin: schedule.route.origin,
            destination: schedule.route.destination,
            departureTime: schedule.departureTime,
            arrivalTime: schedule.arrivalTime,
            status: schedule.status,
            location: locationMap.get(schedule.id) ? {
                latitude: locationMap.get(schedule.id).latitude,
                longitude: locationMap.get(schedule.id).longitude,
                speed: locationMap.get(schedule.id).speed,
                updatedAt: locationMap.get(schedule.id).updatedAt
            } : null
        }));

        res.json({ success: true, buses: result });
    } catch (error) { next(error); }
});

export default router;

