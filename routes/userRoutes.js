const express = require('express');
const { getAllUsers, createUser, getUser, updateUser, deleteUser, updateMe, deleteMe, getMe, uploadUserPhoto, resizeUserPhoto } = require('../controllers/userController');
const { signUp, logIn, forgotPassword, resetPassword, updatePassword, protect, restrictTo, logOut } = require('../controllers/authenticationController');


const router = express.Router();

// routers for the authentication process:
router.post('/signup', signUp);
router.post('/login', logIn);
router.get('/logout', logOut);
router.post('/forgotPassword', forgotPassword);
router.patch('/resetPassword/:token', resetPassword);

router.use(protect); // this is going to protect any routes after this middleware (everything below)

// routers for users updating their own information:
router.get('/me', getMe, getUser);
router.patch('/updateMe', uploadUserPhoto, resizeUserPhoto, updateMe); //.single() allows user to upload a single photo
router.patch('/updateMyPassword', updatePassword);
router.delete('/deleteMe', deleteMe);

router.use(restrictTo('admin')); // this is going to restrict access to the routers below to only the admins:

// routers for an admin to handle, eg admin would not be signing up new users:
router
    .route('/')
    .get(getAllUsers)
    .post(createUser);

router
    .route('/:id')
    .get(getUser)
    .patch(updateUser)
    .delete(deleteUser);

module.exports = router;