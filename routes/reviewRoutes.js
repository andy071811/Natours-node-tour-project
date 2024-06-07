const { protect, restrictTo } = require('../controllers/authenticationController');
const { getAllReviews, createNewReview, deleteReview, updateReview, setTourUserIds, getReview } = require('./../controllers/reviewController');
const express = require('express');

const router = express.Router({ mergeParams: true }); // merging parameters allows this reviewRouter to get the '/:tourId parameter from the tourRouter:


router.use(protect); // now no one can access the reviews without authentication

// this router is mounted in app.js (root is 'reviews'):
router
    .route('/')
    .get(getAllReviews)
    .post(restrictTo('user'), setTourUserIds, createNewReview);

router
    .route('/:id')
    .get(getReview)
    .delete(restrictTo('user', 'admin'), deleteReview)
    .patch(restrictTo('user', 'admin'), updateReview);

    module.exports = router;

