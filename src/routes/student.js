const { Router } = require('express');
const prisma = require('../prisma');

const router = Router();

// Middleware to ensure STUDENT role
function studentOnly(req, res, next) {
    const user = req.user;
    if (user && user.role === 'STUDENT') {
        return next();
    }
    return res.status(403).json({ error: 'Forbidden: students only' });
}

// Get my attendance
router.get('/attendance', studentOnly, async (req, res) => {
    const userId = req.user.userId;
    try {
        // Find student record for this user
        const student = await prisma.student.findUnique({
            where: { userId },
        });

        if (!student) {
            return res.status(404).json({ error: 'Student profile not found' });
        }

        const records = await prisma.attendance.findMany({
            where: { studentId: student.id },
            include: { subject: true },
            orderBy: { date: 'desc' }, // Sort by date descending (present to past)
        });

        return res.json({ student, records });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// Get today's timetable
router.get('/timetable', studentOnly, async (req, res) => {
    try {
        const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

        const schedule = await prisma.timetable.findMany({
            where: { dayOfWeek: today },
            include: { subject: true },
            orderBy: { startTime: 'asc' },
        });

        return res.json(schedule);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
