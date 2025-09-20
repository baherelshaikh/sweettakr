const {jwtHandling} = require('./jwtHandling')
const {createJWT, isTokenValid, attachCookiesToResponse} = require('./jwt.js')
const {checkPermissions} = require('./checkpermissions.js')
// const {upload} = require('./Multer.js')
const {checkValidation} = require('./validationCheck.js')

module.exports = {
    jwtHandling,
    createJWT, 
    isTokenValid,
    attachCookiesToResponse,
    checkPermissions,
    checkValidation,
    // upload,
}