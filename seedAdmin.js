// ─── Seed Default Admin ───────────────────────────────────────────────────────
const User = require('./models/User');

async function seedAdmin() {
    try {
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@careerconnect.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@2026';

        const existing = await User.findOne({ email: adminEmail });
        if (existing) {
            console.log(`🔑 Admin account exists: ${adminEmail}`);
            return;
        }

        await User.create({
            firstName: 'Admin',
            lastName: 'CareerConnect',
            email: adminEmail,
            password: adminPassword,
            role: 'admin',
            targetRole: 'Platform Administrator',
            isActive: true
        });

        console.log('🔑 Default admin created:');
        console.log(`   📧 Email:    ${adminEmail}`);
        console.log(`   🔐 Password: ${adminPassword}`);
        console.log('   ⚠️  Change these credentials in .env for production!');
    } catch (err) {
        console.error('❌ Failed to seed admin:', err.message);
    }
}

module.exports = seedAdmin;
