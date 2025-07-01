export interface timeTable{
    line: string,
    trainNo: string,
    fromSta: string,
    fromStaId: string,
    toSta:string,
    toStaId: string,
    bound: boolean,
    tt: dia[]
}

export interface dia{
    s:string,
    a:string,
    d:string
}