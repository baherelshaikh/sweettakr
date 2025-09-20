const { StatusCodes } = require('http-status-codes');
const CustomAPIError = require('./custom-api');

class ValidationError extends CustomAPIError {
  constructor(errors) {
      const errorMessage  = errors
        .map(err => err.msg)
        .join(', ');   
        super(errorMessage );
      
      this.statusCode = StatusCodes.BAD_REQUEST;
      this.errors = errors
  }
}

module.exports = ValidationError;
