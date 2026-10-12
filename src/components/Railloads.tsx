import { CircleMarker, Polyline, Popup, Tooltip } from "react-leaflet";
import {Railload, Section, Station} from "../types/railload"
import { LatLngExpression } from "leaflet";
export interface Prop {
    railload:Railload
}

//線路や駅の情報を地図上に表示するコンポーネント
export function Railloads(prop:Prop) {
    //区間情報
    const sections:Section[] = prop.railload.sections;
    const sectionLines:JSX.Element[] = sections.map((section, index) => {
        //number[][]からLatLngExpression[]に変換
        const latlngCoods:LatLngExpression[] = section.coords.map(coord => coord as LatLngExpression);
        return <Polyline
            positions={latlngCoods}
            pathOptions={{ color: prop.railload.colorcode }}
            key={'section'+index}
        />;
    });

    //駅情報
    const stations:Station[] = prop.railload.stations;
    const stationMarkers:JSX.Element[] = stations.map((station, index) => {
        return (
            <CircleMarker
                center={station.coord as LatLngExpression}
                radius={5}
                pathOptions={{
                    color: prop.railload.colorcode,
                    fillColor: '#ffffff',
                    fillOpacity: 1,
                    weight: 2
                }}
                key={'station'+index}
            >
                <Tooltip>{station.name}</Tooltip>
                <Popup>{station.name} ({station.code})</Popup>
            </CircleMarker>
        );
    });

    const elements = stationMarkers.concat(sectionLines);
    return <div>{elements}</div>

}