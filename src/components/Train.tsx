import { useEffect, useRef, useState } from "react";
import { Marker, Popup } from "react-leaflet";
import { Railload, Section, Station, SwitchPoint } from "../types/railload";
import { TimeTable} from "../types/timeTable";
import L from "leaflet";
import dayjs from "dayjs";
import trainIcon from '/asset/trainIcon.svg';

interface Prop {
    railload:Railload,
    timeTable:TimeTable,
    date:dayjs.Dayjs
}

export const Train = (prop:Prop) => {
    const [trainPos, setTrainPos] = useState<number[]>([0, 0]);
    const trainCtrlRef = useRef<TrainControler|null>(null);
    if(trainCtrlRef.current === null) {
        trainCtrlRef.current = new TrainControler(
            prop.railload.sections,
            prop.railload.stations,
            prop.railload.switchPoints,
            prop.timeTable,
            prop.timeTable.bound,
        );
    }

    //時刻更新時実行内容
    useEffect(() => {
        if(trainCtrlRef.current === null) return;
        setTrainPos(trainCtrlRef.current.getNextPosition(prop.date));
    }, [prop.date.valueOf()]);


    const customIcon = L.icon({
        iconUrl: trainIcon,
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
    //出発駅からの距離
    private traceDists:number[];
    //上り:true, 下り:false
    private isInBound:boolean;
    //速度制御用
    private speedControler:SpeedControler;
    //出発駅と到着駅のID
    private depStaID:string = "";
    private arrStaID:string = "";

    constructor(
        sections:Section[], 
        stations:Station[], 
        switchPoints:SwitchPoint[],
        timeTable:TimeTable,
        isInBound:boolean,
    ) {
        //それぞれのIDをkeyとするmapを作成
        this.sections = new Map(sections.map(section => [section.id, section]));
        this.stations = new Map(stations.map(station => [station.id, station]));
        this.switchPoints = new Map(switchPoints.map(switchPoint => [switchPoint.id, switchPoint]));

        this.speedControler = new SpeedControler(timeTable);
        this.isInBound = isInBound;

        this.traceCoords = [[]];
        this.traceDists = [0];
    }

    //進行距離とそれを挟むchkPointをもとに次の列車の位置を計算
    //distToMove:次のレンダリングで進む距離
    //position:次のレンダリング時の列車の位置
    //chkPoint:OSMから取得した線路の緯度経度
    getNextPosition(date:dayjs.Dayjs):number[] {
        let depSta_tmp:string;
        let arrSta_tmp:string;
        let depTime:dayjs.Dayjs;
        let arrTime:dayjs.Dayjs;
        //時刻から出発駅と到着駅を算出，出発駅と到着駅が前回のレンダリングから変更されているか確認
        [depSta_tmp, arrSta_tmp, depTime, arrTime] = this.speedControler.getTrainSta(date);
        //駅に停車中の場合
        //depStaとarrStaが同じ場合は駅に停車中なので、駅の座標を返す
        if(depSta_tmp === arrSta_tmp) {
            //stationsから駅の座標を取得して返す
            let station = this.stations.get(depSta_tmp);
            if (!station) throw new Error("Station Data Load Failed");
            return station.coord;
        }

        // 出発・到着駅が変更された場合、traceCoordsとtraceDistsを再計算
        if(depSta_tmp !== this.depStaID || arrSta_tmp !== this.arrStaID) {
            this.depStaID = depSta_tmp;
            this.arrStaID = arrSta_tmp;
            [this.traceCoords, this.traceDists] = this.getTraceCoords(depSta_tmp, arrSta_tmp);
        }
        //駅間距離
        let distance = this.traceDists[this.traceDists.length-1]
        //進行距離を算出
        let progress = this.speedControler.getProgress(date, depTime, arrTime, distance);
        //駅間を走行中の場合
        //progressがtraceDistsのどの区間にあるかを特定
        let traceIdx = 0;
        for(let i = 0; i <= this.traceDists.length-1; i++) {
            if(progress < this.traceDists[i]) {
                traceIdx = i;
                break;
            }
        }

        //列車が出発駅からprogressだけ進むとtraceCoords[i]のtraceCoords[i+1]の間にあるはず
        let prevTraceCoord:number[] = this.traceCoords[traceIdx-1];
        let nextTraceCoord:number[] = this.traceCoords[traceIdx];
        //2点間距離
        let miniDist = this.traceDists[traceIdx]-this.traceDists[traceIdx-1];
        //prevTraceCoordからnextTraceCoord間でprogressがどれだけ進んでいるか割合を算出
        let prevTraceDist = this.traceDists[traceIdx-1];
        let progressRate = (progress-prevTraceDist)/miniDist;

        let newLat = prevTraceCoord[0]+(nextTraceCoord[0]-prevTraceCoord[0])*progressRate;
        let newLng = prevTraceCoord[1]+(nextTraceCoord[1]-prevTraceCoord[1])*progressRate;
        return [newLat, newLng];
    }

    private getTraceCoords(depStaID:string, arrStaID:string):[number[][], number[]] {
        //駅間の座標配列(戻り値)
        let traceCoords:number[][] = [];
        //出発駅からの各線路座標までの距離の配列(戻り値)
        let traceDists:number[] = [0];
        let prevSecID = "";

        //出発駅から次に進むSectionIDを取得
        let depSta = this.stations.get(depStaID);
        if (!depSta) throw new Error("Station Data Load Failed");
        //上りならnext，下りならprev
        let secID = this.isInBound ? depSta.next : depSta.prev;

        while(true) {
            //取得したSectionIDからSectionの情報を取得
            let sec = this.sections.get(secID);
            if (!sec) throw new Error("Section Data Load Failed");

            //上り下りに合わせて線路座標・線路座標間距離を並び替え
            let coords_copy = [...sec.coords];
            let dist_coords_copy = [...sec.dist_coords];
            let coords      = this.isInBound ? sec.coords       : coords_copy.reverse();
            let dist_coords = this.isInBound ? sec.dist_coords  : dist_coords_copy.reverse();

            //traceCoordsの末尾にcoordsを連結(Sectionの端は重複するため、coordsの末尾を捨てる)
            if(traceCoords.length > 0) traceCoords.pop();
            coords.forEach(coord => traceCoords.push(coord));

            //線路座標間距離をもとに、出発駅から各線路座標までの距離を算出してtraceDistsに格納
            dist_coords.forEach(dist_coord => {
                traceDists.push(traceDists[traceDists.length-1]+dist_coord)
            });

            prevSecID = secID;

            //次のポイント(分岐点もしくは駅)のIDを取得
            let pointID = this.isInBound ? sec.next : sec.prev;
            //次のポイントが分岐点なら、分岐点の情報から次に進むべきSectionIDを取得
            if(this.switchPoints.has(pointID)) {
                let switchPoint = this.switchPoints.get(pointID);
                if (!switchPoint) throw new Error("Switch Data Load Failed");
                secID = this.getNextSecID(switchPoint, prevSecID, arrStaID);
            //次のポイントが駅なら、目的駅かどうかを確認して、線路座標と距離を返す
            } else if(pointID === arrStaID) {
                return [traceCoords, traceDists];
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
}

class SpeedControler {
    //時刻表
    private tt:{s:string, a:dayjs.Dayjs, d:dayjs.Dayjs}[] = [];
    //加減速時間(msec)
    private accelTime:number = 2*1000;
    
    constructor(timeTable:TimeTable) {
        this.tt = timeTable.tt;
    }

    //列車が駅間にいるか停車中か判定
    //depStaとarrStaが同じ：駅に停車中
    //depStaとarrStaが異なる：depStaからarrStaに向けて移動中
    getTrainSta(date:dayjs.Dayjs):[string, string, dayjs.Dayjs, dayjs.Dayjs] {
        let depSta:string = '';
        let arrSta:string = '';
        let depTime:dayjs.Dayjs = dayjs(0);
        let arrTime:dayjs.Dayjs = dayjs(0);
        //始発前の時刻を指定された場合、始発駅に停車しているとみなす
        if(date.isHMSBefore(this.tt[0].d)) {
            depSta = this.tt[0].s;
            arrSta = this.tt[0].s;
            depTime = this.tt[0].d;
            arrTime = this.tt[0].a;
            return [depSta, arrSta, depTime, arrTime];
        }
        //終着後の時刻を指定された場合、終着駅に停車しているとみなす
        if(date.isHMSSameOrAfter(this.tt[this.tt.length-1].a)) {
            depSta = this.tt[this.tt.length-1].s;
            arrSta = this.tt[this.tt.length-1].s;
            depTime = this.tt[this.tt.length-1].d;
            arrTime = this.tt[this.tt.length-1].a;
            return [depSta, arrSta, depTime, arrTime];
        }
        //現在時刻が駅間の移動中の場合
        for(let i = 0; i < this.tt.length-1; i++) {
            if(date.isHMSSameOrAfter(this.tt[i].d) && date.isHMSBefore(this.tt[i+1].a)) {
                depSta = this.tt[i].s;
                arrSta = this.tt[i+1].s;
                depTime = this.tt[i].d;
                arrTime = this.tt[i+1].a;
                break;
            }
        }
        //現在時刻に駅に停車している場合(現在時刻が駅の到着時刻より後で出発時刻より前)：depStaとarrStaは同じ
        for(let i = 1; i < this.tt.length-1; i++) {
            if(date.isHMSSameOrAfter(this.tt[i].a) && date.isHMSBefore(this.tt[i].d)) {
                depSta = this.tt[i].s;
                arrSta = this.tt[i].s;
                depTime = this.tt[i].d;
                arrTime = this.tt[i].a;
                break;
            }
        }
        return [depSta, arrSta, depTime, arrTime];
    }

    //getTrainStaで得られたdepStaとarrStaをもとに、駅間距離を受け取って列車の進行割合を算出
    getProgress(date:dayjs.Dayjs, depTime:dayjs.Dayjs, arrTime:dayjs.Dayjs, distance:number):number {
        //出発駅からの距離
        let progress = 0;
        //駅間の移動時間(msec)
        let travelTime = arrTime.diff(depTime, 'millisecond');

        //停止中の場合は例外を投げる
        if(depTime.isHMSAfter(arrTime)) throw new Error("This Train is currently stopped at a station.");

        //出発駅を出発してからの経過時間(msec)
        let elapsedTime = date.diff(depTime, 'millisecond');
        //定速移動時の速度
        let constantSpeed = distance/(travelTime-this.accelTime);
        //経過時間が加速時間の場合
        if(elapsedTime <= this.accelTime) {
            progress = (constantSpeed*elapsedTime**2)/(2*this.accelTime);
        //経過時間が定速時間の場合
        } else if(elapsedTime <= travelTime-this.accelTime) {
            progress = (this.accelTime*constantSpeed)/2 + constantSpeed*(elapsedTime-this.accelTime);
        //経過時間が減速時間の場合
        } else {
            progress = distance - (constantSpeed*(travelTime-elapsedTime)**2)/(2*this.accelTime);
        }
        return progress;
    }
}