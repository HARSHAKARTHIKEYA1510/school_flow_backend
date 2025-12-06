const { Router } = require('express');
const prisma = require('../prisma');
const bcrypt = require('bcryptjs');
const { signToken } = require('../utils/jwt');

const router = Router();

// Hard‑coded admin credentials (for demo only)
const ADMIN_EMAIL = 'admin@schoolflow.com';
const ADMIN_PASSWORD = 'admin123';

router.post('/login', async (req, res) => {
    let { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    email = email.trim();
    password = password.trim();

    // Admin login shortcut
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        const token = signToken({ userId: 'admin', role: 'ADMIN' });
        return res.json({ token, role: 'ADMIN' });
    }

    try {
        console.log('Login attempt for:', email);
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            console.log('User not found in DB');
            return res.status(401).json({ error: 'DEBUG: User not found in database' });
        }
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = signToken({ userId: user.id, role: user.role });
        return res.json({ token, role: user.role });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
