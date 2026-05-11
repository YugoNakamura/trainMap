import { Marker, Polyline, Popup } from "react-leaflet";
import {Railload, Section, Station, SwitchPoint} from "../types/railload"
import L, { LatLngExpression } from "leaflet";
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// マーカーのアイコンを設定
const customMarkerIcon = new L.Icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = customMarkerIcon;
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
        return <Polyline positions={latlngCoods} key={'section'+index}><Popup>{section.id}</Popup></Polyline>;
    });

    //駅情報
    const stations:Station[] = prop.railload.stations;
    const stationMarkers:JSX.Element[] = stations.map((station, index) => {
        return (
            <Marker position={station.coord as LatLngExpression} key={'station'+index}>
                <Popup>
                    {station.id}
                </Popup>
            </Marker>
        );
    });

    //分岐点
    const switches:SwitchPoint[] = prop.railload.switchPoints;
    const switchMarkers:JSX.Element[] = switches.map((switchPoint, index) => {
        return (<Marker position={switchPoint.coord as LatLngExpression} key={'switch'+index}>
            <Popup>
                {switchPoint.id}
            </Popup>
        </Marker>);
    });
    const elements = switchMarkers.concat(stationMarkers.concat(sectionLines));
    return <div>{elements}</div>

}