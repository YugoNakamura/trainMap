import { LatLngExpression } from "leaflet";
import { Marker, Polyline, Popup } from "react-leaflet";

//区間を表す
interface Section {
    id:String,
    prev:String,
    next:String,
    coords:LatLngExpression[]
}

//駅を表す
interface Station {
    name:String,
    name_en:String,
    coord:LatLngExpression
}

export function Railloads(): Promise<JSX.Element[]> {
    return fetch('./trainRoute/mikawaLine.json')
        .then(response => response.json())
        .then((data) => {
            //区間情報
            const sections:Section[] = data.sections;
            const sectionLines:JSX.Element[] = sections.map((section, index) => {
                return <Polyline positions={section.coords} key={'section'+index}><Popup>{section.id}</Popup></Polyline>;
            });

            //駅情報
            const stations:Station[] = data.stations;
            const stationMarkers:JSX.Element[] = stations.map((station, index) => {
                return (
                    <Marker position={station.coord} key={'station'+index}>
                        <Popup>
                            {station.name}
                        </Popup>
                    </Marker>
                );
            });
            //sectionLinesとstationMarkersを結合して返す
            return sectionLines.concat(stationMarkers);
        })
        .catch(error => {
            console.error('Error fetching train route data:', error);
            return [];
        });
}