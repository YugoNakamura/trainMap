import { useEffect, useRef, useState } from "react";
import { Marker, Popup } from "react-leaflet";
import { Railload, Section, Station, SwitchPoint } from "../types/railload";
import { timeTable} from "../types/timeTable";
import L from "leaflet";

interface Prop {
    railload:Railload,
    timeTable:timeTable
    speedRate:number
    delTrain:(trainNo:string) => void
    date:Date
    frameRate:number
}

//station:駅
//switchPoint:線路の分岐点
//railCoords:駅と駅を結ぶ線路の座標配列
export const Train = (prop:Prop) => {

    //station, sectionのmap化
    const sections = new Map(prop.railload.sections.map(section => [section.id, section]));
    //出発駅と終着駅を取得
    const stations = new Map(prop.railload.stations.map(station => [station.id, station]));
    //出発駅
    const fromSta = stations.get(prop.timeTable.fromStaId);
    if (!fromSta) throw new Error("Station Data Load Failed");
    //終着駅
    const toSta = stations.get(prop.timeTable.toStaId);
    if (!toSta) throw new Error("Station Data Load Failed");

    //現在時刻
    const date = useRef<Date>(prop.date);
    //timetable
    const tt = prop.timeTable.tt;
    //走行しているtimeTableのインデックス
    const ttIdx = useRef(0);
    //分岐点をmap化
    const switchPoints = new Map(prop.railload.switchPoints.map(switchPoints => [switchPoints.id, switchPoints]));

    //上り:true, 下り:false
    const isInBound:boolean = prop.timeTable.bound;

    //現在の緯度経度
    //レンダリング用の座標変数
    const [renderPos, setRenderPos] = useState<number[]>(fromSta.coord);
    //setPositionでpositionを変更しても即座に反映されないため，別の変数で管理する
    const position = useRef<number[]>(fromSta.coord);

    //トレースする座標配列
    const railCoords = useRef<number[][]>([[]]);
    //通過したrailCoordsのインデックス
    const railCoordsIdx = useRef<number>(0);

    //駅間の距離
    const distance = useRef<number>(0);

    //setIntervalのID
    const intervalID = useRef<number>();

    //速度制御用インスタンス
    const speedControler = useRef<SpeedControler>(new SpeedControler(prop.frameRate));
    speedControler.current.setSpeedRate(prop.speedRate);
    
    //初回のみ実行
    useEffect(() => {
        //railCoordsの初期設定
        [railCoords.current, distance.current] = 
            getNextRailCoords(
                isInBound, 
                sections, 
                stations, 
                switchPoints, 
                tt[ttIdx.current].s, //出発駅ID
                tt[ttIdx.current+1].s //到着駅ID
            );
        speedControler.current.setNextDistance(
            distance.current, 
            getTimeDiff(date.current, tt[ttIdx.current+1].a)
        );
        ttIdx.current += 1;

        //mtime周期でspeedだけ移動させる
        /*intervalID.current = setInterval(()=>{
            calcNextPosition(speedControler.current.getSpeed(), date.current);
        }, frameRate);*/

        return ()=> clearInterval(intervalID.current);
    },[]);

    useEffect(() => {
        //console.log(prop.date.toString());
        calcNextPosition(speedControler.current.getSpeed(), prop.date);
    }, [prop.date]);

    //進行距離とそれを挟むchkPointをもとに次の列車の位置を計算
    //distToMove:次のレンダリングで進む距離
    //position:次のレンダリング時の列車の位置
    //chkPoint:OSMから取得した線路の緯度経度
    const calcNextPosition = (distToMove:number, date:Date) => {
        //駅に到着したら
        if(railCoordsIdx.current >= railCoords.current.length-1) {
            //終着駅に到着したら
            if(railCoords.current[railCoordsIdx.current].toString() === toSta.coord.toString()) {
                clearInterval(intervalID.current);
                prop.delTrain(prop.timeTable.trainNo);
                return;
            }

            //次の駅間の座標情報と駅間距離を取得
            [railCoords.current, distance.current] = 
                getNextRailCoords(
                    isInBound, 
                    sections, 
                    stations, 
                    switchPoints, 
                    tt[ttIdx.current].s, 
                    tt[ttIdx.current+1].s
                );
            railCoordsIdx.current = 0;
            //次の駅間の加減速設定
            speedControler.current.setNextDistance(distance.current, getTimeDiff(date, tt[ttIdx.current+1].a));
            ttIdx.current += 1;
        }

        const prevChkPoint:number[] = railCoords.current[railCoordsIdx.current];
        const nextChkPoint:number[] = railCoords.current[railCoordsIdx.current+1];
        //現在位置を挟む2つのチェックポイント間の距離
        const distChkPoint = getDist(prevChkPoint, nextChkPoint);
        //現在位置から次のチェックポイントまでの距離
        const distToNext = getDist(position.current, nextChkPoint);

        if(distToMove > distToNext) {
            setRenderPos(nextChkPoint);
            position.current = nextChkPoint;
            railCoordsIdx.current += 1;
            calcNextPosition(distToMove-distToNext, date);
        } else {
            //前のチェックポイントから現在位置までの距離
            const distToPrev = distChkPoint-distToNext;
            //チェックポイント間の距離中の進行割合
            const progressRate = (distToPrev+distToMove)/distChkPoint;
            const newLat = prevChkPoint[0]+(nextChkPoint[0]-prevChkPoint[0])*progressRate;
            const newLng = prevChkPoint[1]+(nextChkPoint[1]-prevChkPoint[1])*progressRate;
            //setPositionでpositionを変更しても即座に反映されないため，別の変数で管理する
            setRenderPos([newLat, newLng]);
            position.current = [newLat, newLng];
        }
        return;
    }

    const customIcon = L.icon({
        iconUrl: './asset/trainIcon.svg',
        iconSize: [30, 30], // アイコンのサイズ
        iconAnchor: [15, 15], // アイコンのアンカー位置
    });
    return (
        <Marker position={[renderPos[0], renderPos[1]]} icon={customIcon}><Popup>Train</Popup></Marker>
    );
}

//section:駅または分岐点間を結ぶ線路
// 次の駅間の座標配列と距離を取得
const getNextRailCoords = (
    isInBound:boolean, //上り:true, 下り:false
    sections:Map<string, Section>, //sectionIDをkeyとするmap
    stations:Map<string, Station>, //stationIDをkeyとするmap
    switches:Map<string, SwitchPoint>, //switchIDをkeyとするmap
    depStaID:string, //出発駅ID
    desStaID:string //目的駅ID
):[number[][], number] => {
    //駅間の座標配列
    let nextRailCoords:number[][] = [];
    //駅間距離
    let dist = 0;

    let postSecID = "";
    let depSta = stations.get(depStaID);
    if (!depSta) throw new Error("Station Data Load Failed");

    //次に進むべきSectionID
    //上りならnext，下りならprev
    let secID = isInBound ? depSta.next : depSta.prev;
    while(true) {
        let sec = sections.get(secID);
        if (!sec) throw new Error("Section Data Load Failed");

        //次に進むべきSectionの座標配列を取得
        let coords = isInBound ? sec.coords : sec.coords.reverse();
        coords.forEach(coord => nextRailCoords.push(coord));
        dist += sec.distance;
        postSecID = secID;

        //次のポイント(分岐点もしくは駅)のIDを取得
        let pointID = isInBound ? sec.next : sec.prev;
        //次のポイントが分岐点なら、分岐点の情報から次に進むべきSectionIDを取得
        if(switches.has(pointID)) {
            let switchPoint = switches.get(pointID);
            if (!switchPoint) throw new Error("Switch Data Load Failed");
            secID = getNextSecID(switchPoint, postSecID, desStaID);
        //次のポイントが駅なら、目的駅かどうかを確認して、線路座標と距離を返す
        } else if(pointID === desStaID) {
            return [nextRailCoords, dist];
        }
    }
}

// 線路の分岐点(Switches)において、通過したSectionのID(prevSecID)と目的駅ID(desStaID)から、次に進むべきSectionのIDを取得
const getNextSecID = (switchPoint:SwitchPoint, prevSecID:string, desStaID:string):string => {
    let nextSecID = "";
    //switchPointにおいてprevSecIDから出発する方向の分岐点の情報を取得
    let dirs = switchPoint.direction.filter(function(dir) {
        return dir.from === prevSecID
    });

    for(let i = 0; i < dirs.length; i++) {
        //Yの字型の分岐炉で根元から進行する場合:condition:"none"
        //Yの字型の分岐点で枝から進行する場合:conditionに目的駅IDを含む
        if(dirs[i].condition === "none" || dirs[i].condition.includes(desStaID)) {
            nextSecID = dirs[i].to;
        }
    }
    return nextSecID;
}

//2点間の距離を算出
const getDist = (coord1:number[], coord2:number[]) => {
    return Math.sqrt((coord2[0]-coord1[0])**2+(coord2[1]-coord1[1])**2);        
}

// 時刻の差をミリ秒で取得
//from:現在時刻, to:時刻表の出発時刻
const getTimeDiff = (from:Date, to:string):number => {
    const [fromHour, fromMin, fromSec] = [from.getHours(), from.getMinutes(), from.getSeconds()];
    const [toHour, toMin] = to.split(":").map(Number);
    console.log(`from: ${fromHour}:${fromMin}:${fromSec}, to: ${toHour}:${toMin}`);
    let fromTime = fromHour * 60 * 60 + fromMin * 60 + fromSec;
    let toTime = toHour * 60 * 60 + toMin * 60;
    if (toTime < fromTime) {
        toTime += 24 * 60 * 60; // 翌日の時間に調整
    }
    return (toTime - fromTime) * 1000; // ミリ秒に変換
}


class SpeedControler {
    speed:number = 0;
    speedRate:number = 1; //速度倍率
    //加減速時間(msec)
    accelTime:number = 2*1000;
    //加速区間の距離
    accDist:number = 0;
    //積算走行距離
    sumDist = 0;

    //駅間の距離
    staDist:number = 0;
    //駅間の移動時間(msec)
    arriveTime:number = 0;
    //画面更新の周期(msec)
    frameRate:number;
    //定速移動時の速度
    constantSpeed:number = 0;
    //加減速時間中の速度の変化量((constantSpeed/accelTime)*frameRate)
    accelRate:number = 0;

    constructor(frameRate:number) {
        this.frameRate = frameRate;
    }

    setSpeedRate = (speedRate:number) => {
        this.speedRate = speedRate;
    }

    setNextDistance(distance:number, arriveTime:number) {
        this.staDist = distance;
        this.arriveTime = arriveTime;
        this.constantSpeed = this.staDist/(this.arriveTime-(this.accelTime*2))*this.frameRate;
        this.accelRate = this.constantSpeed/(this.accelTime/this.frameRate);

        this.accDist = this.accelTime/this.frameRate * this.constantSpeed / 2;

        this.sumDist = 0;
        this.speed = 0;
    }

    getSpeed = ():number => {
        if(this.sumDist <= this.accDist) {
            this.speed += this.accelRate;
            if(this.speed > this.constantSpeed) {
                this.speed = this.constantSpeed;
            }
        } else if(this.sumDist <= this.staDist-this.accDist) {
            this.speed = this.constantSpeed;
        } else {
            this.speed -= this.accelRate;
            if(this.speed < 0) {
                this.speed = 0.0001;
            }
        }
        this.sumDist += this.speed * this.speedRate;
        return this.speed * this.speedRate;
    }
}
