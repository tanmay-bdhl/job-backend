const jwt = require('jsonwebtoken');

exports.authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log('[AUTH][MIDDLEWARE][REQ]', {
    hasAuthHeader: Boolean(authHeader),
    ip: req.ip,
    path: req.originalUrl,
    method: req.method,
    time: new Date().toISOString(),
  });
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    console.log('[AUTH][MIDDLEWARE][OK]', { userId: decoded?.id, path: req.originalUrl });
    next();
  } catch (err) {
    console.error('[AUTH][MIDDLEWARE][ERR]', { message: err.message, stack: err.stack });
    return res.status(401).json({ message: 'Invalid token' });
  }
}; 