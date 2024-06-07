const express = require('express');
const multer = require('multer');
const sharp = require('sharp'); // image processing package
const Tour = require('./../models/tourModel');
//const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
//const AppError = require('../utils/appError');
const factory = require('./handlerFactory');
const AppError = require('../utils/appError');


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

// upload.array('images', 5) -- this method used when uploading multiple datas with the same name

// below is used when uploading multiple datas with different names:
exports.uploadTourImages = upload.fields([
    { name: 'imageCover', maxCount: 1 },
    { name: 'images', maxCount: 3 }
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {

    if (!req.files.imageCover || !req.files.images) return next();

    // 1 - Cover image:
    req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg;`
    await sharp(req.files.imageCover[0].buffer)
        .resize(2000, 1333).toFormat('jpeg').jpeg({ quality: 90 }).toFile(`public/img/tours/${req.body.imageCover}`);

    // 2 - Other images:
    req.body.image = [];
    await Promise.all(req.files.images.map(async (file, i) => {
        const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg;`
        
        await sharp(file.buffer)
            .resize(2000, 1333).toFormat('jpeg').jpeg({ quality: 90 }).toFile(`public/img/tours/${filename}`);

        req.body.images.push(filename);
    }));

    next();
});


// const tours = JSON.parse(fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`));

// query to retrieve the top 5 tours based on searching:
exports.aliasTopTours = (req, res, next) => {
    req.query.limit = '5';
    req.query.sort = '-ratingsAverage,price';
    req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
    next();
};


exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' }); // the path property is the one we want to populate
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour) // pulled from the factory delete function, passing in tour as the data we want to delete.

exports.getTourStats = catchAsync(async (req, res, next) => {
    const stats = await Tour.aggregate([
        {
            $match: { ratingsAverage: {$gte: 4.5} }
        },
        {
            $group: {
                _id: { $toUpper: '$difficulty' },
                numOfTours: { $sum: 1 },
                numOfRatings: { $sum: '$ratingsQuantity' },
                avgRating: { $avg: '$ratingsAverage' },
                avgPrice: { $avg: '$price' },
                minPrice: { $min: '$price' },
                maxPrice: { $max: '$price' }
            }
        },
        {
            $sort: { avgPrice: 1 }
        },
        // {
        //     $match: { _id: { $ne: 'easy' } }
        // }
    ]);

    res.status(200).json({
        status: "success",
        data: {
            stats: stats
        }
    });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {

    const year = req.params.year * 1; // 2021

    const plan = await Tour.aggregate([
        {
            $unwind: '$startDates'
        },
        {
            $match: {
                startDates: {
                    $gte: new Date(`${year}-01-01`),
                    $lte: new Date(`${year}-12-31`)
                }
            }
        },
        {
            $group: {
                _id: { $month: '$startDates' },
                numOfTourStarts: { $sum: 1 },
                tours: { $push: '$name' }
            }
        },
        {
            $addFields: { month: '$_id' }
        },
        {
            $project: {
                _id: 0
            }
        },
        {
            $sort: { numOfTourStarts: -1 }
        },
        {
            $limit: 12
        }
    ]);

    res.status(200).json({
        status: "success",
        data: {
            plan
        }
    });
});

// calculating Geospatial queries:
exports.getToursWithin = catchAsync(async (req, res, next) => {
// /tours-within/:distance/center/:latlng/unit/:unit
// /tours-within/233/center/40.15441,-43.86534/unit/mi
    const { distance, latlng, unit } = req.params;
    const [lat, lng] = latlng.split(',');

    const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

    if (!lat || !lng) {
        next(new AppError("Please specify your location (latitude and longitude", 400))
    };

    const tours = await Tour.find({ startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } } });

    res.status(200).json({
        status: 'success',
        results: tours.length,
        data: {
            data: tours
        }
    });

});


// getting tours from a specified distance:
exports.getDistances = catchAsync(async (req, res, next) => {
    const { latlng, unit } = req.params;
    const [lat, lng] = latlng.split(',');

    const multiplier = unit === 'mi' ? 0.000621371 : 0.001; // converting miles into kilometers

    if (!lat || !lng) {
        next(new AppError("Please specify your location (latitude and longitude", 400))
    };

    const distances = await Tour.aggregate([
        {
            $geoNear: {
                near: {
                    type: 'Point',
                    coordinates: [lng * 1, lat * 1]
                },
                distanceField: 'distance',
                distanceMultiplier: multiplier
            }
        },
        {
            $project: { // the project are the keys you want to be displayed in the body
                distance: 1,
                name: 1
            }
        }
        
    ]);

    res.status(200).json({
        status: 'success',
        data: {
            data: distances
        }
    })
});