const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('./../utils/appError');
const { promisify } = require('util');
const crypto = require('crypto');
// JSON web token package (JWTs are decodable and sensitive information should NOT be stored in them):
const jwt = require('jsonwebtoken');
const Email = require('../utils/email');

const signInToken = id => {
    return jwt.sign(/* PAYLOAD */{ id }, /* SECRET */process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
};

// creating cookie options:
const cookieOptions = {
    /*this is when the cookie will expire*/ expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
    /*this option makes sure the cookie is sent over a https connection*/ /* secure: true, */
    /*this option makes sure the cookie can't be altered by the browser*/ httpOnly: true
};


const createSendToken = (user, statusCode, res) => {
    // creating a token to log in a new user:
    const token = signInToken(user._id);

    // sending a cookie
    if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
    res.cookie('jwt', token, cookieOptions);

    // remove the password from the output:
    user.password = undefined;

    res.status(statusCode).json({
        status: 'success',
        /* sending token to the client */ token,
        data: {
            user
        }
    });
};

exports.signUp = catchAsync(async (req, res, next) => {
    // code below prevent just anyone signing up as an admin:
    const newUser = await User.create(req.body);
    const url = `${req.protocol}://${req.get('host')}/me`;
    

    await new Email(newUser, url).sendWelcome();

    createSendToken(newUser, 201, res);
});

exports.logIn = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    // 1 - CHECK IF EMAIL AND PASSWORD EXIST:
    if (!email || !password) {
        return next(new AppError('Please provide valid email and password, or sign up.', 400))
    };

    // 2 - CHECK IF EMAIL EXISTS AND PASSWORD IS CORRECT:
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError("Please check user name or password", 401));
    }

    // 3 - IF EVERYTHING OK, SEND TOKEN TO CLIENT:
    createSendToken(user, 200, res);
});

exports.logOut = (req, res) => {
    res.cookie('jwt', 'Logged out', {
        httpOnly: true,
        expires: new Date(Date.now() + 10 * 1000)
    });
    res.status(200).json({ status: 'success' })
}

exports.protect = catchAsync(async (req, res, next) => {

    // 1 - get token and check if it's there:
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    };

    if (req.cookies.jwt) {
        token = req.cookies.jwt;
    } else if (!token) {
        return next(new AppError("You are not logged in, please log in to get access", 401));
    };

    // 2 - verification token:
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3 - check if user still exists:
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
        return next(new AppError("The user does no longer exist", 401));
    };

    // 4 - check if user changed password after token was issued:
    if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next(new AppError("User recently changed password, please log in again!", 401));
    }
    // 5 - only after the first four steps are confirmed will next be called (grants access to the protected route):
    req.user = currentUser;
    res.locals.user = currentUser;
    next();
});

// Only for rendered pages, no errors:
exports.isLoggedIn = async (req, res, next) => {
// if there is no cookie, next will be called and will move straight onto the next middleware....

    // 1 - using the cookie
    if (req.cookies.jwt) {

        try {
            // 2 - verifies token:
            const decoded = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET);

            // 3 - check if user still exists:
            const currentUser = await User.findById(decoded.id);
            if (!currentUser) {
                return next();
            };

            // 4 - check if user changed password after token was issued:
            if (currentUser.changedPasswordAfter(decoded.iat)) {
                return next();
            }
            // 5 - THERE IS A LOGGED IN USER:
            res.locals.user = currentUser; // this enables pug to have access to the logged in user
            return next();
        } catch(err) {
            return next();
        };
    };

    next();

};

exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        // roles = ['admin', 'lead-guide']. role='user'
        if (!roles.includes(req.user.role)) {
            return next(new AppError("You do not have permission to perform this action", 403));
        };

        next();
    };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {

    // 1 - find user based on POSTed email:
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
        return next(new AppError("No user with that email", 404));
    };

    // 2 - generate the random reset token:
    const resetToken = user.generatePasswordResetToken();
    await user.save({ validateBeforeSave: false }); // validateBeforeSave ignores all the validation from the schema

    // 3 - send it to users email:
        try {

        const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetpassword/${resetToken}`;
        await new Email(user, resetURL).sendPasswordReset();
    
        res.status(200).json({
            status: "success",
            message: "Token sent to email"
        });
    } catch(err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpire = undefined;
        await user.save({ validateBeforeSave: false });

        return next(new AppError("There was an error sending the email, try again later", 500));
    };
});

exports.resetPassword = catchAsync(async (req, res, next) => {

    // 1 - get user based on token:
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({ passwordResetToken: hashedToken, passwordResetExpire: {$gt: Date.now()} })

    // 2 - if token has not expired and there is a user, set the new password:
    if (!user) {
        return next(new AppError("Token is invalid or has expired", 400));
    };

    user.password = req.body.password;
    user.confirmPassword = req.body.confirmPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpire = undefined;
    await user.save();

    // 3 - update changePasswordAt property for the user:

    // 4 - log the user in:
    createSendToken(user, 200, res);
});

// updating a password from a logged in user:
exports.updatePassword = catchAsync(async (req, res, next) => {
    // always ask for the current password from the logged in user before resetting password

    // 1 - get user from the collection:
    const user = await User.findById(req.user.id).select('+password');

    // 2 - check if the current password is correct (if not, create error):
    if (!(await user.correctPassword(req.body.currentPassword, user.password))) return next(new AppError("Please check password and try again", 400));

    // 3 - if correct, update password:
    user.password = req.body.password;
    user.confirmPassword = req.body.confirmPassword;
    await user.save();
    // user.findById will not work as intended due to middleware and 'this' on schema!

    // 4 - log the user in with new password:
    createSendToken(user, 200, res);
});