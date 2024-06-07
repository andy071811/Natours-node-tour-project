const mongoose = require('mongoose');
const dotenv = require('dotenv');

// handling 'uncaught exceptions':
// when there is an uncaught exception we must crash the program
process.on('uncaughtException', err => {
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');



const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

// CONNECTING TO THE MONGO DB

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(() => {
    console.log('DB connection successful!');
  });

// START THE SERVER

const PORT = process.env.PORT;

const server = app.listen(PORT, () => {
  console.log(`App running on port ${PORT}`);
});

// how to handle 'unhandled rejections' for async code (globally through the application)
// we are listening to the unhandled event throughout the app:
process.on('unhandledRejection', err => {
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
