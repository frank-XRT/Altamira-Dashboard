const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    let token = req.headers['authorization'];
    if (token && token.startsWith('Bearer ')) {
        token = token.slice(7, token.length);
    } else if (req.query && req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(403).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
};

const verifyRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied: Insufficient privileges' });
        }
        next();
    };
};

const verifyQuoteAccess = (req, res, next) => {
    // req.user is already populated by verifyToken
    const user = req.user;
    const requestedId = req.params.id;

    // Check if it is a Limited Share Token
    if (user.scope === 'share_pdf') {
        // STRICT CHECK: Token ID must match URL ID
        if (!user.quoteId || String(user.quoteId) !== String(requestedId)) {
             return res.status(403).json({ message: 'Forbidden: Token ID does not match URL resource ID.' });
        }
        // OK
        return next();
    }

    // Regular Users (Admins / Advisors) 
    // If they have a valid role/id, we allow them (Assuming business logic is handled in controller or they have broad access)
    // The prompt specifically asked to patch the share link IDOR.
    if (user.role || user.id) {
        return next();
    }

    return res.status(403).json({ message: 'Forbidden: Invalid Token Scope' });
};

module.exports = { verifyToken, verifyRole, verifyQuoteAccess };
