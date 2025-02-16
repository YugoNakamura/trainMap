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
    //状態管理用の座標変数
    const prevPosition = useRef<number[]>([35.0056828, 137.0397465]);
    //最後に通過したJSON上のの座標
    const prevChkPointIndex = useRef<number>(0);
    const animationRef = useRef(0);
    const lastTimeRef = useRef<number>(0);
    const railChkPoints = useRef<number[][]>([[]]);
    //現在参照しているsectionのID
    const sectionID = useRef<number>(0);
    //setIntervalのID
    const intervalID = useRef<number>();

    const railload:Railload = prop.railload;
    useEffect(() => {
        //JSONがロードたら実行
        if(railload.sections.length!==0 || railload.stations.length!==0) {
            //Markerを動かす
/*            animationRef.current = requestAnimationFrame(moveMarker);
            return () => {
                cancelAnimationFrame(animationRef.current)
            };*/
            sectionID.current = 0;
            railload.sections[sectionID.current].coords.map((coord)=>{railChkPoints.current.push(coord as number[])});
            //更新周期(msec)
            const mtime = 16;
            const distToMove = 0.00001;
            intervalID.current = setInterval(()=>{
                calcNextPosition(distToMove);
            }, mtime);
            return ()=> clearInterval(intervalID.current);
        }
    },[railload]);

/*    const moveMarker = (time:number)=>{
        //前回実行してからの経過時間(sec)
        const deltaTime = (time - lastTimeRef.current)/1000;
        lastTimeRef.current = time;
        //車両の進行速度(km/h)
        const speed = 0.001;
        const distToMove = speed*deltaTime;

        calcNextPosition(distToMove, prevChkPointIndex.current);
        animationRef.current = requestAnimationFrame(moveMarker);
    };*/

    //distToMove:次の更新で進む距離, intervalID:setIntervalのID
    const calcNextPosition = (distToMove:number) => {
        //prevChkPointIndexによる参照箇所がrailChkPointsの末端になったら
        if(prevChkPointIndex.current >= railChkPoints.current.length-1) {
            sectionID.current++;
            //sectionの末端まで到達したらsetIntervalを解除
            if(sectionID.current > railload.sections.length-1) {
                clearInterval(intervalID.current);
                return;
            } 
            railload.sections[sectionID.current].coords.map((coord)=>{railChkPoints.current.push(coord as number[])});
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
            setPosition([newLat, newLng]);
            prevPosition.current = [newLat, newLng];
        }
        return;
    }

    const getDist = (coord1:number[], coord2:number[]) => {
        return Math.sqrt((coord2[0]-coord1[0])**2+(coord2[1]-coord1[1])**2);        
    }

    return (
        <Marker position={[position[0], position[1]]} />
    );

}

