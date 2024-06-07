const express = require('express');
const Review = require('./../models/reviewModel');
const APIFeatures = require('../utils/apiFeatures');
// const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

// middleware to run before creating a new review:
exports.setTourUserIds = (req, res, next) => {
    // linking the logged in user & tour they are on with the review
    if (!req.body.tour) req.body.tour = req.params.tourId;
    if (!req.body.user) req.body.user = req.user.id;
    next();
};

exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);
exports.createNewReview = factory.createOne(Review);
exports.deleteReview = factory.deleteOne(Review);
exports.updateReview = factory.updateOne(Review);