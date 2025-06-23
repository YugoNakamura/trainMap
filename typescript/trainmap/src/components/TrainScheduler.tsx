import { useEffect, useState } from "react";
import { Railload } from "../types/railload"
import { timeTable } from "../types/timeTable"
import {Train} from "./Train"

interface Prop {
    speedRate:number
}

export const TrainScheduler = (prop:Prop) => {
    const [railload, setRailload] = useState<Railload>();
    const [tt, setTimeTable] = useState<timeTable[]>();

    // 路線情報を読み込み
    useEffect(()=>{
        fetch('./trainRoute/mikawaLine.json')
        .then(response => response.json())
        .then(data => setRailload(data));
    }, []);

    // 運行情報を読み込み
    useEffect(()=>{
        fetch('./timeTable/mikawaLine.json')
        .then(response => response.json())
        .then(data => setTimeTable(data));
    }, []);

    //JSONの読み込みが完了したらTrainを呼び出す
    if(railload === undefined || tt === undefined) {
        return <div></div>
    } else {
        const trains:JSX.Element[] = [
            <Train railload={railload} timeTable={tt[0]} speedRate={prop.speedRate} key={1}/>
//            <TrainJSX railload={railload} depStaName='Hekinan' desStaName='Chiryuu' key={2}/>
        ]
        return <div>{trains}</div>
    }
    
}