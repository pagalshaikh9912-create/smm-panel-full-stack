import { db } from '@/db';
import { services } from '@/db/schema';

async function main() {
    const sampleServices = [
        {
            name: 'Instagram Followers - High Quality',
            category: 'Instagram',
            type: 'Followers',
            description: 'Premium Instagram followers with high retention rate',
            rate: 2.50,
            minOrder: 100,
            maxOrder: 100000,
            providerId: 1,
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            name: 'Instagram Likes - Instant',
            category: 'Instagram',
            type: 'Likes',
            description: 'Instant Instagram likes delivery',
            rate: 1.50,
            minOrder: 50,
            maxOrder: 50000,
            providerId: 1,
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            name: 'Facebook Page Likes - Real',
            category: 'Facebook',
            type: 'Likes',
            description: 'Real Facebook page likes from active users',
            rate: 3.00,
            minOrder: 100,
            maxOrder: 50000,
            providerId: 1,
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            name: 'Twitter Followers - Organic',
            category: 'Twitter',
            type: 'Followers',
            description: 'Organic Twitter followers growth',
            rate: 4.00,
            minOrder: 100,
            maxOrder: 100000,
            providerId: 1,
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            name: 'YouTube Views - Fast',
            category: 'YouTube',
            type: 'Views',
            description: 'Fast YouTube video views delivery',
            rate: 1.00,
            minOrder: 1000,
            maxOrder: 1000000,
            providerId: 1,
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            name: 'TikTok Followers - Premium',
            category: 'TikTok',
            type: 'Followers',
            description: 'Premium TikTok followers service',
            rate: 3.50,
            minOrder: 100,
            maxOrder: 100000,
            providerId: 1,
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            name: 'TikTok Likes - Ultra Fast',
            category: 'TikTok',
            type: 'Likes',
            description: 'Ultra fast TikTok likes delivery',
            rate: 2.00,
            minOrder: 100,
            maxOrder: 50000,
            providerId: 1,
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }
    ];

    await db.insert(services).values(sampleServices);
    
    console.log('✅ Services seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});