const Booking = require('../models/bookingModel');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const Tour = require('./../models/tourModel');
const catchAsync = require('./../utils/catchAsync');


exports.getOverview = catchAsync(async (req, res, next) => {

    // 1 - get tour data from collection:
    const tours = await Tour.find();

    // 2 - build template:

    // 3 - render the template using tour data from step 1:
    res.status(200).render('overview', {
        title: 'All Tours',
        tours
    });
});

exports.getTour = catchAsync(async (req, res, next) => {

    // 1 - get the data for the requested tour (inc reviews and guides) -- we are find the tour by the slug because we do not know the ID
    const tour = await Tour.findOne({ slug: req.params.slug }).populate({ path: 'reviews', fields: 'review rating user' });

    if (!tour) {
        return next(new AppError('No tour with that name found', 404));
    }

    // 2 - build the template

    // 3 - render template using data from step one:
    res.status(200).render('tour', {
        title: tour.name,
        tour
    });
});

exports.login = (req, res) => {
    res.status(200).render('login', {
        title: 'Log into your account'
    });
};

exports.getAccount = (req, res) => {
    res.status(200).render('account', {
        title: 'Your account'
    });
};

exports.updateUserData = catchAsync(async (req, res, next) => {
    const updatedUser = await User.findByIdAndUpdate(req.user.id, {
        name: req.body.name,
        email: req.body.email
    },
    {
        new: true, // this essentially updates the document
        runValidators: true
    });

    res.status(201).render('account', {
        title: 'Your account',
        user: updatedUser
    });
});

exports.getMyTours = catchAsync(async (req, res, next) => {
    // 1 - find all bookings
    const bookings = await Booking.find({ user: req.user.id });

    // 2 - find all tours with the returned IDs
    const tourIds = bookings.map(el => el.tour); // loops through the whole bookings array, and on each element it will grab the el.tour
    const tours = Tour.find({ _id: { $in: tourIds } }); // the $in will select all the tours that match an id in toursIds array

    // 3 tours ready to be rendered
    res.status(200).render('overview', {
        title: 'My Bookings',
        tours
    });
});

