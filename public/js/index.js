import { login, logOut } from './login';
import { displayMap } from './mapbox';
import '@babel/polyfill';
import { updateSettings } from './updateSettings';
import { bookTour } from './stripe';


// DOM ELEMENTS: 
const mapBox = document.getElementById('map');
const loginForm = document.querySelector('.form--login');
const logOutBtn = document.querySelector('.nav__el--logout');
const userDataForm = document.querySelector('.form-update-user');
const changePasswordForm = document.querySelector('.form-user-password');
const bookBtn = document.getElementById('book-tour');


// DELEGATION:
if (mapBox) {
    const locations = JSON.parse(mapBox.dataset.locations);
    displayMap(locations);
};

if (loginForm) {
    loginForm.addEventListener('submit', e => {
        e.preventDefault();
        // VALUES:
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        login(email, password);
    });
}

if (logOutBtn) {
    logOutBtn.addEventListener('click', logOut);
};

if (userDataForm) {
    userDataForm.addEventListener('submit', e => {
        e.preventDefault();
        // this is creating a multipart form type
        const form = new userDataForm;
        form.append('name', document.getElementById('name').value);
        form.append('email', document.getElementById('email').value);
        form.append('photo', document.getElementById('photo').files[0]);

        updateSettings(form, 'data');
    });
};

if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', async e => {
        e.preventDefault();

        document.querySelector('.btn--save-password').innerHTML = 'Updating...'
        const currentPassword = document.getElementById('password-current').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('password-confirm').value;

        // waiting for this function to finish so we can clear the password form after completion
        await updateSettings({ currentPassword, password, confirmPassword }, 'password');

        document.querySelector('.btn--save-password').innerHTML = 'Save password'
        document.getElementById('password-current').value = '';
        document.getElementById('password').value = '';
        document.getElementById('password-confirm').value = '';
    });
};

if (bookBtn) {
    bookBtn.addEventListener('click', e => {
        e.target.textContent = 'Processing...';
        const { tourId } = e.target.dataset; // getting the tour id from the event click (in tour.pug)
        bookTour(tourId);
    });
}