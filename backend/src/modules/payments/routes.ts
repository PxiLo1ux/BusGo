import { Router } from 'express';
import Stripe from 'stripe';
import { prisma } from '../../index.js';
import { authenticate, AuthRequest } from '../../middleware/auth.js';
import { AppError } from '../../middleware/errorHandler.js';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' });

router.post('/create-intent', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { bookingId } = req.body;

        const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
        if (!booking) throw new AppError('Booking not found', 404);

        // Create Stripe payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(booking.totalAmount * 100), // Convert to paisa
            currency: 'npr',
            metadata: { bookingId }
        });

        // Create payment record
        await prisma.payment.create({
            data: { bookingId, amount: booking.totalAmount, stripePaymentId: paymentIntent.id }
        });

        res.json({ success: true, clientSecret: paymentIntent.client_secret });
    } catch (error) { next(error); }
});

router.post('/confirm', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { bookingId, paymentIntentId } = req.body;

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status === 'succeeded') {
            await prisma.payment.update({
                where: { bookingId },
                data: { status: 'SUCCEEDED' }
            });

            await prisma.booking.update({
                where: { id: bookingId },
                data: { status: 'CONFIRMED' }
            });
        }

        res.json({ success: true, status: paymentIntent.status });
    } catch (error) { next(error); }
});

export default router;
