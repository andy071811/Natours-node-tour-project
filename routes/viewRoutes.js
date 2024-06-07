const { isLoggedIn, protect } = require('../controllers/authenticationController');
const { createBookingCheckout } = require('../controllers/bookingController');
const { getOverview, getTour, login, getAccount, updateUserData, getMyTours } = require('../controllers/viewsController');

express = require('express');

const router = express.Router();

// routing for the rendered pages: 

//router.use(isLoggedIn); // middleware to run before all routers below and check is a user is logged in or not

//usually use app.get(); for rendering pages in the browser

router.get('/', createBookingCheckout, isLoggedIn, getOverview);
router.get('/tour/:slug', isLoggedIn, getTour);
router.get('/login', isLoggedIn, login);
router.get('/me', protect, getAccount);

router.get('/my-tours', protect, getMyTours);

router.post('/submit-user-data', protect, updateUserData);

module.exports = router;