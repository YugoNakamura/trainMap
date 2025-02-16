import { LatLngExpression } from "leaflet"

//区間を表す
export interface Section {
    id:string,
    prev:string,
    next:string,
    coords:LatLngExpression[]
}

//駅を表す
export interface Station {
    name:string,
    name_en:string,
    coord:LatLngExpression
}

export interface Railload {
    sections:Section[],
    stations:Station[]
}
