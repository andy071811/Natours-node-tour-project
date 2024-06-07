import axios from 'axios';
import { showAlert } from './alerts';

export const login = async (email, password) => {
    try {
        const res = await axios({
            method: 'POST',
            url: '/api/v1/users/login', // this only works because the api and the website are using the same url
            data: {
                email,
                password
            }
        });

        if (res.data.status === 'success') {
            showAlert('success', "Log in successful");
            window.setTimeout(() => {
                location.assign('/')
            }, 1500)
        }

    } catch(err) {
        showAlert('error', err.response.data.message);
    };
};

export const logOut = async () => {
    try {
        const res = await axios({
            method: 'GET',
            url: '/api/v1/users/logout' // this only works because the api and the website are using the same url
        });

        if (res.data.status === 'success') location.reload(true);

    } catch(err) {
        showAlert('error', 'Error logging out, try again');
    }
};