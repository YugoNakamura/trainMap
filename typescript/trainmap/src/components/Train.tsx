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

export const Train = (prop:Prop) => {
    const [trainPos, setTrainPos] = useState<number[]>([0, 0]);
    const trainCtrlRef = useRef<TrainControler>(new TrainControler(
        prop.railload.sections,
        prop.railload.stations,
        prop.railload.switchPoints,
        prop.timeTable,
        prop.timeTable.bound,
        prop.frameRate,
        prop.delTrain
    ));

    //時刻更新時実行内容
    useEffect(() => {
        setTrainPos(trainCtrlRef.current.getNextPosition(prop.date));
    }, [prop.date]);

    //速度変更時実行内容
    useEffect(() => {
        trainCtrlRef.current.setSpeedRate(prop.speedRate);
    }, [prop.speedRate]);

    const customIcon = L.icon({
        iconUrl: './asset/trainIcon.svg',
        iconSize: [30, 30], // アイコンのサイズ
        iconAnchor: [15, 15], // アイコンのアンカー位置
    });
    return (
        <Marker position={[trainPos[0], trainPos[1]]} icon={customIcon}><Popup>Train</Popup></Marker>
    );
}

class TrainControler {
    //分岐点もしくは駅間を結ぶ座標の配列
    private sections:Map<string, Section>;
    //駅
    private stations:Map<string, Station>;
    //分岐点
    private switchPoints:Map<string, SwitchPoint>;
    //実際に列車が走行する座標の配列
    private traceCoords:number[][];
    private traceCoordsIdx:number = 0;
    //駅間距離
    private distance:number = 0;
    //終着駅
    private toSta:Station;
    //時刻表
    private timeTable:timeTable;
    //時刻表内の走行区間を示す番号
    private ttIdx:number = 0;
    //上り:true, 下り:false
    private isInBound:boolean;
    //現在位置
    private position:number[];
    //速度制御用
    private speedControler:SpeedControler;
    //終着駅到着通知用関数
    private delTrain:Function;


    constructor(
        sections:Section[], 
        stations:Station[], 
        switchPoints:SwitchPoint[],
        timeTable:timeTable,
        isInBound:boolean,
        frameRate:number,
        delTrain:Function
    ) {
        //それぞれのIDをkeyとするmapを作成
        this.sections = new Map(sections.map(section => [section.id, section]));
        this.stations = new Map(stations.map(station => [station.id, station]));
        this.switchPoints = new Map(switchPoints.map(switchPoint => [switchPoint.id, switchPoint]));

        this.traceCoords = [[]];
        let fromSta = this.stations.get(timeTable.fromStaId);
        if (!fromSta) throw new Error("Station Data Load Failed");

        let toSta = this.stations.get(timeTable.toStaId);
        if (!toSta) throw new Error("Station Data Load Failed");
        this.toSta = toSta;

        this.timeTable = timeTable;

        this.isInBound = isInBound;

        this.position = fromSta.coord;

        this.speedControler = new SpeedControler(frameRate);

        this.delTrain = delTrain;
    }

    //進行距離とそれを挟むchkPointをもとに次の列車の位置を計算
    //distToMove:次のレンダリングで進む距離
    //position:次のレンダリング時の列車の位置
    //chkPoint:OSMから取得した線路の緯度経度
    getNextPosition(date:Date, distToMove?:number):number[] {
        //引数が与えられていなければgetSpeed()実行
        distToMove = distToMove==undefined ? this.speedControler.getSpeed() : distToMove;
        //駅に到着したら
        if(this.traceCoordsIdx >= this.traceCoords.length-1) {
            //終着駅に到着したら
            if(this.traceCoords[this.traceCoordsIdx].toString() === this.toSta.coord.toString()) {
                this.delTrain(this.timeTable.trainNo);
                return this.toSta.coord;
            }
            //次の駅間の座標情報と駅間距離を取得
            [this.traceCoords, this.distance] = this.getNextRailCoords();
            this.traceCoordsIdx = 0;
            //次の駅間の加減速設定
            this.speedControler.setNextDistance(
                this.distance, 
                date, 
                this.timeTable.tt[this.ttIdx+1].a
            );
            this.ttIdx += 1;
        }

        const prevRailCoord:number[] = this.traceCoords[this.traceCoordsIdx];
        const nextRailCoord:number[] = this.traceCoords[this.traceCoordsIdx+1];
        //現在位置を挟む2つの線路座標間の距離
        const distRailCoord = this.getDist(prevRailCoord, nextRailCoord);
        //現在位置から次の線路座標までの距離
        const distToNext = this.getDist(this.position, nextRailCoord);

        //移動先がnextRailCoordより先の場合
        if(distToMove > distToNext) {
            this.position = nextRailCoord;
            this.traceCoordsIdx += 1;
            this.getNextPosition(date, distToMove-distToNext);
        } else {
            //前のチェックポイントから現在位置までの距離
            const distToPrev = distRailCoord-distToNext;
            //チェックポイント間の距離中の進行割合
            const progressRate = (distToPrev+distToMove)/distRailCoord;
            const newLat = prevRailCoord[0]+(nextRailCoord[0]-prevRailCoord[0])*progressRate;
            const newLng = prevRailCoord[1]+(nextRailCoord[1]-prevRailCoord[1])*progressRate;
            this.position = [newLat, newLng];
        }
        return this.position;
    }

    private getNextRailCoords():[number[][], number] {
        let depStaID = this.timeTable.tt[this.ttIdx].s;
        let desStaID = this.timeTable.tt[this.ttIdx+1].s;

        //駅間の座標配列
        let nextRailCoords:number[][] = [];
        //駅間距離
        let dist = 0;

        let postSecID = "";
        let depSta = this.stations.get(depStaID);
        if (!depSta) throw new Error("Station Data Load Failed");

        //次に進むべきSectionID
        //上りならnext，下りならprev
        let secID = this.isInBound ? depSta.next : depSta.prev;
        while(true) {
            let sec = this.sections.get(secID);
            if (!sec) throw new Error("Section Data Load Failed");

            //次に進むべきSectionの座標配列を取得
            let coords = this.isInBound ? sec.coords : sec.coords.reverse();
            //nextRailCoordsの末尾にcoordsを連結
            coords.forEach(coord => nextRailCoords.push(coord));
            dist += sec.distance;
            postSecID = secID;

            //次のポイント(分岐点もしくは駅)のIDを取得
            let pointID = this.isInBound ? sec.next : sec.prev;
            //次のポイントが分岐点なら、分岐点の情報から次に進むべきSectionIDを取得
            if(this.switchPoints.has(pointID)) {
                let switchPoint = this.switchPoints.get(pointID);
                if (!switchPoint) throw new Error("Switch Data Load Failed");
                secID = this.getNextSecID(switchPoint, postSecID, desStaID);
            //次のポイントが駅なら、目的駅かどうかを確認して、線路座標と距離を返す
            } else if(pointID === desStaID) {
                return [nextRailCoords, dist];
            }
        }
    }

    // 線路の分岐点(Switches)において、通過したSectionのID(prevSecID)と目的駅ID(desStaID)から、次に進むべきSectionのIDを取得
    private getNextSecID(switchPoint:SwitchPoint, prevSecID:string, desStaID:string):string {
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
    private getDist(coord1:number[], coord2:number[]):number {
        return Math.sqrt((coord2[0]-coord1[0])**2+(coord2[1]-coord1[1])**2);  
    }

    setSpeedRate(speedRate:number) {
        this.speedControler.setSpeedRate(speedRate)
        return;
    }
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
    travelTime:number = 0;
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

    setNextDistance(distance:number, depTime:Date, arriveTime:string) {
        let travelTime = this.getTimeDiff(depTime, arriveTime)
        this.staDist = distance;
        this.travelTime = travelTime;
        this.constantSpeed = this.staDist/(this.travelTime-(this.accelTime*2))*this.frameRate;
        this.accelRate = this.constantSpeed/(this.accelTime/this.frameRate);

        this.accDist = this.accelTime/this.frameRate * this.constantSpeed / 2;

        this.sumDist = 0;
        this.speed = 0;
    }

    // 時刻の差をミリ秒で取得
    //from:現在時刻, to:時刻表の出発時刻
    private getTimeDiff(from:Date, to:string):number {
        const [fromHour, fromMin, fromSec] = [from.getHours(), from.getMinutes(), from.getSeconds()];
        const [toHour, toMin] = to.split(":").map(Number);
        let fromTime = fromHour * 60 * 60 + fromMin * 60 + fromSec;
        let toTime = toHour * 60 * 60 + toMin * 60;
        if (toTime < fromTime) {
            toTime += 24 * 60 * 60; // 翌日の時間に調整
        }
        return (toTime - fromTime) * 1000; // ミリ秒に変換
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
