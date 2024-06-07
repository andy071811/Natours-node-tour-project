const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');
const sharp = require('sharp'); // image processing package

// MULTER
const multer = require('multer');
// we can use this variable if there is no image processing needed:
// const multerStorage = multer.diskStorage({
//     // giving the newly uploaded photos a destination:
//     destination: (req, file, cb) => {
//         cb(null, 'public/img/users');
//     },
//     filename: (req, file, cb) => {
//         // giving the newly uploaded photos a name:
//         const ext = file.mimetype.split('/')[2];
//         cb(null, `user-${req.user.id}-${Date.now()}.${ext}`)
//     };
// });

const multerStorage = multer.memoryStorage(); // keeping the user image in memory
const multerFilter = (req, file, cb) => {
    // this filter is going to ensure that the only files uploaded are photo files:
    if (file.mimetype.startsWith('image')) {
        cb(null, true);
    } else {
        cb(new AppError("Not an image, please upload only images", 400), false)
    };
};
const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter
});

// middlewares if user changes/uploads photo (this is required for image processing)
exports.uploadUserPhoto = upload.single('photo');
exports.resizeUserPhoto = catchAsync(async (req, res, next) => {

    req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;
    if (!req.file) return next();
    await sharp(req.file.buffer).resize(500, 500).toFormat('jpeg').jpeg({ quality: 90 }).toFile(`public/img/users/${req.file.filename}`);

    next();
});

//
const filteredObj = (obj, ...allowedFields) => {
    const newObj = {};
    // loop through the obj to check if it is an allowed field:
    Object.keys(obj).forEach(el => {
        if (allowedFields.includes(el)) newObj[el] = obj[el];
    });

    return newObj;
};

exports.createUser = catchAsync(async (req, res, next) => {
    res.status(404).json({
        status: 'failed',
        message: 'Path not defined, please use sign up instead.'
    });
});

// essentially middleware changing the params.id to user.id before running the getOne factory function:
exports.getMe = (req, res, next) => {
    req.params.id = req.user.id;
    next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
    //console.log(req.file);
    //console.log(req.body);
    // function handling the user changing data about itself

    // 1 - create an error if the user tries to update the password (posts password data):
    if (req.body.password || req.body.confirmPassword) return next(new AppError("You cannot change your password here, please use /update password", 400));

    // 2 - update user document:
    // creating a filter in order that the user can only update the fields we want, eg name and email:
    const filteredBody = filteredObj(req.body, 'name', 'email');
    if (req.file) filteredBody.photo = req.file.filename;
    // because we are now dealing with non sensitive data we can use findByIdAndUpdate()
    const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, { new: true, runValidators: true });

    res.status(200).json({
        status: 'success',
        data: {
            user: updatedUser
        }
    });
});

// users deleting their accounts does not delete it from the database but turns the account 'inactive'
exports.deleteMe = catchAsync(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user.id), { active: false }

    res.status(204).json({
        status: 'success',
        data: null
    })
});

exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
exports.deleteUser = factory.deleteOne(User);
exports.updateUser = factory.updateOne(User); // do NOT use this to update passwords!