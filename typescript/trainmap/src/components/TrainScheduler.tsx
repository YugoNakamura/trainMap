import { useEffect, useState } from "react";
import { Railload } from "../types/railload"
import { Train } from "./Train";

interface Prop {
    railload:Railload
}
export const TrainScheduler = () => {
    const [railload, setRailload] = useState<Railload>();

    useEffect(()=>{
        fetch('./trainRoute/mikawaLine.json')
        .then(response => response.json())
        .then(data => setRailload(data));
    }, []);

    //JSONの読み込みが完了したらTrainを呼び出す
    if(railload === undefined) {
        return <div></div>
    } else {
        return <Train railload={railload}/>
    }
    
}