import { Router } from 'express';
import { prisma } from '../../index.js';
import { authenticate, AuthRequest } from '../../middleware/auth.js';

const router = Router();

const REFERRAL_POINTS_REFERRER = 500;  // Points earned by referrer
const REFERRAL_POINTS_REFERRED = 200;  // Bonus points for new user

// Get user's referral code and stats
router.get('/my-code', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const userId = req.user!.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { referralCode: true, name: true }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Get referral stats
        const referrals = await prisma.referral.findMany({
            where: { referrerId: userId },
            include: {
                referred: { select: { name: true, createdAt: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        const stats = {
            totalReferred: referrals.length,
            completedReferrals: referrals.filter(r => r.status === 'COMPLETED').length,
            pendingReferrals: referrals.filter(r => r.status === 'PENDING').length,
            totalPointsEarned: referrals.reduce((sum, r) => sum + r.pointsEarned, 0)
        };

        res.json({
            success: true,
            referralCode: user.referralCode,
            shareMessage: `Join BusGo with my referral code ${user.referralCode} and get ${REFERRAL_POINTS_REFERRED} bonus points on your first booking! 🚌`,
            stats,
            referrals: referrals.map(r => ({
                id: r.id,
                referredName: r.referred.name,
                status: r.status,
                pointsEarned: r.pointsEarned,
                createdAt: r.createdAt,
                completedAt: r.completedAt
            }))
        });
    } catch (error) { next(error); }
});

// Apply referral code (during signup or later)
router.post('/apply', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { code } = req.body;
        const userId = req.user!.id;

        if (!code) {
            return res.status(400).json({ success: false, message: 'Referral code is required' });
        }

        // Check if user already used a referral code
        const existingReferral = await prisma.referral.findFirst({
            where: { referredId: userId }
        });

        if (existingReferral) {
            return res.status(400).json({ success: false, message: 'You have already used a referral code' });
        }

        // Find referrer by code
        const referrer = await prisma.user.findUnique({
            where: { referralCode: code }
        });

        if (!referrer) {
            return res.status(404).json({ success: false, message: 'Invalid referral code' });
        }

        if (referrer.id === userId) {
            return res.status(400).json({ success: false, message: 'You cannot use your own referral code' });
        }

        // Create referral record (pending until first booking)
        const referral = await prisma.referral.create({
            data: {
                referrerId: referrer.id,
                referredId: userId,
                code,
                status: 'PENDING'
            }
        });

        res.json({
            success: true,
            message: `Referral applied! You'll receive ${REFERRAL_POINTS_REFERRED} bonus points after your first booking.`,
            referral
        });
    } catch (error) { next(error); }
});

// Complete referral (called internally after first booking)
router.post('/complete', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const userId = req.user!.id;

        // Find pending referral for this user
        const referral = await prisma.referral.findFirst({
            where: { referredId: userId, status: 'PENDING' }
        });

        if (!referral) {
            return res.json({ success: true, message: 'No pending referral' });
        }

        // Complete the referral
        await prisma.referral.update({
            where: { id: referral.id },
            data: {
                status: 'COMPLETED',
                pointsEarned: REFERRAL_POINTS_REFERRER,
                completedAt: new Date()
            }
        });

        // Award points to referrer
        await prisma.loyaltyPoints.upsert({
            where: { userId: referral.referrerId },
            update: { points: { increment: REFERRAL_POINTS_REFERRER } },
            create: { userId: referral.referrerId, points: REFERRAL_POINTS_REFERRER, tier: 'BRONZE' }
        });

        // Award bonus points to referred user
        await prisma.loyaltyPoints.upsert({
            where: { userId },
            update: { points: { increment: REFERRAL_POINTS_REFERRED } },
            create: { userId, points: REFERRAL_POINTS_REFERRED, tier: 'BRONZE' }
        });

        // Send notifications
        await prisma.notification.createMany({
            data: [
                {
                    userId: referral.referrerId,
                    type: 'LOYALTY_EARNED',
                    title: 'Referral Bonus!',
                    message: `Your referral completed their first booking! You earned ${REFERRAL_POINTS_REFERRER} points.`
                },
                {
                    userId,
                    type: 'LOYALTY_EARNED',
                    title: 'Welcome Bonus!',
                    message: `Thanks for using a referral code! You earned ${REFERRAL_POINTS_REFERRED} bonus points.`
                }
            ]
        });

        res.json({
            success: true,
            message: 'Referral completed! Points awarded.',
            referrerPoints: REFERRAL_POINTS_REFERRER,
            referredPoints: REFERRAL_POINTS_REFERRED
        });
    } catch (error) { next(error); }
});

// Validate referral code (public endpoint for signup form)
router.get('/validate/:code', async (req, res, next) => {
    try {
        const { code } = req.params;

        const referrer = await prisma.user.findUnique({
            where: { referralCode: code },
            select: { name: true }
        });

        if (!referrer) {
            return res.json({ success: true, valid: false });
        }

        res.json({
            success: true,
            valid: true,
            referrerName: referrer.name,
            bonusPoints: REFERRAL_POINTS_REFERRED
        });
    } catch (error) { next(error); }
});

export default router;
