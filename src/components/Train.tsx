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

// 時刻表と指定日時をもとに列車の位置を表示する
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
            prop.timeTable.trainNo,
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
        <Marker position={[trainPos[0], trainPos[1]]} icon={customIcon}>
            <Popup>{prop.timeTable.line} {prop.timeTable.trainNo}</Popup>
        </Marker>
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
    private isInBound:string;
    private trainNo:string;
    //速度制御用
    private speedControler:SpeedControler;
    //出発駅と到着駅のID
    private depStaID:string = "";
    private arrStaID:string = "";

    // 路線データを初期化し、列車の走行経路を計算する準備をする
    constructor(
        sections:Section[], 
        stations:Station[], 
        switchPoints:SwitchPoint[],
        timeTable:TimeTable,
        isInBound:string,
        trainNo:string,
    ) {
        //それぞれのIDをkeyとするmapを作成
        this.sections = new Map(sections.map(section => [section.id, section]));
        this.stations = new Map(stations.map(station => [station.id, station]));
        this.switchPoints = new Map(switchPoints.map(switchPoint => [switchPoint.id, switchPoint]));

        this.speedControler = new SpeedControler(timeTable);
        this.isInBound = isInBound;
        this.trainNo = trainNo;

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
        let passStations:string[];
        //時刻から出発駅と到着駅を算出，出発駅と到着駅が前回のレンダリングから変更されているか確認
        [depSta_tmp, arrSta_tmp, depTime, arrTime, passStations] = this.speedControler.getTrainStatus(date);
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
            [this.traceCoords, this.traceDists] = this.getTraceCoords(depSta_tmp, arrSta_tmp, passStations);
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

    // 出発駅から到着駅までの経路をたどり、座標と累積距離を作成する
    private getTraceCoords(depStaID:string, arrStaID:string, passStations:string[]):[number[][], number[]] {
        if(this.isInBound !== "inbound" && this.isInBound !== "outbound") {
            throw new Error("bound is not set");
        }

        const route = this.findSectionPath(depStaID, arrStaID, passStations);
        if(!route) {
            const depStation = this.stations.get(depStaID);
            const arrStation = this.stations.get(arrStaID);
            const depStationName = depStation?.name ?? depStaID;
            const arrStationName = arrStation?.name ?? arrStaID;
            throw new Error(
                `列車番号 ${this.trainNo}: ${depStationName} から ${arrStationName} までの経路が見つかりません。`
            );
        }

        const traceCoords:number[][] = [];
        const traceDists:number[] = [0];
        for(const section of route) {
            const coords = this.isInBound === "inbound"
                ? section.coords
                : [...section.coords].reverse();
            const distances = this.isInBound === "inbound"
                ? section.dist_coords
                : [...section.dist_coords].reverse();

            if(traceCoords.length === 0) {
                traceCoords.push(coords[0]);
            }
            for(let i = 1; i < coords.length; i++) {
                traceCoords.push(coords[i]);
                traceDists.push(traceDists[traceDists.length - 1] + distances[i - 1]);
            }
        }
        return [traceCoords, traceDists];
    }

    // 分岐条件と進行方向に従って、駅間を結ぶ区間の経路を探索する
    private findSectionPath(depStaID:string, arrStaID:string, passStations:string[]):Section[]|null {
        let route:Section[] = [];
        //駅IDから駅データを取得
        let depSta = this.stations.get(depStaID);
        if(!depSta) {
            throw new Error(`Station Data Load Failed ${depSta}`);
        }
        let nextSectionID = this.isInBound === "inbound" ? depSta.next : depSta.prev;
        while (true) {
            //進行方向の区間を取得
            let nextSection = this.sections.get(nextSectionID);
            if(!nextSection) {
                throw new Error(`Section Data Load Failed ${nextSection}`);
            }
            //得られた区間をrouteに追加
            route.push(nextSection);
            //次の分岐点or駅のIDを取得
            let nextPointID = this.isInBound === "inbound" ? nextSection.next : nextSection.prev;
            if(nextPointID === arrStaID) {
                break
            }

            //次のポイントが駅か判定
            if(this.stations.has(nextPointID)) {
                let nextSta = this.stations.get(nextPointID);
                if(!nextSta) {
                    throw new Error(`Station Data Load Failed ${nextPointID}`);
                }
                //passStationsにnextStaが含まれるか判定
                if (passStations[0] === nextSta.id) {
                    //先頭の1個を除いて更新
                    passStations = passStations.slice(1)
                    nextSectionID = this.isInBound === "inbound" ? nextSta.next : nextSta.prev;
                } else {
                    throw new Error(`停車駅・通過駅以外の駅を探索 ${nextSta.id}`)
                }
                continue;

            //次のポイントが分岐点か判定 
            }else if(this.switchPoints.has(nextPointID)) {
                let nextSwitch = this.switchPoints.get(nextPointID);
                if (!nextSwitch) {
                    throw new Error(`Switch Data Load Failed ${nextPointID}`);
                }
                //直近に通過したsectionIDとfromが一致するdirectionを抽出
                let ways = nextSwitch.direction.filter(direc => direc.from === route[route.length - 1].id)
                //1つしか該当せず，conditionが'none'ならそれを選択
                if (ways.length == 1 && ways[0].condition === 'none') {
                    nextSectionID = ways[0].to
                } else {
                    ways = ways.filter(way => Array.isArray(way.condition));
                    if(passStations.length >= 1) {
                        ways = ways.filter(way => way.condition.includes(passStations[0]))
                    } else {
                        ways = ways.filter(way => way.condition.includes(arrStaID))
                    }
                    if (ways.length != 1) {
                        throw new Error(`分岐点で経路の抽出に失敗 ${nextPointID}, 残留数${ways.length},列車番号 ${this.trainNo}${passStations[0]}`)
                    } 
                    nextSectionID = ways[0].to
                }
            } else {
                throw new Error(`分岐点または駅のポイントを探索できませんでした ${nextPointID}`)
            }
        }
        return route;
    }
}

class SpeedControler {
    //時刻表
    private tt:{s:string, a:dayjs.Dayjs, d:dayjs.Dayjs, p:boolean}[] = [];
    //加減速時間(msec)
    private accelTime:number = 2*1000;
    
    // 時刻表を保持し、列車の運行状態を計算できるようにする
    constructor(timeTable:TimeTable) {
        this.tt = timeTable.tt;
    }

    //列車が駅間にいるか停車中か判定
    //depStaとarrStaが同じ：駅に停車中
    //depStaとarrStaが異なる：depStaからarrStaに向けて移動中
    getTrainStatus(date:dayjs.Dayjs):[string, string, dayjs.Dayjs, dayjs.Dayjs, string[]] {
        let depSta:string = '';
        let arrSta:string = '';
        let depTime:dayjs.Dayjs = dayjs(0);
        let arrTime:dayjs.Dayjs = dayjs(0);
        let passStations:string[] = [];
        //始発前の時刻を指定された場合、始発駅に停車しているとみなす
        if(date.isHMSBefore(this.tt[0].d)) {
            depSta = this.tt[0].s;
            arrSta = this.tt[0].s;
            depTime = this.tt[0].d;
            arrTime = this.tt[0].a;
            passStations = [];
            return [depSta, arrSta, depTime, arrTime, passStations];
        }
        //終着後の時刻を指定された場合、終着駅に停車しているとみなす
        if(date.isHMSSameOrAfter(this.tt[this.tt.length-1].a)) {
            depSta = this.tt[this.tt.length-1].s;
            arrSta = this.tt[this.tt.length-1].s;
            depTime = this.tt[this.tt.length-1].d;
            arrTime = this.tt[this.tt.length-1].a;
            passStations = [];
            return [depSta, arrSta, depTime, arrTime, passStations];
        }
        //現在時刻に駅に停車している場合(現在時刻が駅の到着時刻より後で出発時刻より前)：depStaとarrStaは同じ
        for(let i = 1; i < this.tt.length-1; i++) {
            if (this.tt[i].p) continue;
            if(date.isHMSSameOrAfter(this.tt[i].a) && date.isHMSBefore(this.tt[i].d)) {
                depSta = this.tt[i].s;
                arrSta = this.tt[i].s;
                depTime = this.tt[i].d;
                arrTime = this.tt[i].a;
                passStations = [];
                return [depSta, arrSta, depTime, arrTime, passStations];
            }
        }
        //現在時刻が駅間の移動中の場合
        let depStaIndex = -1;
        for (let i = this.tt.length - 2; i >= 0; i--) {
            if (this.tt[i].p) {
                continue;
            }
            if(date.isHMSSameOrAfter(this.tt[i].d)) {
                depStaIndex = i;
                break;
            }
        }
        let arrStaIndex = -1;
        for (let i = 1; i < this.tt.length; i++) {
            if (this.tt[i].p) {
                continue;
            }
            if(date.isHMSSameOrBefore(this.tt[i].a)) {
                arrStaIndex = i;
                break;
            }
        }

        //出発駅と到着駅の間の駅をpassStationsに格納
        for (let i = depStaIndex + 1; i < arrStaIndex; i++) {
            passStations.push(this.tt[i].s);
        }

        depSta = this.tt[depStaIndex].s;
        arrSta = this.tt[arrStaIndex].s;
        depTime = this.tt[depStaIndex].d;
        arrTime = this.tt[arrStaIndex].a;
        return [depSta, arrSta, depTime, arrTime, passStations];
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