import { LatLngExpression } from "leaflet"

//区間を表す
export interface Section {
    id:String,
    prev:String,
    next:String,
    coords:LatLngExpression[]
}

//駅を表す
export interface Station {
    name:String,
    name_en:String,
    coord:LatLngExpression
}

export interface Railload {
    sections:Section[],
    stations:Station[]
}
export interface Prop {
    railload:Railload
}
