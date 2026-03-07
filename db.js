// ─── Database Connection ──────────────────────────────────────────────────────
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/careerconnect';
        await mongoose.connect(uri);
        console.log('✅ MongoDB connected:', mongoose.connection.host);
    } catch (err) {
        console.error('❌ MongoDB connection failed:', err.message);
        // Don't crash the app — run without DB if unavailable
        console.warn('⚠️  Running without database. Auth features will be unavailable.');
    }
};

module.exports = connectDB;
