import { LatLngExpression } from "leaflet";
import { Marker, Popup } from "react-leaflet";

interface Location {
    lat: number;
    lng: number;
}

export function TrainRoute(): Promise<JSX.Element[]> {
    return fetch('./trainRoute/Meitetsu_mikawaLine.geojson')
        .then(response => response.json())
        .then((data) => {
                const coordinates:number[][] = data.features[46].geometry.coordinates[0];
                return coordinates.map((coordinate, index)=>{
                    const pos:LatLngExpression = [coordinate[1], coordinate[0]];
                    return <Marker key={index} position={pos}><Popup>{coordinate[1]}, {coordinate[0]}</Popup></Marker>;
                    }
                );
            }
        )
}

/*export function TrainRoute() {
    return fetch('./trainRoute/test.json')
        .then(response => response.json())
        .then((data: Location) => {
                const position: LatLngExpression = [data.lat, data.lng];
                return <Marker position={position} />;
            }
        )
}*/