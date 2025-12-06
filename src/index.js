const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');
const studentRouter = require('./routes/student');
const { verifyToken } = require('./middleware/rbac');

console.log('Starting SchoolFlow Backend...');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors());
app.use(express.json());

// Public routes
app.use('/api/auth', authRouter);

// Protected routes
app.use('/api/admin', verifyToken, adminRouter);
app.use('/api/student', verifyToken, studentRouter);

app.get('/', (req, res) => {
    res.send('SchoolFlow backend is running');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
