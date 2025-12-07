const { Router } = require('express');
const prisma = require('../prisma');
const bcrypt = require('bcryptjs');

const router = Router();

// Middleware to ensure ADMIN role
function adminOnly(req, res, next) {
    const user = req.user;
    if (user && user.role === 'ADMIN') {
        return next();
    }
    return res.status(403).json({ error: 'Forbidden: admin only' });
}

// Create a new student (admin only)
router.post('/students', adminOnly, async (req, res) => {
    const { name, email, rollNumber } = req.body;
    if (!name || !email || !rollNumber) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    // Generate a random password for the student
    const rawPassword = Math.random().toString(36).slice(-8);
    const hashed = await bcrypt.hash(rawPassword, 10);
    try {
        const user = await prisma.user.create({
            data: {
                email,
                password: hashed,
                role: 'STUDENT',
            },
        });
        const student = await prisma.student.create({
            data: {
                name,
                rollNumber,
                email,
                userId: user.id,
            },
        });
        return res.json({ student, password: rawPassword });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// List all students (admin only)
// List all students (admin only)
router.get('/students', adminOnly, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 6; // Default to 6 per page
        const skip = (page - 1) * limit;

        const [students, total] = await Promise.all([
            prisma.student.findMany({
                skip,
                take: limit,
                orderBy: { name: 'asc' }, // Sort by name A-Z
                include: { user: true },
            }),
            prisma.student.count()
        ]);

        return res.json({
            students,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// Record attendance (admin only)
router.post('/attendance', adminOnly, async (req, res) => {
    const { studentId, subjectId, date, status } = req.body;
    if (!studentId || !subjectId || !date || !status) {
        return res.status(400).json({ error: 'Missing fields' });
    }
    try {
        // Check limit: Max 4 records per subject per day
        const recordDate = new Date(date);
        const startOfDay = new Date(recordDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(recordDate);
        endOfDay.setHours(23, 59, 59, 999);

        const count = await prisma.attendance.count({
            where: {
                studentId,
                subjectId,
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        });

        if (count >= 4) {
            return res.status(400).json({ error: 'Maximum 4 attendance records allowed per subject per day' });
        }

        const attendance = await prisma.attendance.create({
            data: {
                studentId,
                subjectId,
                date: new Date(date),
                status,
            },
        });
        return res.json(attendance);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// Get attendance for a specific student (admin only)
router.get('/attendance/:studentId', adminOnly, async (req, res) => {
    const { studentId } = req.params;
    try {
        const records = await prisma.attendance.findMany({
            where: { studentId },
            include: { subject: true },
        });
        return res.json(records);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// Get all subjects (admin only)
router.get('/subjects', adminOnly, async (req, res) => {
    try {
        const subjects = await prisma.subject.findMany();
        return res.json(subjects);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// Update student (admin only)
router.put('/students/:id', adminOnly, async (req, res) => {
    const { id } = req.params;
    const { name, email, rollNumber } = req.body;

    try {
        // First check if student exists
        const existingStudent = await prisma.student.findUnique({
            where: { id },
            include: { user: true }
        });

        if (!existingStudent) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Check if email is being changed and if it's already taken by another user
        if (email && email !== existingStudent.email) {
            const emailExists = await prisma.user.findUnique({
                where: { email }
            });
            if (emailExists && emailExists.id !== existingStudent.userId) {
                return res.status(400).json({ error: 'Email already in use' });
            }
        }

        // Check if rollNumber is being changed and if it's already taken
        if (rollNumber && rollNumber !== existingStudent.rollNumber) {
            const rollExists = await prisma.student.findUnique({
                where: { rollNumber }
            });
            if (rollExists && rollExists.id !== id) {
                return res.status(400).json({ error: 'Roll number already in use' });
            }
        }

        // Update student
        const student = await prisma.student.update({
            where: { id },
            data: {
                name,
                email,
                rollNumber,
            },
        });

        // If email changed, update user email as well
        if (email && email !== existingStudent.email) {
            await prisma.user.update({
                where: { id: existingStudent.userId },
                data: { email },
            });
        }

        return res.json(student);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// Delete student (admin only) - will cascade delete user and attendance
router.delete('/students/:id', adminOnly, async (req, res) => {
    const { id } = req.params;

    try {
        const student = await prisma.student.findUnique({
            where: { id },
        });

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Delete student (cascade will handle user and attendance deletion)
        await prisma.student.delete({
            where: { id },
        });

        return res.json({ message: 'Student deleted successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// Get all attendance records (admin only)
// Get all attendance records (admin only)
router.get('/attendance', adminOnly, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 6; // Default to 6 per page
        const skip = (page - 1) * limit;

        const [records, total] = await Promise.all([
            prisma.attendance.findMany({
                skip,
                take: limit,
                include: {
                    student: true,
                    subject: true
                },
                orderBy: { date: 'desc' }
            }),
            prisma.attendance.count()
        ]);

        return res.json({
            records,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// Update attendance record (admin only)
router.put('/attendance/:id', adminOnly, async (req, res) => {
    const { id } = req.params;
    const { studentId, subjectId, date, status } = req.body;

    try {
        const existingRecord = await prisma.attendance.findUnique({ where: { id } });
        if (!existingRecord) {
            return res.status(404).json({ error: 'Record not found' });
        }

        const targetStudentId = studentId || existingRecord.studentId;
        const targetSubjectId = subjectId || existingRecord.subjectId;
        const targetDateStr = date || existingRecord.date;
        const targetDate = new Date(targetDateStr);

        // Check limit: Max 4 records per subject per day
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        const count = await prisma.attendance.count({
            where: {
                studentId: targetStudentId,
                subjectId: targetSubjectId,
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                NOT: { id } // Exclude current record
            }
        });

        if (count >= 4) {
            return res.status(400).json({ error: 'Maximum 4 attendance records allowed per subject per day' });
        }

        // Check for exact duplicates
        const duplicate = await prisma.attendance.findFirst({
            where: {
                studentId: targetStudentId,
                subjectId: targetSubjectId,
                date: targetDate,
                NOT: { id }
            }
        });

        if (duplicate) {
            return res.status(400).json({
                error: 'An attendance record already exists for this student, subject, and date'
            });
        }

        const attendance = await prisma.attendance.update({
            where: { id },
            data: {
                studentId,
                subjectId,
                date: date ? new Date(date) : undefined,
                status,
            },
            include: {
                student: true,
                subject: true
            }
        });
        return res.json(attendance);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// Delete attendance record (admin only)
router.delete('/attendance/:id', adminOnly, async (req, res) => {
    const { id } = req.params;

    try {
        await prisma.attendance.delete({
            where: { id },
        });
        return res.json({ message: 'Attendance record deleted successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
