import { db } from '@/db';
import { users } from '@/db/schema';
import bcrypt from 'bcrypt';

async function main() {
    // Hash passwords before inserting
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const userPasswordHash = await bcrypt.hash('password123', 10);

    const sampleUsers = [
        {
            email: 'pagalmafia05@gmail.com',
            password: adminPasswordHash,
            name: 'Admin',
            role: 'ADMIN',
            balance: 10000.00,
            apiKey: null,
            status: 'ACTIVE',
            createdAt: new Date('2024-01-01').toISOString(),
            updatedAt: new Date('2024-01-01').toISOString(),
        },
        {
            email: 'sarah.williams@example.com',
            password: userPasswordHash,
            name: 'Sarah Williams',
            role: 'USER',
            balance: 450.75,
            apiKey: null,
            status: 'ACTIVE',
            createdAt: new Date('2024-01-05').toISOString(),
            updatedAt: new Date('2024-01-05').toISOString(),
        },
        {
            email: 'michael.chen@example.com',
            password: userPasswordHash,
            name: 'Michael Chen',
            role: 'USER',
            balance: 820.50,
            apiKey: null,
            status: 'ACTIVE',
            createdAt: new Date('2024-01-10').toISOString(),
            updatedAt: new Date('2024-01-10').toISOString(),
        },
        {
            email: 'emily.rodriguez@example.com',
            password: userPasswordHash,
            name: 'Emily Rodriguez',
            role: 'USER',
            balance: 275.00,
            apiKey: null,
            status: 'ACTIVE',
            createdAt: new Date('2024-01-15').toISOString(),
            updatedAt: new Date('2024-01-15').toISOString(),
        },
        {
            email: 'david.patel@example.com',
            password: userPasswordHash,
            name: 'David Patel',
            role: 'USER',
            balance: 150.25,
            apiKey: null,
            status: 'SUSPENDED',
            createdAt: new Date('2024-01-20').toISOString(),
            updatedAt: new Date('2024-01-20').toISOString(),
        },
        {
            email: 'jessica.thompson@example.com',
            password: userPasswordHash,
            name: 'Jessica Thompson',
            role: 'USER',
            balance: 95.00,
            apiKey: null,
            status: 'BANNED',
            createdAt: new Date('2024-01-25').toISOString(),
            updatedAt: new Date('2024-01-25').toISOString(),
        },
    ];

    await db.insert(users).values(sampleUsers);
    
    console.log('✅ Users seeder completed successfully');
    console.log('Admin account created:');
    console.log('  Email: pagalmafia05@gmail.com');
    console.log('  Password: admin123');
    console.log('  Role: ADMIN');
    console.log('  Balance: $10,000.00');
    console.log('');
    console.log('Regular users created: 5');
    console.log('  All passwords: password123');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
    process.exit(1);
});