import { useEffect, useState } from "react";
import { Railload } from "../types/railload"
import { TimeTable } from "../types/timeTable"
import {Train} from "./Train"
import dayjs from 'dayjs';


interface Prop {
    railload:Railload,
    timeTables:TimeTable[],
    date:dayjs.Dayjs,
}

interface trainProp {
    railload:Railload,
    timeTable:TimeTable,
    key:string
}

export const TrainScheduler = (prop:Prop) => {
    //運行中の列車
    const [trains, setTrains] = useState<trainProp[]>([]);

    //1分ごとに現在時刻と一致する出発時刻を持つ列車を検索し、運行中の列車に追加する
    useEffect(() => {
        let runningTrains = getRunningTrains(prop.date, prop.railload, prop.timeTables);
        setTrains(runningTrains);
    }, [prop.date.getMinuteFromDay()]);

    return <div>
        {trains.map(
            train => <Train 
            railload={train.railload} 
            timeTable={train.timeTable} 
            date={prop.date}
            key={train.key}
            /> 
    )}</div>;    
}

const getRunningTrains = (date:dayjs.Dayjs, railload:Railload, timeTables:TimeTable[]) => {
    let trainProps:trainProp[] = [];
    for (let i = 0; i < timeTables.length; i++) {
        if(date.isHMSSameOrAfter(timeTables[i].tt[0].d) && date.isHMSBefore(timeTables[i].tt[timeTables[i].tt.length - 1].a)) {
            trainProps.push({
                "railload":railload,
                "timeTable":timeTables[i],
                "key":timeTables[i].trainNo
            });
        }
    }
    return trainProps;
}
