const express = require('express');
const { protect, restrictTo } = require('../controllers/authenticationController');
const { getCheckoutSession, createBookingCheckout, getBooking, getAllBookings, updateBooking, createBooking, deleteBooking } = require('../controllers/bookingController');

const router = express();

router.use(protect)

router.get('/checkout-session/:tourId', getCheckoutSession);

// Booking routers
router.use(restrictTo('admin', 'lead-guide'));

router.route('/')
    .get(getAllBookings)
    .post(createBooking);

router.route('/:id')
    .get(getBooking)
    .patch(updateBooking)
    .delete(deleteBooking);

module.exports = router;