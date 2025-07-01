import { useEffect, useRef, useState } from "react";
import { Railload } from "../types/railload"
import { timeTable } from "../types/timeTable"
import {Train} from "./Train"

interface Prop {
    speedRate:number,
    date:Date
}

export const TrainScheduler = (prop:Prop) => {
    const railload = useRef<Railload>({"sections": [], "stations": [], "switchPoints": []});
    const tt = useRef<timeTable[]>([]);
    const isLoaded = useRef<boolean>(false);
    const [trains, setTrains] = useState<JSX.Element[]>([]);

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
            tt.current = data[1] as timeTable[];
            isLoaded.current = true;
        });
    }, []);

    useEffect(() => {
        if(!isLoaded.current) return;
        const addTrains = depTrains(prop.date, railload.current, tt.current, prop.speedRate);
        addTrains.map(addTrain => {
            trains.push(addTrain);
            setTrains(trains);
        });
    }, [prop.date]);
    return <div>{trains}</div>;    
}

const depTrains = (date:Date, railload:Railload, tt:timeTable[], speedRate:number):JSX.Element[] => {
    let currHour = date.getHours();
    let currMinute = date.getMinutes();
    let currSecond = date.getSeconds();
    const trains:JSX.Element[] = [];

    for (let i = 0; i < tt.length; i++) {
        let depTime = tt[i].tt[0].d;
        let depHour = Number(depTime.split(":")[0]);
        let depMinute = Number(depTime.split(":")[1]);
        if(currHour === depHour && currMinute === depMinute && currSecond === 0) {
            // 現在時刻と一致する出発時刻を持つ列車を返す
            trains.push(<Train railload={railload} timeTable={tt[i]} speedRate={speedRate} key={tt[i].trainNo}/>);
        }
    }
    return trains;
}
