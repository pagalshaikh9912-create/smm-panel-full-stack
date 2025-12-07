import { db } from '@/db';
import { providers } from '@/db/schema';

async function main() {
    const sampleProviders = [
        {
            name: 'SMM Provider API',
            apiUrl: 'https://api.smmexample.com/v2',
            apiKey: 'sample_api_key_123',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }
    ];

    await db.insert(providers).values(sampleProviders);
    
    console.log('✅ Providers seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});