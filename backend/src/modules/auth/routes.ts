import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../index.js';
import { AppError } from '../../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../../middleware/auth.js';

const router = Router();

router.post('/register', async (req, res, next) => {
    try {
        const { name, email, password, role = 'PASSENGER', phone, licenseNumber } = req.body;

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) throw new AppError('Email already registered', 400);

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { name, email, password: hashedPassword, role: role.toUpperCase() }
        });

        if (role.toUpperCase() === 'DRIVER' && phone && licenseNumber) {
            await prisma.driver.create({
                data: { userId: user.id, phone, licenseNumber }
            });
        }

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
        res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) { next(error); }
});

router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) throw new AppError('Invalid credentials', 401);

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) throw new AppError('Invalid credentials', 401);

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
        res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) { next(error); }
});

router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
            select: { id: true, name: true, email: true, role: true, phone: true, profilePicture: true }
        });
        res.json({ success: true, user });
    } catch (error) { next(error); }
});

// Update profile
router.put('/profile', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { name, phone, profilePicture } = req.body;
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (phone !== undefined) updateData.phone = phone;
        if (profilePicture !== undefined) updateData.profilePicture = profilePicture;

        const user = await prisma.user.update({
            where: { id: req.user!.id },
            data: updateData,
            select: { id: true, name: true, email: true, role: true, phone: true, profilePicture: true }
        });
        res.json({ success: true, user });
    } catch (error) { next(error); }
});

// Change password
router.post('/change-password', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) throw new AppError('Both passwords required', 400);
        if (newPassword.length < 6) throw new AppError('Password must be at least 6 characters', 400);

        const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
        if (!user) throw new AppError('User not found', 404);

        const valid = await bcrypt.compare(currentPassword, user.password);
        if (!valid) throw new AppError('Current password is incorrect', 401);

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({ where: { id: req.user!.id }, data: { password: hashedPassword } });

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) { next(error); }
});

export default router;

