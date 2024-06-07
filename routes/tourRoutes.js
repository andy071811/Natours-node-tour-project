const express = require('express');
const router = express.Router();
const { getAllTours, createTour, getTour, updateTour, deleteTour, checkID, checkBody, aliasTopTours, getTourStats, getMonthlyPlan, getToursWithin, getDistances, uploadTourImages, resizeTourImages } = require('../controllers/tourController');
const { protect, restrictTo } = require('../controllers/authenticationController');
const reviewRouter = require('./../routes/reviewRoutes');

// router.param('id', checkID);
// a router itself is just middleware, so we can use the .use() on it.

// POST /tour/234fad4/reviews
// GET /tour/234fad4/reviews

// for this route below, we are telling .use() to use the reviewRouter:
router.use('/:tourId/reviews', reviewRouter);




// ROOT ROUTE (/TOURS):
router
    .route('/')
    .get(getAllTours)
    .post(protect, restrictTo('admin', 'lead-guide'),createTour);

// MOUNTED ROUTERS ON TOP OF /TOURS:

router
    .route('/tour-stats')
    .get(getTourStats);

router
    .route('/monthly-plan/:year')
    .get(protect, restrictTo('admin', 'lead-guide', 'guide'), getMonthlyPlan);

router
    .route('/top-5-cheap')
    .get(aliasTopTours, getAllTours);

router
    .route('/:id')
    .get(getTour)
    .patch(protect, restrictTo('admin', 'lead-guide'), uploadTourImages, resizeTourImages, updateTour)
    .delete(protect, restrictTo('admin', 'lead-guide'), deleteTour);

router
    .route('/tours-within/:distance/center/:latlng/unit/:unit')
    .get(getToursWithin);

router
    .route('/distances/:latlng/unit/:unit')
    .get(getDistances);

module.exports = router;