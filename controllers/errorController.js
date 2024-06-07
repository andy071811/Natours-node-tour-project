const AppError = require("../utils/appError");

const handleCastErrorDB = (err) => {
    const message = `Invalid ${err.path}: ${err.value}.`;
    return new AppError(message, 400);
};

const handleDuplicateFieldsDB = err => {
    const value = err.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0];
    const message = `Duplicate field value: ${value}. Please use another name`;
    return new AppError(message, 400);
};

const handleValidationErrorDB = err => {
    const errors = Object.values(err.errors).map(element => element.message)
    const message = `Invalid data input: ${errors.join('. ')}.`;
    return new AppError(message, 400);
};

// const sendErrorDev = (err, req, res) => {

//     if (req.originalUrl.startsWith('/api')) {
//         // A - API
//         return res.status(err.statusCode).json({
//             status: err.status,
//             error: err,
//             message: err.message,
//             stack: err.stack
//         });
//     };

//     // B - RENDERED WEBSITE
//     console.error("ERROR", err);
//     return res.status(err.statusCode).render('error', {
//         title: 'Something went wrong',
//         msg: err.message
//     });
// };

// const sendErrorProd = (err, req, res) => {
//     // A - API:
//     if (req.originalUrl.startsWith('/api')) {
//     // Operational, trusted error: send message to the client
//         if (err.isOperational) {
//             return res.status(err.statusCode).json({
//                 status: err.status,
//                 message: err.message
//             });
//         }
//     // Programming or other unknown error: don't leak error details to the client:
//         // 1) Log error:
//         console.error("ERROR", err);

//         // 2) Send generic message:
//         return res.status(500).json({
//             status: 'error',
//             message: 'Something went wrong'
//         });
//     };

//     // B - rendered website:
//     if (err.isOperational) {
//         return res.status(err.statusCode).render({
//             title: 'Something went wrong!',
//             msg: err.message
//         });
//     };
//     // 1) Log Error:
//     console.error("ERROR", err);
//     // 2) Send generic message:
//     return res.status(500).json({
//         title: 'Something went wrong',
//         msg: 'Please try again later'
//     });
// };

// TEMP ERROR HANDLERS UNTIL BUG FIXED ABOVE:
const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  };
  
  const sendErrorProd = (err, res) => {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
  
      // Programming or other unknown error: don't leak error details
    } else {
      // 1) Log error
      console.error('ERROR 💥', err);
  
      // 2) Send generic message
      res.status(500).json({
        status: 'error',
        message: 'Something went very wrong!'
      });
    }
  };

const handleJWTError = () => new AppError("Invalid token, please log in again", 401);

const handleJWTExpiredError = () => new AppError("Your token has expired! Please log in again", 401);



// by having four arguments in this middleware, express knows to only call this function if there is an error:
module.exports = ((err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else if (process.env.NODE_ENV === 'production') {
        let error = { ...err };
        error.message = error.message;
        if (error.name === 'CastError') error = handleCastErrorDB(error);
        if (error.name === '11000') error = handleDuplicateFieldsDB(error);
        if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
        if (error.name === 'JsonWebTokenError') error = handleJWTError();
        if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

        sendErrorProd(error, res, req);
    };    
});