const express = require('express');
const multer = require('multer');
const sharp = require('sharp'); // image processing package
const Tour = require('./../models/tourModel');
const Booking = require('./../models/bookingModel');
//const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
//const AppError = require('../utils/appError');
const { createOne, deleteOne, updateOne, getAll, getOne } = require('./handlerFactory');
const AppError = require('../utils/appError');
const User = require('../models/userModel');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // this package required for using stripe on the back end only

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
    // 1 - get the currently booked tour:
    const tour = await Tour.findById(req.params.tourId);

    // 2 - create checkout session: // THIS SEEMS TO BE OUTDATED NOW:
    // const session = await stripe.checkout.sessions.create({ // this is all info regarding the session:
    //     payment_method_types: ['card'],
    //     success_url: `${req.protocol}://${req.get('host')}/`,
    //     cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    //     customer_email: req.user.email,
    //     client_reference_id: req.params.tourId, // this is a custom field
    //     line_items: [ // this is all info about the product the user is about to purchase - fields are mandatory by stripe and you can't add your own:
    //         {
    //             name: `${tour.name} Tour`,
    //             description: tour.summary,
    //             images: [`https://natours.dev/img/tours/${tour.imageCover}`],
    //             price: tour.price * 100,
    //             currency: 'usd',
    //             quantity: 1
    //         }
    //     ]
    // });

    const session = await stripe.checkout.sessions.create({
        success_url: `${req.protocol}://${req.get('host')}/my-tours`,
        customer_email: req.user.email, // this will auto populate the customers email in the checkout page
        client_reference_id: req.params.tourId, // this is a custom field
        line_items: [
            {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: tour.name
                    },
                    unit_amount: tour.price * 100
                },
                quantity: 1
            }
        ],
        mode: 'payment'
    });

    // 3 create session as response:
    res.status(200).json({
        status: 'success',
        session
    });
});

// exports.createBookingCheckout = catchAsync(async (req, res, next) => {
//     // This is only temporary because it is unsecure and everyone can make bookings without paying
//     // new booking only created when tour user and price are specified on the query
//     const { tour, user, price } = req.query;

//     if (!tour && !user && !price) return next();
//     await Booking.create({tour, user, price}); // creating the new booking document

//     res.redirect(req.originalUrl.split('?')[0]); // splitting the success url to redirect the user to the homepage after booking to hide the entire query string in the browser.
// });

const createBookingCheckout = async session => {

    const tour = session.client_reference_id;
    const user = (await User.findOne({ email: session.customer_email })).id;
    const price = session.line_items[0].unit_amount / 100;
    await Booking.create({tour, user, price}); // creating the new booking document
};

exports.webhookCheckout = (req, res, next) => {

    const signature = req.headers['stripe-signature'];
    let event;
    
    try {

        event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);

    } catch(err) {

        return res.status(400).send(`Webhook error: ${err.message}`);

    };

    if (event.type === 'checkout.session.complete') {
        createBookingCheckout(event.data.session);

        res.status(200).json({
            received: true
        })
    }
    
};

exports.getAllBookings = getAll(Booking);
exports.getBooking = getOne(Booking);
exports.createBooking = createOne(Booking);
exports.updateBooking = updateOne(Booking);
exports.deleteBooking = deleteOne(Booking);