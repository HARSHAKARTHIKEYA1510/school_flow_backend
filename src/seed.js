const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // 0. Cleanup existing data
    console.log('Cleaning up database...');
    await prisma.attendance.deleteMany({});
    await prisma.timetable.deleteMany({});
    await prisma.student.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.subject.deleteMany({});

    // 1. Create subjects
    const subjectNames = ['ADA', 'AP', 'DBMS', 'MATHS'];
    const subjects = [];

    for (const name of subjectNames) {
        const subject = await prisma.subject.upsert({
            where: { name },
            update: {},
            create: { name, code: name },
        });
        subjects.push(subject);
    }
    console.log('Subjects created:', subjectNames);

    // 2. Create 10 Students
    const students = [];
    const passwordHash = await bcrypt.hash('password123', 10); // Default password for all

    for (let i = 1; i <= 10; i++) {
        const email = `student${i}@schoolflow.com`;
        const name = `Student ${i}`;
        const rollNumber = `ROLL${100 + i}`;

        // Create User
        const user = await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
                email,
                password: passwordHash,
                role: 'STUDENT',
            },
        });

        // Create Student Profile
        const student = await prisma.student.upsert({
            where: { email },
            update: {},
            create: {
                name,
                rollNumber,
                email,
                userId: user.id,
            },
        });

        students.push(student);
        console.log(`Created ${name} (${email})`);
    }

    // 3. Generate 20 days of attendance for each student in all subjects
    console.log('Generating attendance records...');

    const today = new Date();
    const attendanceData = [];

    for (let day = 0; day < 20; day++) {
        const date = new Date(today);
        date.setDate(date.getDate() - day); // Go back 'day' days

        for (const student of students) {
            for (const subject of subjects) {
                // Randomize status: 80% chance of being PRESENT
                const status = Math.random() > 0.2 ? 'PRESENT' : 'ABSENT';

                attendanceData.push({
                    studentId: student.id,
                    subjectId: subject.id,
                    date: date,
                    status: status,
                });
            }
        }
    }

    // Batch insert attendance (using createMany if available, or loop)
    // Prisma createMany is supported in Postgres
    await prisma.attendance.createMany({
        data: attendanceData,
        skipDuplicates: true, // Avoid crashing if run multiple times
    });

    console.log(`Seeding completed. Added ${attendanceData.length} attendance records.`);

    // 4. Create Timetable for weekdays (Monday-Friday)
    console.log('Creating timetable...');
    const timetableData = [
        // Monday (1)
        { dayOfWeek: 1, startTime: '9:00 AM', endTime: '10:00 AM', subjectId: subjects[0].id, room: 'Room 101' },
        { dayOfWeek: 1, startTime: '10:15 AM', endTime: '11:15 AM', subjectId: subjects[1].id, room: 'Room 102' },
        { dayOfWeek: 1, startTime: '11:30 AM', endTime: '12:30 PM', subjectId: subjects[2].id, room: 'Room 103' },

        // Tuesday (2)
        { dayOfWeek: 2, startTime: '9:00 AM', endTime: '10:00 AM', subjectId: subjects[1].id, room: 'Room 102' },
        { dayOfWeek: 2, startTime: '10:15 AM', endTime: '11:15 AM', subjectId: subjects[3].id, room: 'Room 104' },
        { dayOfWeek: 2, startTime: '11:30 AM', endTime: '12:30 PM', subjectId: subjects[0].id, room: 'Room 101' },

        // Wednesday (3)
        { dayOfWeek: 3, startTime: '9:00 AM', endTime: '10:00 AM', subjectId: subjects[2].id, room: 'Room 103' },
        { dayOfWeek: 3, startTime: '10:15 AM', endTime: '11:15 AM', subjectId: subjects[0].id, room: 'Room 101' },
        { dayOfWeek: 3, startTime: '11:30 AM', endTime: '12:30 PM', subjectId: subjects[1].id, room: 'Room 102' },
        { dayOfWeek: 3, startTime: '2:00 PM', endTime: '3:00 PM', subjectId: subjects[3].id, room: 'Room 104' },

        // Thursday (4)
        { dayOfWeek: 4, startTime: '9:00 AM', endTime: '10:00 AM', subjectId: subjects[3].id, room: 'Room 104' },
        { dayOfWeek: 4, startTime: '10:15 AM', endTime: '11:15 AM', subjectId: subjects[2].id, room: 'Room 103' },
        { dayOfWeek: 4, startTime: '11:30 AM', endTime: '12:30 PM', subjectId: subjects[0].id, room: 'Room 101' },

        // Friday (5)
        { dayOfWeek: 5, startTime: '9:00 AM', endTime: '10:00 AM', subjectId: subjects[0].id, room: 'Room 101' },
        { dayOfWeek: 5, startTime: '10:15 AM', endTime: '11:15 AM', subjectId: subjects[1].id, room: 'Room 102' },
        { dayOfWeek: 5, startTime: '11:30 AM', endTime: '12:30 PM', subjectId: subjects[3].id, room: 'Room 104' },
    ];

    await prisma.timetable.createMany({
        data: timetableData,
        skipDuplicates: true,
    });

    console.log(`Added ${timetableData.length} timetable entries.`);
    console.log('Default student password: password123');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
