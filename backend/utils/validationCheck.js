const { validationResult } = require("express-validator");
const CustomError = require('../errors')

const checkValidation = (req) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                throw new CustomError.ValidationError(errors.array())
            }
            return true;
}

module.exports = {checkValidation};