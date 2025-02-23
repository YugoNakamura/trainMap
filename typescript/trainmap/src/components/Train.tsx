import { useEffect, useRef, useState } from "react";
import { Marker } from "react-leaflet";
import { Railload, Section, Station } from "../types/railload";

interface Prop {
    railload:Railload,
    depStaName:string,
    desStaName:string,
}
export const Train = (prop:Prop) => {
    //出発駅と終着駅を取得
    const sections:Section[] = prop.railload.sections;
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

    //走行しているsection番号
    const sectionID = useRef<number>(-1);
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
        //sectionIDの初期設定
        if(isInBound) {sectionID.current = sections.findIndex(section=>section.coords[0].toString() === stations[depStaNo].coord.toString());}
        else {sectionID.current = sections.findIndex(section=>section.coords[section.coords.length-1].toString() === stations[depStaNo].coord.toString());}
        if (sectionID.current===-1) throw new Error("Section Data Load Failed");

        //railChkPointsの初期設定
        if(isInBound) {railChkPoints.current = sections[sectionID.current].coords;}
        else {railChkPoints.current = sections[sectionID.current].coords.slice().reverse();}

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

            if (isInBound) {sectionID.current = sections.findIndex(section=>section.id === sections[sectionID.current].next);}
            else {sectionID.current = sections.findIndex(section=>section.id === sections[sectionID.current].prev);}
            if (sectionID.current===-1) throw new Error("Section Data Load Failed");

            //Sectionを切り替えるときにこれまで通過してきたChkPointsは不要なので最後に通過したChkPointを残して消去する
            railChkPoints.current = [railChkPoints.current[railChkPoints.current.length-1]];
            if(isInBound){railChkPoints.current = railChkPoints.current.concat(sections[sectionID.current].coords);}
            else {railChkPoints.current = railChkPoints.current.concat(sections[sectionID.current].coords.slice().reverse());}
            //railChkPointsを圧縮するとともにそれを参照するindexも値をリセットする
            railChkPointsIndex.current = 0;
        }
        const prevCheckPoint:number[] = railChkPoints.current[railChkPointsIndex.current];
        const nextCheckPoint:number[] = railChkPoints.current[railChkPointsIndex.current+1];

        //現在位置を挟む2つのチェックポイント間の距離
        const distChkPoint = getDist(prevCheckPoint, nextCheckPoint);
        //現在位置から次のチェックポイントまでの距離
        const distPositionToNext = getDist(prevPosition.current, nextCheckPoint);

        if(distToMove > distPositionToNext) {
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

    //2点間の距離を算出
    const getDist = (coord1:number[], coord2:number[]) => {
        return Math.sqrt((coord2[0]-coord1[0])**2+(coord2[1]-coord1[1])**2);        
    }

    return (
        <Marker position={[position[0], position[1]]}/>
    );

}

