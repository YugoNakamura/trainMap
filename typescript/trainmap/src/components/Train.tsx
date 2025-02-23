import { useEffect, useRef, useState } from "react";
import { Marker } from "react-leaflet";
import { Railload } from "../types/railload";

interface Prop {
    railload:Railload,
    depStaName:string,
    desStaName:string,
}
export const Train = (prop:Prop) => {
    const railload:Railload = prop.railload;
    const depSta = railload.stations.find(station => station.name_en===prop.depStaName);
    if (depSta===undefined) throw new Error("Station Data Load Failed");
    const desSta = railload.stations.find(station => station.name_en===prop.desStaName);
    if (desSta===undefined) throw new Error("Station Data Load Failed");

    //現在の緯度経度
    //レンダリング用の座標変数
    const [position, setPosition] = useState<number[]>(depSta.coord);
    //setPositionでpositionを変更しても即座に反映されないため，別の変数で管理する
    const prevPosition = useRef<number[]>(depSta.coord);

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

    const secID = railload.sections.findIndex(section=>section.coords[0].toString() === depSta.coord.toString());
    if (secID===-1) throw new Error("Section Data Load Failed");
    //現在参照しているsectionのID
    const sectionID = useRef<number>(secID);

    //setIntervalのID
    const intervalID = useRef<number>();
    useEffect(() => {
        //JSONからのデータをrailChkPointsへコピー
        railChkPoints.current = railload.sections[sectionID.current].coords;

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
            if(railChkPoints.current[railChkPointsIndex.current].toString() === desSta.coord.toString()) {
                clearInterval(intervalID.current);
                return;
            }
            const secID = railload.sections.findIndex(section=>section.id === railload.sections[sectionID.current].next);
            if (secID===-1) throw new Error("Section Data Load Failed");
            sectionID.current=secID;

            //Sectionを切り替えるときにこれまで通過してきたChkPointsは不要なので最後に通過したChkPointを残して消去する
            railChkPoints.current = [railChkPoints.current[railChkPoints.current.length-1]];
            railChkPoints.current = railChkPoints.current.concat(railload.sections[sectionID.current].coords);
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

