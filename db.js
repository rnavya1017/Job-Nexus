// ─── Database Connection ──────────────────────────────────────────────────────
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/careerconnect';
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 10000, // 10s timeout (don't hang forever on deploy)
        });
        console.log('✅ MongoDB connected:', mongoose.connection.host);
        return true;
    } catch (err) {
        console.error('❌ MongoDB connection failed:', err.message);
        console.warn('⚠️  Running without database. Auth features will be unavailable.');
        return false;
    }
};

const isDBConnected = () => mongoose.connection.readyState === 1;

module.exports = { connectDB, isDBConnected };

