export const displayMap = locations => {
    mapboxgl.accessToken = 'pk.eyJ1IjoiYW5keTA3MTgxMSIsImEiOiJjbHd5dXBvaTIwMHExMmpyMm10YXNxbDFpIn0.wAQGH9FOTMSGmoUPUlezgg';

    // setting the options for the embedded map. (check mapbox documentation for more details)
    var map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/andy071811/clwyvcees01l001qs4j6u209y',
        scrollZoom: false
        // center: [-118.113491, 34.111745],
        // zoom: 4,
        // interactive: false
    });

    const bounds = new mapboxgl.LngLatBounds();

    locations.forEach(loc => {
        // Create a marker
        const el = document.createElement('div');
        el.className = 'marker';

        // Add the marker
        new mapboxgl.Marker({
            element: el,
            anchor: 'bottom' // the bottom of the pin that will be located at the exact gps location
        }).setLngLat(loc.coordinates).addTo(map);

        // Add a pop-up
        new mapboxgl.Popup({ offset: 30}).setLngLat(loc.coordinates).setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`).addTo(map);

        // Extend the map bounds to include the current location:
        bounds.extend(loc.coordinates);
    });

    map.fitBounds(bounds, {
        padding: {
            top: 200,
            bottom: 150,
            left: 100,
            right: 100
        }
    });
}

