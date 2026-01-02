import { Router } from 'express';
import { prisma } from '../../index.js';
import { authenticate, AuthRequest } from '../../middleware/auth.js';

const router = Router();

router.use(authenticate);

// Search locations for autocomplete
router.get('/search', async (req: AuthRequest, res, next) => {
    try {
        const { q } = req.query;
        const query = (q as string || '').trim();

        if (!query || query.length < 2) {
            return res.json({ success: true, locations: [] });
        }

        const locations = await prisma.location.findMany({
            where: {
                name: { contains: query, mode: 'insensitive' }
            },
            orderBy: { usageCount: 'desc' },
            take: 10
        });

        res.json({ success: true, locations });
    } catch (error) { next(error); }
});

// Get all locations (for dropdown)
router.get('/', async (req: AuthRequest, res, next) => {
    try {
        const locations = await prisma.location.findMany({
            orderBy: { usageCount: 'desc' },
            take: 100
        });
        res.json({ success: true, locations });
    } catch (error) { next(error); }
});

// Create or increment usage of a location
router.post('/', async (req: AuthRequest, res, next) => {
    try {
        const { name, district, latitude, longitude } = req.body;
        if (!name?.trim()) {
            return res.status(400).json({ success: false, message: 'Location name required' });
        }

        const normalizedName = name.trim();

        // Try to find existing location
        const existing = await prisma.location.findUnique({ where: { name: normalizedName } });

        if (existing) {
            // Increment usage count
            const updated = await prisma.location.update({
                where: { id: existing.id },
                data: { usageCount: existing.usageCount + 1 }
            });
            return res.json({ success: true, location: updated, isNew: false });
        }

        // Create new location
        const location = await prisma.location.create({
            data: {
                name: normalizedName,
                district: district?.trim() || null,
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null
            }
        });

        res.json({ success: true, location, isNew: true });
    } catch (error) { next(error); }
});

export default router;
