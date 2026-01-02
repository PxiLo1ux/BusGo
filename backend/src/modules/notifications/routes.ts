import { Router } from 'express';
import { prisma } from '../../index.js';
import { authenticate, AuthRequest } from '../../middleware/auth.js';

const router = Router();

router.use(authenticate);

// Get user notifications
router.get('/', async (req: AuthRequest, res, next) => {
    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: req.user!.id },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        const unreadCount = notifications.filter(n => !n.read).length;
        res.json({ success: true, notifications, unreadCount });
    } catch (error) { next(error); }
});

// Mark as read
router.put('/:id/read', async (req: AuthRequest, res, next) => {
    try {
        await prisma.notification.update({
            where: { id: req.params.id },
            data: { read: true }
        });
        res.json({ success: true });
    } catch (error) { next(error); }
});

// Mark all as read
router.put('/read-all', async (req: AuthRequest, res, next) => {
    try {
        await prisma.notification.updateMany({
            where: { userId: req.user!.id, read: false },
            data: { read: true }
        });
        res.json({ success: true });
    } catch (error) { next(error); }
});

// Create notification (internal helper)
export async function createNotification(userId: string, type: string, title: string, message: string) {
    return prisma.notification.create({
        data: { userId, type: type as any, title, message }
    });
}

// Send trip reminder (called by cron job)
export async function sendTripReminders() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const upcomingBookings = await prisma.booking.findMany({
        where: {
            status: 'CONFIRMED',
            schedule: { departureTime: { gte: tomorrow, lt: dayAfter } }
        },
        include: { schedule: { include: { route: true, bus: { include: { driver: { include: { user: true } } } } } } }
    });

    for (const booking of upcomingBookings) {
        await createNotification(
            booking.userId,
            'TRIP_REMINDER',
            'Trip Reminder',
            `Your trip from ${booking.schedule.route.origin} to ${booking.schedule.route.destination} is tomorrow at ${new Date(booking.schedule.departureTime).toLocaleTimeString()}`
        );
    }
}

export default router;
