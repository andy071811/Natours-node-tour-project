const stripe = Stripe('pk_test_51POfurAXhqp78HHEPuL5ulNwLlSuPx5z2RjBax6a9NUiDsHQjVJP5TeZTYQsBJ3xEDjpg0uooUau7HavU3wApmrg00P1nmopBT'); // this key is the public key from the stripe api (script in base.pug)
import axios from 'axios';
import { showAlert } from './alerts';


export const bookTour = async tourId => {
    try {

        // 1 - Get checkout session from endpoint (API):
        const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);
        //console.log(session);

        // 2 - Use stripe object to auto create checkout form + charge credit card
        await stripe.redirectToCheckout({
            sessionId: session.data.session.id
        });

    } catch(err) {
        console.log(err);
        showAlert('error', err)
    };
};