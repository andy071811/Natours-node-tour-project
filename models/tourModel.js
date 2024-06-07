  const mongoose = require('mongoose');
  const slugify = require('slugify');
  // validator for checking different parts of document:
  const validator = require('validator');
  const User = require('./userModel');
  
  // CREATING A NEW DOCUMENT TO THE MONGO DB:

  const tourSchema  = new mongoose.Schema({
    name: {
        // type of data that x must be:
        type: String,
        // data validation (built-in):
        required: [true, "A tour must have a name"],
        maxLength: [40, 'A tour name must have no more than 40 characters'],
        minLength: [10, 'A tour name must have more than 10 characters'],
        // validator library:
        // validate: [validator.isAlpha, "Tour name must only contain characters"],
        // checks whether you can have multiple titles with the same name:
        unique: true,
        //trim any white space from inputs:
        trim: true
    },
    slug: String,
    duration: {
        type: Number,
        required: [true, "A tour must have a duration"]
    },
    maxGroupSize: {
        type: Number,
        required: [true, "A tour must have a group size"]
    },
    difficulty: {
        type: String,
        required: [true, "A tour must have a difficulty"],
        enum: {
            values: ['easy', 'medium', 'difficult'],
            message: "Difficulty is either: easy, medium or difficult"
        }
    },
    ratingsQuantity: {
        type: Number,
        default: 0
    },
    ratingsAverage: {
        type: Number,
        default: 4.5,
        min: [1, "Rating must be above 1.0"],
        max: [5, "Rating cannot be above 5.0"],
        set: val => Math.round(val * 10) / 10 // rounds the ratings average up to the first decimal point
    },
    price: {
        type: Number,
        required: [true, "A tour must have a price"]
    },
    priceDiscount: {
        type: Number,
        // custom validator (callback function):
        validate: {
            validator: function(val) {
                // this validator only works on NEW documents and will not work if UPDATING a document
                return val < this.price // if priceDiscount (250) is less than price (200), function returns false and throws an error.
            },
        message: "Price discount cannot be less than the price of the tour"
        }
    },
    summary: {
        type: String,
        trim: true,
        required: [true, "A tour must have a summary"]
    },
    description: {
        type: String,
        trim: true
    },
    imageCover: {
        type: String,
        required: [true, "A tour must have a cover image"]
    },
    images: [String],
    createdAt: {
        type: Date,
        default: Date.now(),
        select: false
    },
    startDates: [Date],
    secretTour: {
        type: Boolean,
        default: false
    },
    startLocation: {
        // GeoJSON data format:
        type: {
            type: String,
            default: 'Point',
            enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String
    },
    locations: [ // we always need to use this array to embed documents
        {
            type: {
                type: String,
                default: 'Point',
                enum: ['Point']
            },
            coordinates: [Number],
            address: String,
            description: String,
            day: Number
        }
    ],
    /* guides: Array -- this is used with a pre save middleware to embed documents */
    guides: [ /*used for child referencing data*/
        {
            type: mongoose.Schema.ObjectId,
            ref: 'User'
        }
    ]
  }, /* SECOND OBJECT FOR THE OPTIONS */ {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  });

  // COMPOUND INDEXING:
  tourSchema.index({ price: 1, ratingsAverage: -1 }); // 1 is to index in ascending order and -1 is a descending order
  tourSchema.index({ slug: 1 });
  tourSchema.index({ startLocation: '2dsphere' }); // indexing for geospatial querying

  // CREATING VIRTUAL PROPERTIES: (CANNOT USE VIRTUAL PROPERTIES FOR QUERIES): 
  tourSchema.virtual('durationWeeks').get(function() {
    return this.duration / 7;
  });

  // connecting two data sets (virtual populate):
  tourSchema.virtual('reviews', {
    ref: 'Review', // where the tourModel need to reference the data
    foreignField: 'tour', // this is the name of the other field in the review document that we want to connect 'tour'
    localField: '_id' // this is what the 'tour' of the foreign field is called in this document
  });

    // DOCUMENT MIDDLEWARE: runs before .save() and .create() but NOT before .insertMany() nor .create()
    tourSchema.pre('save', function(next) {
        this.slug = slugify(this.name, { lower: true });
        next();
    });


    // // this is the middleware responsible for embedding data:
    // tourSchema.pre('save', async function(next) {
    //     // the guidesPromises will return an array of promises:
    //     const guidesPromises = this.guides.map(async id => await User.findById(id));
    //     // awaiting promise.all will return the array of IDs:
    //     this.guides = await Promise.all(guidesPromises);

    //     next();
    // });

    // QUERY MIDDLEWARE: allows us to run functions before or after a query is executed:
    tourSchema.pre(/^find/, function(next) {
        this.find({ secretTour: { $ne: true } })
        next();
    });

    tourSchema.pre(/^find/, function(next) {
        this.populate({
            path: 'guides',
            select: '-__v -passwordChangedAt'
        }); // populate provides all the data for the guides and doesn't just embed it

        next();
    });

    tourSchema.post(/^find/, function(docs, next) {
        next();
    });

    // AGGREGATION MIDDLEWARE: 
    // tourSchema.pre('aggregate', function(next) {
    //     this.pipeline().unshift({ $match: { secretTour: {$ne: true } } });
    //     next();
    // });


  // CREATING A NEW MODEL FROM THE SCHEMA:

  const Tour = mongoose.model("Tour", tourSchema);

  module.exports = Tour;