const mongoose = require('mongoose');
const User = require('././tourModel');
const Tour = require('././tourModel');

const reviewSchema = new mongoose.Schema({
        review: {
            type: String,
            required: [true, 'You must write a review for this tour'],
            minLength: 15,
            maxLength: 1000
        },
        rating: {
            type: Number,
            min: 1,
            max: 5,
            default: 0
        },
        createdAt: {
            type: Date,
            default: Date.now(),
            select: false
        },
        tour: {
            type: mongoose.Schema.ObjectId,
            ref: 'Tour',
            required: [true, 'Review must belong to a tour']
        },
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: [true, 'Review must have an author']
        }
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

reviewSchema.index({ tour: 1, user: 1 }, { unique: true }); // this ensures each combination of tour and user has to be unique

reviewSchema.pre(/^find/, function(next) {
    // this.populate({
    //     path: 'tour',
    //     select: 'name'
    // });

    this.populate({
        path: 'user',
        select: 'name'
    });

    next();
});

// using a static method 'this' points to the model
// code below is to create statistics of average and number of ratings
reviewSchema.statics.calcAverageRatings = async function(tourId) {
    const stats = await this.aggregate([
        {
            $match: { tour: tourId }
        },
        {
            $group: {
                _id: '$tour',
                nRating: { $sum: 1 },
                avgRating: {$avg: '$rating'}
            }
        }
    ]);

    if (stats.length > 0) {
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: stats[0].nRating,
            ratingsAverage: stats[0].avgRating
        });
    } else {
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: 0,
            ratingsAverage: 4.5
        });
    };
};

reviewSchema.post('save', function() {
    // 'this' points to current review
    this.constructor.calcAverageRatings(this.tour);
});

// creating a pre middleware for findByIdAndUpdate and findByIdAndDelete:
reviewSchema.pre(/^findOneAnd/, async function(next) {
    this.r = await this.findOne();
    next();
});

reviewSchema.post(/^findOneAnd/, async function() {
    // await this.findOne(); does NOT work here as the query has already been executed!
    await this.r.constructor.calcAverageRatings(this.r.tour);
});

// creating the model:
const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;