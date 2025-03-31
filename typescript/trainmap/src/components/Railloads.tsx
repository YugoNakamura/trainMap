import { Marker, Polyline, Popup } from "react-leaflet";
import {Railload, Section, Station, SwitchPoint} from "../types/railload"
import { LatLngExpression } from "leaflet";

export interface Prop {
    railload:Railload
}

export function Railloads(prop:Prop) {
    //区間情報
    const sections:Section[] = prop.railload.sections;
    const sectionLines:JSX.Element[] = sections.map((section, index) => {
        //number[][]からLatLngExpression[]に変換
        const latlngCoods:LatLngExpression[] = section.coords.map(coord => coord as LatLngExpression);
        return <Polyline positions={latlngCoods} key={'section'+index}><Popup>{section.id}</Popup></Polyline>;
    });

    //駅情報
    const stations:Station[] = prop.railload.stations;
    const stationMarkers:JSX.Element[] = stations.map((station, index) => {
        return (
            <Marker position={station.coord as LatLngExpression} key={'station'+index}>
                <Popup>
                    {station.name}
                </Popup>
            </Marker>
        );
    });

    //駅情報
    const switches:SwitchPoint[] = prop.railload.switchPoints;
    const switchMarkers:JSX.Element[] = switches.map((switchPoint, index) => {
        return (<Marker position={switchPoint.coord as LatLngExpression} key={'switch'+index}>
            <Popup>
                {switchPoint.name}
            </Popup>
        </Marker>);
    });
    const elements = switchMarkers.concat(stationMarkers.concat(sectionLines));
    return <div>{elements}</div>

}