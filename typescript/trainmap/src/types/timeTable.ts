//JSON読み込み用
export interface RawTimeTable{
    line: string,
    trainNo: string,
    fromSta: string,
    fromStaId: string,
    toSta:string,
    toStaId: string,
    bound: boolean,
    tt: RawDia[]
}

export interface RawDia{
    s:string,
    a?:string,
    d?:string
}

import dayjs from "dayjs"
//アプリ内で使用する型
export interface TimeTable{
    line: string,
    trainNo: string,
    fromSta: string,
    fromStaId: string,
    toSta:string,
    toStaId: string,
    bound: boolean,
    tt: Dia[]
}

export interface Dia{
    s:string,
    a:dayjs.Dayjs,
    d:dayjs.Dayjs
}