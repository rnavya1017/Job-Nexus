// ─── Auth Routes ──────────────────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken, protect } = require('../middleware/auth');

// ─── POST /api/auth/signup ────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
    try {
        const { firstName, lastName, email, password, targetRole } = req.body;

        // Validation
        if (!firstName || !email || !password) {
            return res.status(400).json({ error: 'First name, email, and password are required.' });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters.' });
        }

        // Check duplicate email
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(409).json({ error: 'Email already registered. Please sign in.' });
        }

        // Create user (password is hashed by pre-save hook)
        const user = await User.create({
            firstName,
            lastName: lastName || '',
            email: email.toLowerCase(),
            password,
            targetRole: targetRole || '',
            role: 'user'  // regular users — admins are seeded or promoted
        });

        // Generate token
        const token = generateToken(user._id);

        // Update lastLogin
        user.lastLogin = new Date();
        await user.save();

        res.status(201).json({
            message: 'Account created successfully!',
            token,
            user: user.toSafeObject()
        });
    } catch (err) {
        console.error('Signup error:', err.message);
        if (err.code === 11000) {
            return res.status(409).json({ error: 'Email already registered.' });
        }
        res.status(500).json({ error: 'Server error. Please try again.' });
    }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials. Please sign up first.' });
        }

        // Check if active
        if (!user.isActive) {
            return res.status(403).json({ error: 'Account deactivated. Contact admin.' });
        }

        // Compare password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials. Wrong password.' });
        }

        // Generate token
        const token = generateToken(user._id);

        // Update lastLogin
        user.lastLogin = new Date();
        await user.save();

        res.json({
            message: `Welcome back, ${user.firstName}!`,
            token,
            user: user.toSafeObject()
        });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ error: 'Server error. Please try again.' });
    }
});

// ─── GET /api/auth/me — get current user profile ─────────────────────────────
router.get('/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ error: 'User not found.' });
        res.json({ user: user.toSafeObject() });
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
