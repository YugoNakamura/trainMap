import { useEffect, useRef, useState } from "react";
import { Marker, Popup } from "react-leaflet";
import { Railload, Section, Station } from "../types/railload";

interface Prop {
    railload:Railload,
    depStaName:string,
    desStaName:string,
}
export const Train = (prop:Prop) => {
    //station, sectionのmap化
    const sections = new Map(prop.railload.sections.map(section => [section.id, section]));
    //走行しているsectionID
    const sectionID = useRef<string>('');
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

    //更新周期(msec)
    const frameRate = 17;

    const distance = useRef(0);
    //速度制御用インスタンス
    const speedControler = new SpeedControler(frameRate);
    //setIntervalのID
    const intervalID = useRef<number>();
    useEffect(() => {
        //railChkPointsの初期設定
        [railChkPoints.current, sectionID.current, distance.current] = 
            getNextSection(isInBound, sections, stations[depStaNo]);
        speedControler.setNextSection(distance.current, 10*1000);
        //mtime周期でspeedだけ移動させる
        intervalID.current = setInterval(()=>{
            calcNextPosition(speedControler.getSpeed());
        }, frameRate);

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
            [railChkPoints.current, sectionID.current, distance.current] = 
                getNextSection(isInBound, sections, sections.get(sectionID.current));
            railChkPointsIndex.current = 0;

            //次のsection間の加減速設定
            speedControler.setNextSection(distance.current, 10*1000);
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
        <Marker position={[position[0], position[1]]}><Popup>Train</Popup></Marker>
    );
}

// 次の駅までのsectionを追加
const getNextSection = (isInBound:boolean, sections:Map<string, Section>, currSection:Section|Station|undefined):[number[][], string, number] => {
    if (!currSection) throw new Error("input was undefined");
    //返り値にするsectionのidを取得してget
    const secID = isInBound ? currSection.next : currSection.prev;
    const sec = sections.get(secID);
    if (!sec) throw new Error("Section Data Load Failed");

    if(isInBound) {return [sec.coords, secID, sec.distance];}
    else {return [sec.coords.slice().reverse(), secID, sec.distance];}
}

//2点間の距離を算出
const getDist = (coord1:number[], coord2:number[]) => {
    return Math.sqrt((coord2[0]-coord1[0])**2+(coord2[1]-coord1[1])**2);        
}

class SpeedControler {
    speed:number = 0;
    //加減速時間(msec)
    accelTime:number = 2*1000;

    //駅間の距離
    distance:number = 0;
    //駅間の移動時間(msec)
    arriveTime:number = 0;
    //画面更新の周期(msec)
    frameRate:number;
    //定速移動時の速度
    constantSpeed:number = 0;
    //加減速時間中の速度の変化量((constantSpeed/accelTime)*frameRate)
    accelRate:number = 0;
    //現在の加減速の状態を表す(減速:-1, 定速:0, 加速:1)
    ACCEL = 1 as const;
    CONST = 0 as const;
    DECEL = -1 as const;
    accelState:number = 0;

    //setTimeoutを管理するID
    accelTimeoutID:number = -1;
    constTimeoutID:number = -1;
    decelTimeoutID:number = -1;

    constructor(frameRate:number) {
        this.frameRate = frameRate;
    }

    setNextSection(distance:number, arriveTime:number) {
        this.distance = distance;
        this.arriveTime = arriveTime;
        this.constantSpeed = this.distance/(this.arriveTime-this.accelTime)*this.frameRate;
        this.accelRate = this.constantSpeed/this.accelTime*this.frameRate;

        clearTimeout(this.accelTimeoutID);
        clearTimeout(this.constTimeoutID);
        clearTimeout(this.decelTimeoutID);

        this.speed = 0;
        //加速時間
        this.accelState = this.ACCEL;
        this.accelTimeoutID = setTimeout(() =>{
            this.accelState = this.CONST;
        }, (this.accelTime+this.frameRate));
        //定速時間
        this.constTimeoutID = setTimeout(() =>{
            this.accelState = this.DECEL;
        }, (this.arriveTime-this.accelTime+this.frameRate));
        //減速時間
        this.decelTimeoutID = setTimeout(() =>{
            this.accelState = this.CONST;
            //計算誤差でsectionの終了直前に
            this.speed = 0.0001;
        }, (this.arriveTime+this.frameRate));
    }

    getSpeed = ():number => {
        this.speed += this.accelRate*this.accelState;
        return this.speed;
    }
}
