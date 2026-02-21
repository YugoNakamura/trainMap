import { useEffect, useRef, useState } from "react";
import { Railload } from "../types/railload"
import { timeTable } from "../types/timeTable"
import {Train} from "./Train"

interface Prop {
    speedRate:number,
    date:Date,
    frameRate:number
}

interface trainProp {
    railload:Railload,
    timeTable:timeTable,
    speedRate:number,
    key:string
}

export const TrainScheduler = (prop:Prop) => {
    const railload = useRef<Railload>({"sections": [], "stations": [], "switchPoints": []});
    const timeTables = useRef<timeTable[]>([]);
    const isLoaded = useRef<boolean>(false);
    //運行中の列車
    const [trains, setTrains] = useState<trainProp[]>([]);

    useEffect(()=>{
        const trPromise = fetch('./trainRoute/mikawaLine.json');
        const ttPromise = fetch('./timeTable/mikawaLine.json');
        Promise.all([trPromise, ttPromise])
        .then(responses => {
            if(!responses[0].ok) throw new Error(`TrainRoute HTTP error! status: ${responses[0].status}`);
            if(!responses[1].ok) throw new Error(`TimeTable HTTP error! status: ${responses[1].status}`);
            return Promise.all([responses[0].json(), responses[1].json()]);
        })
        .then(data => {
            railload.current = data[0] as Railload;
            timeTables.current = data[1] as timeTable[];
            isLoaded.current = true;
        });
    }, []);

    useEffect(() => {
        //データがロードされていない場合は処理しない
        if(!isLoaded.current) return;
        const addTrains = getDepTrains(prop.date, railload.current, timeTables.current, prop.speedRate);
        //始発する列車を運行中の列車に追加
        addTrains.map(addTrain => {
            trains.push(addTrain);
            setTrains(trains);
        });
    }, [prop.date.getSeconds()]);

    useEffect(() => {
        const newTrain = trains.map((train) => {
            train.speedRate = prop.speedRate;
            return train;
        });
        setTrains(newTrain);
    }, [prop.speedRate]);

    const delTrain = (trainNo:string) => {
        const newTrains = trains.filter(train => train.key !== trainNo);
        setTrains(newTrains);
    }

    return <div>
        {trains.map(
            train => <Train 
            railload={train.railload} 
            timeTable={train.timeTable} 
            speedRate={train.speedRate} 
            delTrain={delTrain}
            date={prop.date}
            frameRate={prop.frameRate}
            key={train.key}
            /> 
    )}</div>;    
}

//現在時刻と一致する出発時刻を持つ列車を検索し、trainPropの配列を返す
const getDepTrains = (date:Date, railload:Railload, timeTables:timeTable[], speedRate:number):trainProp[] => {
    let currHour = date.getHours();
    let currMinute = date.getMinutes();
    let currSecond = date.getSeconds();
    const depTrains:trainProp[] = [];

    for (let i = 0; i < timeTables.length; i++) {
        //始発駅の出発時間
        let depTime = timeTables[i].tt[0].d;
        let depHour = Number(depTime.split(":")[0]);
        let depMinute = Number(depTime.split(":")[1]);
        // 現在時刻と一致する出発時刻を持つ列車を返す
        if(currHour === depHour && currMinute === depMinute && currSecond === 0) {
            depTrains.push({"railload":railload,"timeTable":timeTables[i],"speedRate":speedRate,"key":timeTables[i].trainNo});
        }
    }
    return depTrains;
}
