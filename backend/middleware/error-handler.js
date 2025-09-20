const { StatusCodes } = require('http-status-codes');
require('dotenv').config() 


const errorHandlerMiddleware = (err, req, res, next) => {
  let customError = {
    // set default
    statusCode: err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
    msg: err.message || 'Something went wrong try again later',
  };

  // MongoDB Errors
  if (err.name === 'ValidationError') {
    customError.msg = Object.values(err.errors)
      .map((item) => item.message)
      .join(',');
    customError.statusCode = 400;
  }
  if (err.code && err.code === 11000) {
    customError.msg = `Duplicate value entered for ${Object.keys(
      err.keyValue
    )} field, please choose another value`;
    customError.statusCode = 400;
  }
  if (err.name === 'CastError') {
    customError.msg = `No item found with id : ${err.value}`;
    customError.statusCode = 404;
  }

  // PostgreSQL Errors
  if (err.code === '23505') { // Unique violation
    const field = err.detail.match(/\((.*?)\)/)[1];
    customError.msg = `Duplicate value entered for ${field} field, please choose another value`;
    customError.statusCode = 400;
  }
  
  if (err.code === '23502') { // Not null violation
    customError.msg = `Missing required field: ${err.column}`;
    customError.statusCode = 400;
  }
  
  if (err.code === '22P02') { // Invalid text representation
    customError.msg = `Invalid type for parameter: ${err.where}`;
    customError.statusCode = 400;
  }
  
  if (err.code === '23503') { // Foreign key violation
    customError.msg = `Referenced record not found: ${err.detail}`;
    customError.statusCode = 404;
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    customError.msg = 'Invalid token, please login again';
    customError.statusCode = 401;
  }
  
  if (err.name === 'TokenExpiredError') {
    customError.msg = 'Token expired, please login again';
    customError.statusCode = 401;
  }

  // Rate Limiting
  if (err.statusCode === 429) {
    customError.msg = 'Too many requests, please try again later';
  }

   // Development vs Production logging
  if (process.env.NODE_ENV === 'development') {
    console.error('Error Stack:', err.stack);
    customError.stack = err.stack;
  }


  return res.status(customError.statusCode).json({ success: false, msg: customError.msg });
};

module.exports = errorHandlerMiddleware;
