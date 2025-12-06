const { verifyToken } = require('../utils/jwt');

function verifyTokenMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }
    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    if (!payload) {
        return res.status(401).json({ error: 'Invalid token' });
    }
    // Attach user info to request for downstream handlers
    req.user = payload;
    next();
}

module.exports = { verifyToken: verifyTokenMiddleware };
