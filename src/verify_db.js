const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
    try {
        const userCount = await prisma.user.count();
        const studentCount = await prisma.student.count();
        const subjectCount = await prisma.subject.count();
        const attendanceCount = await prisma.attendance.count();

        console.log('--- Database Verification ---');
        console.log(`Users: ${userCount}`);
        console.log(`Students: ${studentCount}`);
        console.log(`Subjects: ${subjectCount}`);
        console.log(`Attendance Records: ${attendanceCount}`);

        if (studentCount > 0) {
            const firstStudent = await prisma.student.findFirst({
                include: { user: true }
            });
            console.log('Sample Student:', firstStudent);
        }
    } catch (e) {
        console.error('Error connecting to database:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
