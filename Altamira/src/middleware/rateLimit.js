const rateLimit = require('express-rate-limit');

// Limiter for public form submissions: max 4 requests per hour per IP
const publicContactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 4 requests per windowMs
    message: {
        message: 'Demasiados intentos. Por favor, inténtelo de nuevo más tarde.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

module.exports = { publicContactLimiter };
