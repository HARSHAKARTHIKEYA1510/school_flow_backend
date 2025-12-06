const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function cleanup() {
    console.log('Cleaning up old subjects...');

    try {
        // Delete old subjects
        const deletedAQDA = await prisma.subject.deleteMany({
            where: {
                name: { in: ['AQDA', 'WAP'] }
            }
        });

        console.log(`Deleted ${deletedAQDA.count} old subject entries (AQDA, WAP)`);
        console.log('Cleanup completed successfully!');
    } catch (error) {
        console.error('Error during cleanup:', error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanup();
