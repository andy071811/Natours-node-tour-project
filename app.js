const express = require('express');
const morgan = require('morgan');
const app = express();
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const path = require('path');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const cors = require('cors');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController')

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');
const bookingRouter = require('./routes/bookingRoutes');

// setting the template PUG for the website:
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'))

// GLOBAL MIDDLEWARES (THAT ALL ROUTERS USE):

// IMPLEMENT CORS:
app.use(cors()); // this adds specific headers and enable CROSS ORIGIN RESOURCE SHARING
// it sets Access-Control-Allow-Origin to * (everything)

app.options('*', cors());

// serving static files:
app.use(express.static(path.join(__dirname, 'public')));

// helmet should be used right near the beginning the middleware:
// helmet sets security HTTP headers:
app.use(helmet());

// const cspDirectives = {
//     defaultSrc: ['elem'],
//     connectSrc: ['self', 'https://api.mapbox.com']
// };

// app.use(helmet.contentSecurityPolicy({
//     directives: cspDirectives
// }));

// this limiter will limit 1000 requests from the same IP
const limiter = rateLimit({
    max: 100, /*how many requests*/
    windowMs: 60 * 60 * 1000, /*time window*/
    message: "Too many requests from this IP, please try again in an hour."
});

app.use('/api', limiter);

// we need to call this route before the body parser otherwise webhookCheckout will not work:
app.post('/webhook-checkout', express.raw({ type: application/json }), webhookCheckout)

// development logging:
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
};

// body parser - reading data from the body into req.body
app.use(express.json({
    limit: '10kb'
}));
app.use(cookieParser()); // parses the cookies

app.use(express.urlencoded({ extended: true, limit: '10kb' })); // this reads the encoded url body

// data sanitization against noSQL query injection 
app.use(mongoSanitize());

//data sanitization against XSS
app.use(xss());

// prevent parameter pollution (use near end to clear up query string):
app.use(hpp({
    whitelist: ['duration', 'ratingsQuantity', 'ratingsAverage', 'maxGroupSize', 'difficulty', 'price']
}));

// this will compress all the text that gets sent to the clients
app.use(compression());

// test middleware
// app.use((req, res, next) => {
//     req.requestTime = new Date().toISOString();
//     next();
// });

// THE ROUTES

// routers and root urls for the api (and also middleware):
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter)

// middleware if URL is not found (for all operations) - this is run if the request isn't found in our routers above:
app.all('*', (req, res, next) => {
    // res.status(404).json({
    //     status: 'fail',
    //     message: `Can't find ${req.originalUrl} on this server!`
    // });
    // next();

    // const err = new Error(`Can't find ${req.originalUrl} on this server!`);
    // err.status = fail;
    // err.statusCode = 404;

    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// by having four arguments in this middleware, express knows to only call this function if there is an error:
app.use(globalErrorHandler);

module.exports = app;