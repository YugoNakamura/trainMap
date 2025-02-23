import { useEffect, useState } from "react";
import { Railload } from "../types/railload"
import { Train } from "./Train";

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
        const trains:JSX.Element[] = [
            <Train railload={railload} depStaName='Chiryuu' desStaName='Hekinan' key={1}/>,
            <Train railload={railload} depStaName='Hekinan' desStaName='Chiryuu' key={2}/>
        ]
        return <div>{trains}</div>
    }
    
}