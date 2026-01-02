import { Router } from 'express';
import { prisma } from '../../index.js';
import { authenticate, AuthRequest } from '../../middleware/auth.js';

const router = Router();

router.use(authenticate);

// Loyalty tier thresholds
const TIER_THRESHOLDS = { BRONZE: 0, SILVER: 5000, GOLD: 15000 };
const TIER_DISCOUNTS = { BRONZE: 0, SILVER: 0.05, GOLD: 0.10 }; // 0%, 5%, 10%
const POINTS_PER_RUPEE = 1; // 1 point per Rs. 1 spent
const REDEMPTION_RATE = 10; // 100 points = Rs. 10

// Get user loyalty status
router.get('/status', async (req: AuthRequest, res, next) => {
    try {
        let loyalty = await prisma.loyaltyPoints.findUnique({
            where: { userId: req.user!.id },
            include: { transactions: { orderBy: { createdAt: 'desc' }, take: 10 } }
        });

        // Create if not exists
        if (!loyalty) {
            loyalty = await prisma.loyaltyPoints.create({
                data: { userId: req.user!.id },
                include: { transactions: true }
            });
        }

        const discount = TIER_DISCOUNTS[loyalty.tier];
        const nextTier = loyalty.tier === 'BRONZE' ? 'SILVER' : loyalty.tier === 'SILVER' ? 'GOLD' : null;
        const pointsToNextTier = nextTier ? TIER_THRESHOLDS[nextTier] - loyalty.totalEarned : 0;

        res.json({
            success: true,
            points: loyalty.points,
            tier: loyalty.tier,
            totalEarned: loyalty.totalEarned,
            discount: discount * 100,
            nextTier,
            pointsToNextTier,
            recentTransactions: loyalty.transactions
        });
    } catch (error) { next(error); }
});

// Calculate points for an amount
router.get('/calculate', async (req: AuthRequest, res, next) => {
    try {
        const { amount, usePoints } = req.query;
        const amountNum = parseFloat(amount as string) || 0;
        const usePointsNum = parseInt(usePoints as string) || 0;

        const loyalty = await prisma.loyaltyPoints.findUnique({ where: { userId: req.user!.id } });
        const availablePoints = loyalty?.points || 0;
        const tier = loyalty?.tier || 'BRONZE';
        const discount = TIER_DISCOUNTS[tier];

        // Apply tier discount first
        const afterTierDiscount = amountNum * (1 - discount);

        // Calculate max redeemable points (max 50% of remaining amount)
        const maxRedeemable = Math.min(availablePoints, Math.floor((afterTierDiscount * 0.5) * REDEMPTION_RATE));
        const pointsToUse = Math.min(usePointsNum, maxRedeemable);
        const pointsDiscount = pointsToUse / REDEMPTION_RATE;

        const finalAmount = afterTierDiscount - pointsDiscount;
        const pointsEarned = Math.floor(finalAmount * POINTS_PER_RUPEE);

        res.json({
            success: true,
            originalAmount: amountNum,
            tierDiscount: amountNum * discount,
            afterTierDiscount,
            pointsDiscount,
            pointsUsed: pointsToUse,
            finalAmount: Math.max(0, finalAmount),
            pointsEarned,
            availablePoints,
            maxRedeemable
        });
    } catch (error) { next(error); }
});

// Get loyalty offers
router.get('/offers', async (req: AuthRequest, res, next) => {
    try {
        const offers = await prisma.loyaltyOffer.findMany({
            where: { isActive: true, validUntil: { gte: new Date() } },
            orderBy: { pointsCost: 'asc' }
        });
        res.json({ success: true, offers });
    } catch (error) { next(error); }
});

// Claim/redeem an offer
router.post('/offers/:id/claim', async (req: AuthRequest, res, next) => {
    try {
        const offer = await prisma.loyaltyOffer.findUnique({ where: { id: req.params.id } });
        if (!offer || !offer.isActive) {
            return res.status(404).json({ success: false, message: 'Offer not found or expired' });
        }

        const loyalty = await prisma.loyaltyPoints.findUnique({ where: { userId: req.user!.id } });
        if (!loyalty || loyalty.points < offer.pointsCost) {
            return res.status(400).json({ success: false, message: 'Insufficient points' });
        }

        // Deduct points
        await prisma.loyaltyPoints.update({
            where: { userId: req.user!.id },
            data: { points: { decrement: offer.pointsCost } }
        });

        // Record transaction
        await prisma.loyaltyTransaction.create({
            data: { loyaltyId: loyalty.id, type: 'REDEEMED', points: -offer.pointsCost, description: `Claimed: ${offer.name}` }
        });

        // Send notification to user
        await prisma.notification.create({
            data: {
                userId: req.user!.id,
                type: 'LOYALTY_EARNED',
                title: 'Offer Redeemed!',
                message: `You successfully redeemed "${offer.name}" for ${offer.pointsCost} points. ${offer.discountPercent > 0 ? `Enjoy ${offer.discountPercent}% off on your next booking!` : 'Enjoy your reward!'}`
            }
        });

        res.json({ success: true, message: 'Offer claimed successfully', discountPercent: offer.discountPercent, offer });
    } catch (error) { next(error); }
});

// Get user's redeemed offers
router.get('/redeemed', async (req: AuthRequest, res, next) => {
    try {
        const loyalty = await prisma.loyaltyPoints.findUnique({ where: { userId: req.user!.id } });
        if (!loyalty) {
            return res.json({ success: true, redeemed: [] });
        }

        const transactions = await prisma.loyaltyTransaction.findMany({
            where: { loyaltyId: loyalty.id, type: 'REDEEMED' },
            orderBy: { createdAt: 'desc' }
        });

        const redeemed = transactions.map(t => ({
            id: t.id,
            offerName: t.description?.replace('Claimed: ', '') || 'Unknown',
            pointsSpent: Math.abs(t.points),
            claimedAt: t.createdAt
        }));

        res.json({ success: true, redeemed });
    } catch (error) { next(error); }
});

// Get user's available (unclaimed) rewards that can be applied
router.get('/available-rewards', async (req: AuthRequest, res, next) => {
    try {
        const loyalty = await prisma.loyaltyPoints.findUnique({ where: { userId: req.user!.id } });
        if (!loyalty) {
            return res.json({ success: true, rewards: [] });
        }

        // Get recently claimed offers (within last 30 days) that have discount
        const recentClaims = await prisma.loyaltyTransaction.findMany({
            where: {
                loyaltyId: loyalty.id,
                type: 'REDEEMED',
                createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Match with offers to get discount info
        const rewards = [];
        for (const claim of recentClaims) {
            const offerName = claim.description?.replace('Claimed: ', '');
            if (offerName) {
                const offer = await prisma.loyaltyOffer.findFirst({ where: { name: offerName } });
                if (offer && offer.discountPercent > 0) {
                    rewards.push({
                        id: claim.id,
                        name: offer.name,
                        discountPercent: offer.discountPercent,
                        category: offer.category,
                        claimedAt: claim.createdAt
                    });
                }
            }
        }

        res.json({ success: true, rewards });
    } catch (error) { next(error); }
});

// Award points (called after booking confirmation)
export async function awardPoints(userId: string, amount: number, description: string) {
    const points = Math.floor(amount * POINTS_PER_RUPEE);

    let loyalty = await prisma.loyaltyPoints.findUnique({ where: { userId } });
    if (!loyalty) {
        loyalty = await prisma.loyaltyPoints.create({ data: { userId } });
    }

    const newTotal = loyalty.totalEarned + points;
    const newTier = newTotal >= TIER_THRESHOLDS.GOLD ? 'GOLD' : newTotal >= TIER_THRESHOLDS.SILVER ? 'SILVER' : 'BRONZE';

    await prisma.loyaltyPoints.update({
        where: { userId },
        data: { points: { increment: points }, totalEarned: { increment: points }, tier: newTier }
    });

    await prisma.loyaltyTransaction.create({
        data: { loyaltyId: loyalty.id, type: 'EARNED', points, description }
    });

    return { pointsEarned: points, newTier };
}

// Redeem points (called during checkout)
export async function redeemPoints(userId: string, points: number, description: string) {
    const loyalty = await prisma.loyaltyPoints.findUnique({ where: { userId } });
    if (!loyalty || loyalty.points < points) {
        throw new Error('Insufficient points');
    }

    await prisma.loyaltyPoints.update({
        where: { userId },
        data: { points: { decrement: points } }
    });

    await prisma.loyaltyTransaction.create({
        data: { loyaltyId: loyalty.id, type: 'REDEEMED', points: -points, description }
    });

    return points / REDEMPTION_RATE; // Return discount amount
}

export default router;

