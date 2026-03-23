// ─── Admin Routes ─────────────────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

// All admin routes require authentication + admin role
router.use(protect, adminOnly);

// ─── GET /api/admin/users — list all users ────────────────────────────────────
router.get('/users', async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', role = '' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build query
        const query = {};
        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        if (role && ['user', 'admin'].includes(role)) {
            query.role = role;
        }

        const [users, total] = await Promise.all([
            User.find(query)
                .select('-password')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            User.countDocuments(query)
        ]);

        res.json({
            users,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        });
    } catch (err) {
        console.error('Admin users error:', err.message);
        res.status(500).json({ error: 'Failed to fetch users.' });
    }
});

// ─── GET /api/admin/stats — dashboard stats ──────────────────────────────────
router.get('/stats', async (req, res) => {
    try {
        const [totalUsers, totalAdmins, activeUsers, recentUsers] = await Promise.all([
            User.countDocuments({ role: 'user' }),
            User.countDocuments({ role: 'admin' }),
            User.countDocuments({ isActive: true }),
            User.countDocuments({
                createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            })
        ]);

        // Users by month (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlySignups = await User.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        res.json({
            totalUsers,
            totalAdmins,
            activeUsers,
            recentUsers,
            monthlySignups
        });
    } catch (err) {
        console.error('Admin stats error:', err.message);
        res.status(500).json({ error: 'Failed to fetch stats.' });
    }
});

// ─── GET /api/admin/users/:id — get single user ──────────────────────────────
router.get('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found.' });
        res.json({ user });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch user.' });
    }
});

// ─── PUT /api/admin/users/:id — update user (role, status) ───────────────────
router.put('/users/:id', async (req, res) => {
    try {
        const { role, isActive } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found.' });

        // Prevent admin from demoting themselves
        if (user._id.toString() === req.user._id.toString() && role === 'user') {
            return res.status(400).json({ error: 'Cannot demote yourself from admin.' });
        }

        if (role === 'admin' && req.user.email !== 'admin@career') {
            return res.status(403).json({ error: 'Action strictly reserved for the Master Admin (admin@career).' });
        }

        if (role && ['user', 'admin'].includes(role)) user.role = role;
        if (typeof isActive === 'boolean') user.isActive = isActive;

        await user.save();
        res.json({ message: 'User updated.', user: user.toSafeObject() });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update user.' });
    }
});

// ─── DELETE /api/admin/users/:id — delete user ───────────────────────────────
router.delete('/users/:id', async (req, res) => {
    try {
        // Prevent admin from deleting themselves
        if (req.params.id === req.user._id.toString()) {
            return res.status(400).json({ error: 'Cannot delete your own admin account.' });
        }

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found.' });

        if (user.email === 'admin@career') {
            return res.status(403).json({ error: 'The Master Admin account cannot be deleted.' });
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: `User ${user.email} deleted permanently.` });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete user.' });
    }
});

module.exports = router;
