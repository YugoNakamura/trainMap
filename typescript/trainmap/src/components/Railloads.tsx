import { Marker, Polyline, Popup } from "react-leaflet";
import {Prop, Section, Station} from "../types/railload"

export function Railloads(prop:Prop) {
    //区間情報
    const sections:Section[] = prop.railload.sections;
    const sectionLines:JSX.Element[] = sections.map((section, index) => {
        return <Polyline positions={section.coords} key={'section'+index}><Popup>{section.id}</Popup></Polyline>;
    });

    //駅情報
    const stations:Station[] = prop.railload.stations;
    const stationMarkers:JSX.Element[] = stations.map((station, index) => {
        return (
            <Marker position={station.coord} key={'station'+index}>
                <Popup>
                    {station.name}
                </Popup>
            </Marker>
        );
    });
    //sectionLinesとstationMarkersを結合してelementsにセットする
    const elements = stationMarkers.concat(sectionLines);
    return <div>{elements}</div>

}