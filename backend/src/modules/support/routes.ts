import { Router } from 'express';
import { prisma } from '../../index.js';
import { authenticate, requireRole } from '../../middleware/auth.js';

const router = Router();

// Submit support ticket (public - no auth required)
router.post('/tickets', async (req, res, next) => {
    try {
        const { email, category, description, userId } = req.body;

        const ticket = await prisma.supportTicket.create({
            data: {
                email,
                category,
                description,
                userId: userId || null
            }
        });

        // Create initial auto-reply message
        await prisma.chatMessage.create({
            data: {
                ticketId: ticket.id,
                content: `Thank you for contacting BusGo support. Your ticket #${ticket.id.slice(0, 8)} has been received. We typically respond within 24 hours.`,
                isAdmin: true
            }
        });

        res.status(201).json({
            success: true,
            ticket,
            message: 'Support ticket submitted successfully'
        });
    } catch (error) { next(error); }
});

// Get user's tickets
router.get('/tickets', authenticate, async (req: any, res, next) => {
    try {
        const tickets = await prisma.supportTicket.findMany({
            where: { userId: req.user.id },
            include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, tickets });
    } catch (error) { next(error); }
});

// Get single ticket with messages
router.get('/tickets/:id', authenticate, async (req: any, res, next) => {
    try {
        const ticket = await prisma.supportTicket.findUnique({
            where: { id: req.params.id },
            include: { messages: { orderBy: { createdAt: 'asc' } } }
        });

        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        // Only allow owner or admin
        if (ticket.userId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        res.json({ success: true, ticket });
    } catch (error) { next(error); }
});

// Add message to ticket
router.post('/tickets/:id/messages', authenticate, async (req: any, res, next) => {
    try {
        const { content } = req.body;
        const isAdmin = req.user.role === 'ADMIN';

        const message = await prisma.chatMessage.create({
            data: {
                ticketId: req.params.id,
                senderId: req.user.id,
                content,
                isAdmin
            }
        });

        // Update ticket status if admin responds
        if (isAdmin) {
            await prisma.supportTicket.update({
                where: { id: req.params.id },
                data: { status: 'in_progress' }
            });
        }

        res.status(201).json({ success: true, message });
    } catch (error) { next(error); }
});

// ADMIN: Get all tickets
router.get('/admin/tickets', authenticate, requireRole('ADMIN'), async (req, res, next) => {
    try {
        const { status } = req.query;
        const tickets = await prisma.supportTicket.findMany({
            where: status ? { status: status as string } : {},
            include: {
                user: { select: { name: true, email: true } },
                messages: { orderBy: { createdAt: 'desc' }, take: 1 }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, tickets });
    } catch (error) { next(error); }
});

// ADMIN: Update ticket status
router.patch('/admin/tickets/:id', authenticate, requireRole('ADMIN'), async (req, res, next) => {
    try {
        const { status } = req.body;
        const ticket = await prisma.supportTicket.update({
            where: { id: req.params.id },
            data: { status }
        });
        res.json({ success: true, ticket });
    } catch (error) { next(error); }
});

export default router;
