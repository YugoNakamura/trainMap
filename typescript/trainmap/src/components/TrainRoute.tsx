import { LatLngExpression } from "leaflet";
import { Marker, Polyline, Popup } from "react-leaflet";

interface osmJsonLine {
    type: string;
    geometry: {
        type: string;
    };
    properties: string;
}

interface Point extends osmJsonLine {
    geometry: {
        type: string;
        coordinates: number[];
    };
}

interface pointLine extends osmJsonLine {
    geometry: {
        type: string;
        coordinates: number[][];
    };
}

export function TrainRoute(): Promise<JSX.Element[]> {
    return fetch('./trainRoute/chubu-railway-latest.osm-test.json')
        .then(response => response.json())
        .then((data) => {
            const dataLines = data.features;
            const elements = dataLines.map((dataLine:osmJsonLine, index:number) => {
                if(dataLine.geometry.type === 'Point'){
                    const point:Point = dataLine as Point;
                    return <Marker position={[point.geometry.coordinates[1], point.geometry.coordinates[0]]} key={index}></Marker>;
                }
                if(dataLine.geometry.type === 'LineString'){
                    const line:pointLine = dataLine as pointLine;
                    const railRoad:LatLngExpression[] = [];
                    line.geometry.coordinates.map((point:number[]) =>{
                        railRoad.push([point[1], point[0]]);
                    });
                    return <Polyline pathOptions={{ color: index%2==0?'blue' :'red'}} positions={railRoad} key={index} ><Popup>{index}</Popup></Polyline>;
                }
                return null;
            }).filter(element => element !== null) as JSX.Element[];
            return elements;
        });
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