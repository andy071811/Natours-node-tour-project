const mongoose = require('mongoose');
const validator = require('validator');
const crypto = require('crypto');
// password encryption package:
const bcrypt = require('bcryptjs');


const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name must be filled out']
    },
    email: {
        type: String,
        required: [true, 'You must have a valid email address'],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'Please use a valid email']
    },
    photo: {
        type: String,
        default: 'default.jpg'
    },
    role: {
        type: String,
        enum: ['user', 'guide', 'lead-guide', 'admin'],
        default: 'user'
    },
    password: {
        type: String,
        required: [true, 'Please enter a valid password'],
        minlength: 8,
        select: false
    },
    confirmPassword: {
        type: String,
        required: [true, 'Please confirm your password'],
        // this validator ONLY works on .create & .save
        validate: {
            validator: function(el) {
                return el === this.password // returns true if password is '123' and confirmPassword is '123'
            },
            message: "Passwords are not the same!"
        }
        // select: false
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpire: Date,
    active: {
        type: Boolean,
        default: true,
        select: false
    }
});

// "this" refers to the current document (current user)


userSchema.pre('save', async function(next) {
    // only run if the password has been modified & if the password has not been modified, just return (exit) from the function and call the next middleware:
    if (!this.isModified('password')) return next();

    // encrypts the current password (hashes the password with a cost of 12):
    this.password = await bcrypt.hash(this.password, 12);

    // delete the confirm password from database once validation has been completed:
    this.confirmPassword = undefined;

    next();
});

userSchema.pre('save', function(next) {
    // if we didn't change the password property, do not manipulate:
    if (!this.isModified('password') || this.isNew) return next();

    this.passwordChangedAt = Date.now() - 1000;
    next();
});

// creating an instance method, becoming available to all documents on a certain collection:
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
    
};

// this middleware is run before any 'find' query is completed
userSchema.pre(/^find/, function(next) {
    // this points to the current query
    this.find({ active: { $ne: false } });
    next();
});

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);

        return JWTTimestamp < changedTimestamp
    }

    // false means NOT changed (not changed means the time on the token is LESS than the timestamp):
    return false;
};

// creating a password reset token to send to users email:
userSchema.methods.generatePasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex');

    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    this.passwordResetExpire = Date.now() + 10 * 60 * 1000;

    return resetToken;
};

const User = mongoose.model("User", userSchema);

module.exports = User;