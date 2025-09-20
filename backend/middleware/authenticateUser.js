const customError = require('../errors')
const {isTokenValid, jwtHandling, attachCookiesToResponse} = require("../utils");
require('dotenv').config() 


const authenticateUser = (req, res, next) => {
    // 1. Determine authentication method
    let token;
    const authHeader = req.headers.authorization;
    const userAgent = req.headers['user-agent'] ;
    
    // Check for Flutter request (Bearer token)
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split('"')[1];
    } 
    // Fallback to cookie for web
    else {
        token = req.signedCookies.Token;
        // token = req.cookies.Token; we use this if we do not use signed when creating cookies
    }

    if (!token) {
        throw new customError.UnauthenticatedError('Authentication invalid')
    }

    try {
        // 2. Validate token (using your existing isTokenValid utility)
        const { name, user_id, profile_picture } = isTokenValid({ token });

        // 3. Attach user to request
        req.user = { name, user_id, profile_picture };
        
        // 4. Token rotation for web 
        if (!authHeader && req.signedCookies.Token) {
            const newToken = generateNewToken(req.user, res); 
            res.cookie('Token', newToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production' ,
                sameSite: 'none',
                maxAge: 24 * 60 * 60 * 1000,  // 24h expiration
                domain: process.env.NODE_ENV === 'production'?'baby-tracker.koyeb.app':'localhost',
                path: '/',
                signed: true
            });
        }
        
        next();
    } catch (error) {
        console.log(error)

        // Handle token expiration differently for Flutter
        if (error.name === 'TokenExpiredError' && authHeader) {
        throw new customError.UnauthenticatedError('Token expired. Please refresh')
        }
        throw new customError.UnauthenticatedError('Authentication invalid')
    }
}

// Your existing permission middleware stays the same
const authorizePermissions = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
        throw new customError.UnauthorizedError('Unauthorized to access this route')
        }
        next()
    }
}

function generateNewToken(user, res) {
    const readyUser = jwtHandling(user);
    const Token = attachCookiesToResponse({ res, user: readyUser });

    return Token;
}

module.exports = { authenticateUser, authorizePermissions }