//区間を表す
export interface Section {
    id:string,
    prev:string,
    next:string,
    distance:number,
    coords:number[][]
}

//駅を表す
export interface Station {
    id:string,
    name:string,
    name_en:string,
    code:string
    prev:string,
    next:string,
    coord:number[]
}

export interface SwitchPoint {
    id:string,
    coord:number[]
}

export interface Railload {
    sections:Section[],
    stations:Station[],
    switchPoints:SwitchPoint[]
}
