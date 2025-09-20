const jwt = require('jsonwebtoken')
require('dotenv').config();

const createJWT = ({payload}, expiration= process.env.JWT_LIFETIME)=>{
    const token = jwt.sign(payload,process.env.JWT_SECRET,{
        expiresIn: expiration,
    })
    return token
}


const isTokenValid = ({ token }) => {
    return jwt.verify(token, process.env.JWT_SECRET);
}

const attachCookiesToResponse = ({ res, user }) => {
    const token = createJWT({ payload: user });

    res.cookie('Token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' ,
        sameSite: 'none',
        maxAge: 24 * 60 * 60 * 1000,  // 24h expiration
        domain: process.env.NODE_ENV === 'production'?'baby-tracker.koyeb.app':'localhost',
        path: '/',
        signed: true
    });

    return token;
};

module.exports = {createJWT, isTokenValid, attachCookiesToResponse}