import { useEffect, useState } from "react";
import { Railload } from "../types/railload"
import { timeTable } from "../types/timeTable"
import {Train} from "./Train"
import dayjs from "dayjs";

interface Prop {
    railload:Railload,
    timeTable:timeTable[],
    date:dayjs.Dayjs,
}

interface trainProp {
    railload:Railload,
    timeTable:timeTable,
    key:string
}

export const TrainScheduler = (prop:Prop) => {
    //運行中の列車
    const [trains, setTrains] = useState<trainProp[]>([]);

    //1分ごとに現在時刻と一致する出発時刻を持つ列車を検索し、運行中の列車に追加する
    useEffect(() => {
        const addTrains = getDepTrains(prop.date, prop.railload, prop.timeTable);
        //始発する列車を運行中の列車に追加
        addTrains.forEach(addTrain => {
            trains.push(addTrain);
            setTrains(trains);
        });
    }, [prop.date.minute()]);

    const delTrain = (trainNo:string) => {
        const newTrains = trains.filter(train => train.key !== trainNo);
        setTrains(newTrains);
    }

    return <div>
        {trains.map(
            train => <Train 
            railload={train.railload} 
            timeTable={train.timeTable} 
            delTrain={delTrain}
            date={prop.date}
            key={train.key}
            /> 
    )}</div>;    
}

//現在時刻と一致する出発時刻を持つ列車を検索し、trainPropの配列を返す
const getDepTrains = (date:dayjs.Dayjs, railload:Railload, timeTables:timeTable[]):trainProp[] => {
    let curr = date.format("HH:mm:ss");
    const depTrains:trainProp[] = [];

    for (let i = 0; i < timeTables.length; i++) {
        // 現在時刻と一致する出発時刻を持つ列車を返す
        if(curr === timeTables[i].tt[0].d) {
            depTrains.push({"railload":railload,"timeTable":timeTables[i],"key":timeTables[i].trainNo});
        }
    }
    return depTrains;
}
