import { LatLngExpression } from "leaflet";
import { Marker } from "react-leaflet";

interface Location {
    lat: number;
    lng: number;
}

export function TrainRoute() {
    return fetch('./trainRoute/test.json')
        .then(response => response.json())
        .then((data: Location) => {
                const position: LatLngExpression = [data.lat, data.lng];
                return <Marker position={position} />;
            }
        )
}