import { useEffect, useRef, useState } from "react";
import { Marker } from "react-leaflet";
import { Railload, Section, Station } from "../types/railload";

interface Prop {
    railload:Railload,
    depStaName:string,
    desStaName:string,
}
export const Train = (prop:Prop) => {
    //station, sectionのmap化
    const sections = new Map(prop.railload.sections.map(section => [section.id, section]));
    //走行しているsection番号
    const sectionID = useRef<string>('');
//    const sections:Section[] = prop.railload.sections;
    //出発駅と終着駅を取得
    const stations:Station[] = prop.railload.stations;
    //出発駅
    const depStaNo = stations.findIndex(station => station.name_en===prop.depStaName);
    if (depStaNo===-1) throw new Error("Station Data Load Failed");
    //終着駅
    const desStaNo = stations.findIndex(station => station.name_en===prop.desStaName);
    if (desStaNo===-1) throw new Error("Station Data Load Failed");

    //上りか下りか
    const isInBound:boolean = desStaNo > depStaNo;

    //現在の緯度経度
    //レンダリング用の座標変数
    const [position, setPosition] = useState<number[]>(stations[depStaNo].coord);
    //setPositionでpositionを変更しても即座に反映されないため，別の変数で管理する
    const prevPosition = useRef<number[]>(stations[depStaNo].coord);

    //トレースする座標配列
    const railChkPoints = useRef<number[][]>([[]]);
    //通過したrailChkPointsのインデックス
    const railChkPointsIndex = useRef<number>(0);

    //更新周期ごとにspeedだけ移動
    const speed = useRef(0.0001);
    //更新周期(msec)
    const mtime = 50;
    //駅間の移動時間(sec)
    const timeToSta = 10
    //加速度
    const accRate = useRef(0);
    //加速or定速
    const isAccel = useRef(false);

    //setIntervalのID
    const intervalID = useRef<number>();
    useEffect(() => {
        //railChkPointsの初期設定
        [railChkPoints.current, sectionID.current] = addNextSection(isInBound, sections, stations[depStaNo]);

        //mtime周期でspeedだけ移動させる
        intervalID.current = setInterval(()=>{
            calcNextPosition(speed.current);
        }, mtime);
        return ()=> clearInterval(intervalID.current);
    },[]);

    //distToMove:次の更新で進む距離, intervalID:setIntervalのID
    const calcNextPosition = (distToMove:number) => {
        //Sectionの最後のChkpointを通過したら
        if(railChkPointsIndex.current >= railChkPoints.current.length-1) {
            //指定した終着駅に到着したら
            if(railChkPoints.current[railChkPointsIndex.current].toString() === stations[desStaNo].coord.toString()) {
                clearInterval(intervalID.current);
                return;
            }

            //次のSectionの座標情報とsectionIDを受け取る
            [railChkPoints.current, sectionID.current] = addNextSection(isInBound, sections, sections.get(sectionID.current));
            railChkPointsIndex.current = 0;
        }
        const prevCheckPoint:number[] = railChkPoints.current[railChkPointsIndex.current];
        const nextCheckPoint:number[] = railChkPoints.current[railChkPointsIndex.current+1];

        //現在位置を挟む2つのチェックポイント間の距離
        const distChkPoint = getDist(prevCheckPoint, nextCheckPoint);
        //現在位置から次のチェックポイントまでの距離
        const distPositionToNext = getDist(prevPosition.current, nextCheckPoint);

        if(distToMove > distPositionToNext) {
            setPosition(nextCheckPoint);
            prevPosition.current = nextCheckPoint;
            railChkPointsIndex.current += 1;
            calcNextPosition(distToMove-distPositionToNext);
        } else {
            //前のチェックポイントから現在位置までの距離
            const distPrevToPosition = distChkPoint-distPositionToNext;
            //チェックポイント間の距離中の進行割合
            const progressRate = (distPrevToPosition+distToMove)/distChkPoint;
            const newLat = prevCheckPoint[0]+(nextCheckPoint[0]-prevCheckPoint[0])*progressRate;
            const newLng = prevCheckPoint[1]+(nextCheckPoint[1]-prevCheckPoint[1])*progressRate;
            //setPositionでpositionを変更しても即座に反映されないため，別の変数で管理する
            setPosition([newLat, newLng]);
            prevPosition.current = [newLat, newLng];
        }
        return;
    }

    return (
        <Marker position={[position[0], position[1]]}/>
    );

}

// 次の駅までのsectionを追加
const addNextSection = (isInBound:boolean, sections:Map<string, Section>, currSection:Section|Station|undefined):[number[][], string] => {
    if (!currSection) throw new Error("input was undefined");
    //返り値にするsectionのidを取得してget
    const secID = isInBound ? currSection.next : currSection.prev;
    const sec = sections.get(secID);
    if (!sec) throw new Error("Section Data Load Failed");

    if(isInBound) {return [sec.coords, secID];}
    else {return [sec.coords.slice().reverse(), secID];}
}

//2点間の距離を算出
const getDist = (coord1:number[], coord2:number[]) => {
    return Math.sqrt((coord2[0]-coord1[0])**2+(coord2[1]-coord1[1])**2);        
}