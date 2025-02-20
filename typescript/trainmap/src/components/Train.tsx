import { useEffect, useRef, useState } from "react";
import { Marker } from "react-leaflet";
import { Railload } from "../types/railload";

interface Prop {
    railload:Railload
}
export const Train = (prop:Prop) => {
    const initialPosition: number[] = [35.0056828, 137.0397465];
    //レンダリング用の座標変数
    const [position, setPosition] = useState<number[]>(initialPosition);
    //setPositionでpositionを変更しても即座に反映されないため，別の変数で管理する
    const prevPosition = useRef<number[]>([35.0056828, 137.0397465]);
    //最後に通過したJSON上の座標のインデックス
    const prevChkPointIndex = useRef<number>(0);
    //現在までに通過してきた線路のsection情報
    const railChkPoints = useRef<number[][]>([[]]);
    //現在参照しているsectionのID
    const sectionID = useRef<number>(0);
    //setIntervalのID
    const intervalID = useRef<number>();
    const railload:Railload = prop.railload;
    useEffect(() => {
        //JSONがロードたら実行
        if(railload.sections.length!==0 || railload.stations.length!==0) {
        //JSONからのデータをrailChkPointsへコピー
        sectionID.current = 0;
        railChkPoints.current = railload.sections[sectionID.current].coords.map(coord => coord as number[]);
        //更新周期(msec)
        const mtime = 16;
        const distToMove = 0.0001;
        intervalID.current = setInterval(()=>{
            calcNextPosition(distToMove);
        }, mtime);
        return ()=> clearInterval(intervalID.current);
        }
    },[railload]);

    //distToMove:次の更新で進む距離, intervalID:setIntervalのID
    const calcNextPosition = (distToMove:number) => {
        //Sectionの最後のChkpointを通過したら
        if(prevChkPointIndex.current >= railChkPoints.current.length-1) {
            sectionID.current++;
            //sectionの末端まで到達したらsetIntervalを解除(終着駅に着いた後の処理の条件)
            if(sectionID.current > railload.sections.length-1) {
                clearInterval(intervalID.current);
                console.log(railChkPoints.current);
                return;
            }

            //Sectionを切り替えるときにこれまで通過してきたChkPointsは不要なので最後に通過したChkPointを残して消去する
            railChkPoints.current = [railChkPoints.current[railChkPoints.current.length-1]];
            railChkPoints.current = railChkPoints.current.concat(railload.sections[sectionID.current].coords.map(coord => coord as number[]));
            //railChkPointsを圧縮するとともにそれを参照するindexも値をリセットする
            prevChkPointIndex.current = 0;

        }
        const prevCheckPoint:number[] = railChkPoints.current[prevChkPointIndex.current];
        const nextCheckPoint:number[] = railChkPoints.current[prevChkPointIndex.current+1];
        //現在位置を挟む2つのチェックポイント間の距離
        const distChkPoint = getDist(prevCheckPoint, nextCheckPoint);
        //現在位置から次のチェックポイントまでの距離
        const distPositionToNext = getDist(prevPosition.current, nextCheckPoint);

        if(distToMove > distPositionToNext) {
            prevPosition.current = nextCheckPoint;
            prevChkPointIndex.current += 1;
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

