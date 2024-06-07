const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const APIFeatures = require('./../utils/apiFeatures');


// factory function for deleting different documents:
exports.deleteOne = Model => catchAsync(async (req, res, next) => {

    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
        return next(new AppError("No document found with that ID", 404))
    };

        res.status(204).json({
            status: "success",
            data: null
        });
});

// factory function for updating a single document:
exports.updateOne = Model => catchAsync(async (req, res, next) => {

    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            // reruns all the validators from the schema:
            runValidators: true
        });

    if (!doc) {
        return next(new AppError("No document found with that ID", 404))
    };

        res.status(200).json({
            status: "success",
            data: {
                data: doc
            }
        });
});

// factory function for creating a single document:
exports.createOne = Model => catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);

    res.status(201).json({
        status: 'success',
        data: {
            data: doc
        }
    });
});

// factory function for retrieving a single document:
exports.getOne = (Model, populateOptions) => catchAsync(async (req, res, next) => {

    let query = Model.findById(req.params.id);
    if (populateOptions) query = query.populate(populateOptions);
    const doc = await query;

    if (!doc) {
        return next(new AppError("No document found with that ID", 404))
    };

        res.status(200).json({
            status: 'success',
            "results": doc.length,
            data: {
                "data": doc
            }
        });
});

// factory function for getting all documents in a collection:
exports.getAll = Model => catchAsync(async (req, res, next) => {

    // To allow for nested GET reviews on tour:
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };

    // EXECUTE THE QUERY:
    const features = new APIFeatures(Model.find(filter), req.query)
        .filter()
        .sort()
        .limitFields()
        .paginate();

    const doc = await features.query; // .explain() will give a load of details of the query


    // SEND RESPONSE:
    res.status(200).json({
        "status": "success",
        "results": doc.length,
        "data": {
            "data": doc
        }
    });

});