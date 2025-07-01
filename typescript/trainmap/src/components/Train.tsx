import { useEffect, useRef, useState } from "react";
import { Marker, Popup } from "react-leaflet";
import { Railload, Section, Station, SwitchPoint } from "../types/railload";
import { timeTable} from "../types/timeTable";
import L from "leaflet";

interface Prop {
    railload:Railload,
    timeTable:timeTable
    speedRate:number
}
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

    //timetable
    const tt = prop.timeTable.tt;
    //走行しているtimeTableのインデックス
    const ttIndex = useRef(0);

    const switchPoints = new Map(prop.railload.switchPoints.map(switchPoints => [switchPoints.id, switchPoints]));

    //上り:true, 下り:false
    const isInBound:boolean = prop.timeTable.bound;

    //現在の緯度経度
    //レンダリング用の座標変数
    const [renderPos, setRenderPos] = useState<number[]>(fromSta.coord);
    //setPositionでpositionを変更しても即座に反映されないため，別の変数で管理する
    const position = useRef<number[]>(fromSta.coord);

    //トレースする座標配列
    const railChkPoints = useRef<number[][]>([[]]);
    //通過したrailChkPointsのインデックス
    const railChkPointsIndex = useRef<number>(0);

    //更新周期(msec)
    const frameRate = 33;

    const distance = useRef<number>(0);

    //setIntervalのID
    const intervalID = useRef<number>();

    //速度制御用インスタンス
    const speedControler = useRef<SpeedControler>(new SpeedControler(frameRate));
    speedControler.current.setSpeedRate(prop.speedRate);
    
    useEffect(() => {
        //railChkPointsの初期設定
        [railChkPoints.current, distance.current] = 
            getNextSection(isInBound, sections, stations, switchPoints, tt[ttIndex.current].s, tt[ttIndex.current+1].s);
        speedControler.current.setNextSection(distance.current, getTimeDiff(tt[ttIndex.current].d, tt[ttIndex.current+1].a));
        ttIndex.current += 1;

        //mtime周期でspeedだけ移動させる
        intervalID.current = setInterval(()=>{
            calcNextPosition(speedControler.current.getSpeed());
        }, frameRate);

        return ()=> clearInterval(intervalID.current);
    },[]);

    //distToMove:次の更新で進む距離, intervalID:setIntervalのID
    const calcNextPosition = (distToMove:number) => {
        //Sectionの最後のChkpointを通過したら
        if(railChkPointsIndex.current >= railChkPoints.current.length-1) {
            //指定した終着駅に到着したら
            if(railChkPoints.current[railChkPointsIndex.current].toString() === toSta.coord.toString()) {
                clearInterval(intervalID.current);
                return;
            }

            //次のSectionの座標情報とsectionIDを受け取る
            [railChkPoints.current, distance.current] = 
                getNextSection(isInBound, sections, stations, switchPoints, tt[ttIndex.current].s, tt[ttIndex.current+1].s);
            railChkPointsIndex.current = 0;
            //次のsection間の加減速設定
            speedControler.current.setNextSection(distance.current, getTimeDiff(tt[ttIndex.current].d, tt[ttIndex.current+1].a));
            ttIndex.current += 1;
        }

        const prevChkPoint:number[] = railChkPoints.current[railChkPointsIndex.current];
        const nextChkPoint:number[] = railChkPoints.current[railChkPointsIndex.current+1];
        //現在位置を挟む2つのチェックポイント間の距離
        const distChkPoint = getDist(prevChkPoint, nextChkPoint);
        //現在位置から次のチェックポイントまでの距離
        const distToNext = getDist(position.current, nextChkPoint);

        if(distToMove > distToNext) {
            setRenderPos(nextChkPoint);
            position.current = nextChkPoint;
            railChkPointsIndex.current += 1;
            calcNextPosition(distToMove-distToNext);
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

// 現在のSectionIDから次のSectionを出力
const getNextSection = (isInBound:boolean, sections:Map<string, Section>, stations:Map<string, Station>, switches:Map<string, SwitchPoint>,depStaID:string, desStaID:string):[number[][], number] => {
    let resCoords:number[][] = [];
    let dist = 0;

    let postSecID = "";
    let depSta = stations.get(depStaID);
    if (!depSta) throw new Error("Station Data Load Failed");
    let secID = isInBound ? depSta.next : depSta.prev;
    while(true) {
        let sec = sections.get(secID);
        if (!sec) throw new Error("Section Data Load Failed");
        let coords = isInBound ? sec.coords : sec.coords.reverse();
        coords.forEach(coord => resCoords.push(coord));
        dist += sec.distance;
        postSecID = secID;

        //次のポイントのIDを取得
        let pointID = isInBound ? sec.next : sec.prev;
        if(switches.has(pointID)) {
            let switchPoint = switches.get(pointID);
            if (!switchPoint) throw new Error("Switch Data Load Failed");
            secID = getNextSecID(switchPoint, postSecID, desStaID);
        } else if(pointID === desStaID) {
            return [resCoords, dist];
        }
    }
}

// 通過したsecIDと目的の駅から次に通過するべきsecIDを取得
const getNextSecID = (switchPoint:SwitchPoint, postSecID:string, desStaID:string):string => {
    let dirs = switchPoint.direction.filter(function(dir) {
        return dir.from === postSecID
    });
    let nextSecID = "";
    for(let i = 0; i < dirs.length; i++) {
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
const getTimeDiff = (from:string, to:string):number => {
    const [fromHour, fromMin] = from.split(":").map(Number);
    const [toHour, toMin] = to.split(":").map(Number);
    let fromTime = fromHour * 60 + fromMin;
    let toTime = toHour * 60 + toMin;
    if (toTime < fromTime) {
        toTime += 24 * 60; // 翌日の時間に調整
    }
    return (toTime - fromTime) * 60 * 1000; // ミリ秒に変換
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

    setNextSection(distance:number, arriveTime:number) {
        this.staDist = distance;
        this.arriveTime = arriveTime;
        this.constantSpeed = this.staDist/(this.arriveTime-this.accelTime)*this.frameRate;
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
