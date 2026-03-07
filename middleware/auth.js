// ─── Auth Middleware ──────────────────────────────────────────────────────────
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'careerconnect-super-secret-key-change-in-production-2026';
const JWT_EXPIRES_IN = '30d'; // tokens valid for 30 days

// ─── Generate JWT ─────────────────────────────────────────────────────────────
function generateToken(userId) {
    return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// ─── Verify JWT & attach user to req ──────────────────────────────────────────
async function protect(req, res, next) {
    try {
        let token = null;

        // Check Authorization header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ error: 'Not authenticated. Please sign in.' });
        }

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Find user
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return res.status(401).json({ error: 'User no longer exists.' });
        }
        if (!user.isActive) {
            return res.status(403).json({ error: 'Account has been deactivated. Contact admin.' });
        }

        req.user = user;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Session expired. Please sign in again.' });
        }
        return res.status(401).json({ error: 'Invalid authentication token.' });
    }
}

// ─── Admin-only guard (use AFTER protect) ─────────────────────────────────────
function adminOnly(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }
    next();
}

module.exports = { generateToken, protect, adminOnly, JWT_SECRET };
