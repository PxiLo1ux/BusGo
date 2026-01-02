import { Router } from 'express';
import { prisma } from '../../index.js';
import { authenticate, AuthRequest } from '../../middleware/auth.js';
import { AppError } from '../../middleware/errorHandler.js';
import { createNotification } from '../notifications/routes.js';

const router = Router();

router.use(authenticate);

// IMPORTANT: Static routes MUST come before dynamic :bookingId routes

// Get all chats for current user - grouped by the other participant (merged view)
router.get('/', async (req: AuthRequest, res, next) => {
    try {
        let bookings: any[];

        if (req.user!.role === 'DRIVER') {
            const driver = await prisma.driver.findUnique({ where: { userId: req.user!.id } });
            if (!driver) throw new AppError('Driver not found', 404);

            const buses = await prisma.bus.findMany({ where: { driverId: driver.id } });
            const schedules = await prisma.schedule.findMany({ where: { busId: { in: buses.map(b => b.id) } } });

            bookings = await prisma.booking.findMany({
                where: { scheduleId: { in: schedules.map(s => s.id) } },
                include: {
                    user: { select: { id: true, name: true } },
                    schedule: { include: { route: true } },
                    messages: { orderBy: { createdAt: 'desc' }, take: 1 }
                },
                orderBy: { updatedAt: 'desc' }
            });
            bookings = bookings.filter(b => b.messages.length > 0);

            // Group by passenger (merge chats with same passenger)
            const groupedByPassenger: { [key: string]: any } = {};
            for (const b of bookings) {
                const passengerId = b.userId;
                if (!groupedByPassenger[passengerId]) {
                    groupedByPassenger[passengerId] = {
                        participantId: passengerId,
                        participantName: b.user?.name || 'Unknown',
                        bookings: [],
                        lastMessage: b.messages[0]?.content || '',
                        lastMessageTime: b.messages[0]?.createdAt,
                        totalMessages: 0
                    };
                }
                groupedByPassenger[passengerId].bookings.push(b.id);
                if (b.messages[0] && new Date(b.messages[0].createdAt) > new Date(groupedByPassenger[passengerId].lastMessageTime || 0)) {
                    groupedByPassenger[passengerId].lastMessage = b.messages[0].content;
                    groupedByPassenger[passengerId].lastMessageTime = b.messages[0].createdAt;
                }
            }

            return res.json({
                success: true,
                chats: Object.values(groupedByPassenger).sort((a, b) =>
                    new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
                )
            });
        } else {
            bookings = await prisma.booking.findMany({
                where: { userId: req.user!.id },
                include: {
                    schedule: { include: { route: true, bus: { include: { driver: { include: { user: true } } } } } },
                    messages: { orderBy: { createdAt: 'desc' }, take: 1 }
                },
                orderBy: { updatedAt: 'desc' }
            });
            bookings = bookings.filter(b => b.messages.length > 0);

            // Group by driver (merge chats with same driver)
            const groupedByDriver: { [key: string]: any } = {};
            for (const b of bookings) {
                const driverId = b.schedule?.bus?.driver?.id || '';
                if (!driverId) continue;
                if (!groupedByDriver[driverId]) {
                    groupedByDriver[driverId] = {
                        participantId: driverId,
                        participantName: b.schedule?.bus?.driver?.user?.name || 'Unknown',
                        bookings: [],
                        lastMessage: b.messages[0]?.content || '',
                        lastMessageTime: b.messages[0]?.createdAt,
                        totalMessages: 0
                    };
                }
                groupedByDriver[driverId].bookings.push(b.id);
                if (b.messages[0] && new Date(b.messages[0].createdAt) > new Date(groupedByDriver[driverId].lastMessageTime || 0)) {
                    groupedByDriver[driverId].lastMessage = b.messages[0].content;
                    groupedByDriver[driverId].lastMessageTime = b.messages[0].createdAt;
                }
            }

            return res.json({
                success: true,
                chats: Object.values(groupedByDriver).sort((a, b) =>
                    new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
                )
            });
        }
    } catch (error) { next(error); }
});

// Get merged chat messages with a specific participant
router.get('/merged/:participantId', async (req: AuthRequest, res, next) => {
    try {
        const { participantId } = req.params;
        let bookingIds: string[] = [];
        let participantName = '';

        if (req.user!.role === 'DRIVER') {
            const driver = await prisma.driver.findUnique({ where: { userId: req.user!.id } });
            if (!driver) throw new AppError('Driver not found', 404);

            const buses = await prisma.bus.findMany({ where: { driverId: driver.id } });
            const schedules = await prisma.schedule.findMany({ where: { busId: { in: buses.map(b => b.id) } } });

            const bookings = await prisma.booking.findMany({
                where: {
                    scheduleId: { in: schedules.map(s => s.id) },
                    userId: participantId
                },
                include: { user: { select: { name: true } }, schedule: { include: { route: true } } }
            });
            bookingIds = bookings.map(b => b.id);
            participantName = bookings[0]?.user?.name || 'Unknown';
        } else {
            // Get the driver's userId from participantId (driver id)
            const driver = await prisma.driver.findUnique({
                where: { id: participantId },
                include: { user: { select: { name: true } } }
            });
            if (driver) {
                participantName = driver.user.name;
                const buses = await prisma.bus.findMany({ where: { driverId: driver.id } });
                const schedules = await prisma.schedule.findMany({ where: { busId: { in: buses.map(b => b.id) } } });

                const bookings = await prisma.booking.findMany({
                    where: {
                        scheduleId: { in: schedules.map(s => s.id) },
                        userId: req.user!.id
                    }
                });
                bookingIds = bookings.map(b => b.id);
            }
        }

        // Get all messages from all bookings with this participant
        const messages = await prisma.bookingChat.findMany({
            where: { bookingId: { in: bookingIds } },
            include: {
                sender: { select: { id: true, name: true, role: true } },
                booking: { select: { id: true, schedule: { select: { route: { select: { origin: true, destination: true } } } } } }
            },
            orderBy: { createdAt: 'asc' }
        });

        res.json({
            success: true,
            participantName,
            messages: messages.map(m => ({
                id: m.id,
                content: m.content,
                senderId: m.senderId,
                senderName: m.sender.name,
                isDriver: m.sender.role === 'DRIVER',
                createdAt: m.createdAt,
                bookingId: m.bookingId,
                route: `${m.booking.schedule.route.origin} → ${m.booking.schedule.route.destination}`
            }))
        });
    } catch (error) { next(error); }
});

// Admin: Get all driver-passenger conversations
router.get('/admin/conversations', async (req: AuthRequest, res, next) => {
    try {
        if (req.user!.role !== 'ADMIN') throw new AppError('Admin access required', 403);

        // Get all bookings with messages
        const bookings = await prisma.booking.findMany({
            where: { messages: { some: {} } },
            include: {
                user: { select: { id: true, name: true } },
                schedule: { include: { route: true, bus: { include: { driver: { include: { user: true } } } } } },
                messages: { orderBy: { createdAt: 'desc' }, take: 1 }
            },
            orderBy: { updatedAt: 'desc' }
        });

        // Group by unique driver-passenger pairs
        const pairs: { [key: string]: any } = {};
        for (const b of bookings) {
            const driverId = b.schedule?.bus?.driver?.id || '';
            const passengerId = b.userId;
            const pairKey = `${driverId}-${passengerId}`;

            if (!pairs[pairKey]) {
                pairs[pairKey] = {
                    pairId: pairKey,
                    driverId,
                    driverName: b.schedule?.bus?.driver?.user?.name || 'Unknown',
                    passengerId,
                    passengerName: b.user?.name || 'Unknown',
                    bookings: [],
                    lastMessage: b.messages[0]?.content || '',
                    lastMessageTime: b.messages[0]?.createdAt,
                    messageCount: 0
                };
            }
            pairs[pairKey].bookings.push(b.id);
            if (b.messages[0] && new Date(b.messages[0].createdAt) > new Date(pairs[pairKey].lastMessageTime || 0)) {
                pairs[pairKey].lastMessage = b.messages[0].content;
                pairs[pairKey].lastMessageTime = b.messages[0].createdAt;
            }
        }

        res.json({
            success: true,
            conversations: Object.values(pairs).sort((a, b) =>
                new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
            )
        });
    } catch (error) { next(error); }
});

// Admin: Get full conversation between driver-passenger pair
router.get('/admin/conversation/:pairId', async (req: AuthRequest, res, next) => {
    try {
        if (req.user!.role !== 'ADMIN') throw new AppError('Admin access required', 403);

        const [driverId, passengerId] = req.params.pairId.split('-');

        const driver = await prisma.driver.findUnique({ where: { id: driverId }, include: { user: { select: { name: true } } } });
        const passenger = await prisma.user.findUnique({ where: { id: passengerId }, select: { name: true } });

        const buses = await prisma.bus.findMany({ where: { driverId } });
        const schedules = await prisma.schedule.findMany({ where: { busId: { in: buses.map(b => b.id) } } });

        const bookings = await prisma.booking.findMany({
            where: {
                scheduleId: { in: schedules.map(s => s.id) },
                userId: passengerId
            }
        });

        const messages = await prisma.bookingChat.findMany({
            where: { bookingId: { in: bookings.map(b => b.id) } },
            include: {
                sender: { select: { id: true, name: true, role: true } },
                booking: { select: { id: true, schedule: { select: { route: { select: { origin: true, destination: true } } } } } }
            },
            orderBy: { createdAt: 'asc' }
        });

        res.json({
            success: true,
            driverName: driver?.user?.name || 'Unknown',
            passengerName: passenger?.name || 'Unknown',
            messages: messages.map(m => ({
                id: m.id,
                content: m.content,
                senderId: m.senderId,
                senderName: m.sender.name,
                isDriver: m.sender.role === 'DRIVER',
                createdAt: m.createdAt,
                bookingId: m.bookingId,
                route: `${m.booking.schedule.route.origin} → ${m.booking.schedule.route.destination}`
            }))
        });
    } catch (error) { next(error); }
});

// Dynamic routes MUST come AFTER static routes

// Get messages for a booking (passenger or driver can access their own bookings)
router.get('/:bookingId', async (req: AuthRequest, res, next) => {
    try {
        const booking = await prisma.booking.findUnique({
            where: { id: req.params.bookingId },
            include: {
                schedule: { include: { route: true, bus: { include: { driver: true } } } },
                messages: { orderBy: { createdAt: 'asc' }, include: { sender: { select: { id: true, name: true, role: true } } } }
            }
        });

        if (!booking) throw new AppError('Booking not found', 404);

        // Check access - must be passenger or driver of this booking
        const isPassenger = booking.userId === req.user!.id;
        const isDriver = booking.schedule.bus.driver.userId === req.user!.id;
        if (!isPassenger && !isDriver) throw new AppError('Access denied', 403);

        res.json({
            success: true,
            booking: {
                id: booking.id,
                passengerName: booking.passengerName,
                route: `${booking.schedule.route.origin} → ${booking.schedule.route.destination}`,
                departureTime: booking.schedule.departureTime,
                status: booking.status
            },
            messages: booking.messages.map((m: any) => ({
                id: m.id,
                content: m.content,
                senderId: m.senderId,
                senderName: m.sender.name,
                isDriver: m.sender.role === 'DRIVER',
                createdAt: m.createdAt
            }))
        });
    } catch (error) { next(error); }
});

// Send message in booking chat
router.post('/:bookingId', async (req: AuthRequest, res, next) => {
    try {
        const { content } = req.body;
        if (!content?.trim()) throw new AppError('Message content required', 400);

        const booking = await prisma.booking.findUnique({
            where: { id: req.params.bookingId },
            include: { schedule: { include: { route: true, bus: { include: { driver: { include: { user: true } } } } } }, user: true }
        });

        if (!booking) throw new AppError('Booking not found', 404);

        const isPassenger = booking.userId === req.user!.id;
        const isDriver = booking.schedule.bus.driver.userId === req.user!.id;
        if (!isPassenger && !isDriver) throw new AppError('Access denied', 403);

        const message = await prisma.bookingChat.create({
            data: { bookingId: req.params.bookingId, senderId: req.user!.id, content: content.trim() },
            include: { sender: { select: { id: true, name: true, role: true } } }
        });

        // Send notification to the other party
        const recipientId = isPassenger ? booking.schedule.bus.driver.userId : booking.userId;
        const senderName = isPassenger ? booking.user.name : booking.schedule.bus.driver.user.name;
        const route = `${booking.schedule.route.origin} → ${booking.schedule.route.destination}`;
        await createNotification(
            recipientId,
            'NEW_MESSAGE',
            'New Message',
            `${senderName}: "${content.trim().slice(0, 50)}..." regarding ${route}`
        );

        res.json({
            success: true,
            message: {
                id: message.id,
                content: message.content,
                senderId: message.senderId,
                senderName: message.sender.name,
                isDriver: message.sender.role === 'DRIVER',
                createdAt: message.createdAt
            }
        });
    } catch (error) { next(error); }
});

export default router;
