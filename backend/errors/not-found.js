const { StatusCodes } = require('http-status-codes');
const CustomAPIError = require('./custom-api');

class NotFoundError extends CustomAPIError {
  constructor(message) {
    super(message);
    this.statusCode = StatusCodes.OK; // the status code for the empty result is ok (the common choice)
  }
}

module.exports = NotFoundError;
