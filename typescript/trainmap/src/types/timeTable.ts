export interface timeTable{
    line: string,
    depSta: string,
    depId: string,
    arrSta:string,
    arrId: string,
    tt: dia[]
}

export interface dia{
    s:string,
    a:string,
    d:string
}