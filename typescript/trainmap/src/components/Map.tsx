import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LatLng } from 'leaflet';
import { Railloads} from './Railloads';
import { RawTimeTable, TimeTable } from "../types/timeTable"
import { useEffect, useRef, useState } from 'react';
import { Railload } from '../types/railload';
import { TrainScheduler } from './TrainScheduler';
import './Map.css';
//ファイル読み込み
import timeDataRaw from '../../timeTable/mikawaLine.json';
import raillDataRaw from '../../trainRoute/mikawaLine.json';

import dayjs from 'dayjs';

const initialPosition:LatLng = new LatLng(35.0056828, 137.0397465);
const initialZoom: number = 16;

export const Map = () => {
    const [speedSel, setSpeedSel] = useState<number>(1);
    const [speedRate, setSpeedRate] = useState<number>(1);
    const [date, setDate] = useState<dayjs.Dayjs>(dayjs('2025/01/01 11:59:55'));
    const frameRate = 30;

    const rawTimeTables = timeDataRaw as RawTimeTable[];
    const timeTablesRef = useRef<TimeTable[]>([]);
    const railData = raillDataRaw as Railload;

    //timeTableRawからtimeTableに変換
    useEffect(() => {
        rawTimeTables.forEach((rawTimeTable) => {
            timeTablesRef.current.push({
                ...rawTimeTable,
                tt: rawTimeTable.tt.map((dia) => {
                    return {
                        s: dia.s,
                        a: dia.a !== undefined ? dayjs(date.format("YYYY/MM/DD") + " " + dia.a, "YYYY/MM/DD HH:mm:ss") : dayjs(0),
                        d: dia.d !== undefined ? dayjs(date.format("YYYY/MM/DD") + " " + dia.d, "YYYY/MM/DD HH:mm:ss") : dayjs("2100/01/01 00:00:00", "YYYY/MM/DD HH:mm:ss")
                    };
                })
            });
        });
    }, []);

    useEffect(() => {
        const id = window.setInterval(() => {
            setDate(prevDate => prevDate.add(frameRate * speedRate, 'ms'));
        }, frameRate);
        return () => {
            window.clearInterval(id);
        };
    }, [speedRate]);

    const onClkOKBtn = () => {
        console.log(`speedSel: ${speedSel}, speedRate: ${speedRate}`);
        setSpeedRate(speedSel);
    }

    return (
    <div>
        <MapContainer
        maxZoom={21}
        center={initialPosition}
        zoom={initialZoom}
        style={{ width: '100%', height: '100dvh'}}
        >
        <TileLayer 
        maxNativeZoom={19}
        maxZoom={21}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Railloads railload={railData} />
        <TrainScheduler railload={railData} timeTables={timeTablesRef.current} date={date}/>
        </MapContainer>

        <form style={{position: 'absolute', top: 10, left: 50, zIndex: 1000}}>
        <h3>{date.format()}</h3>
        <input type="datetime-local" onChange={(e) => setDate(dayjs(e.target.value))} value={date.format("YYYY-MM-DDTHH:mm:ss")} />
        <select name="speedRate" onChange={(e) => setSpeedSel(Number(e.target.value))}>
            <option value="1">x1</option>
            <option value="2">x2</option>
            <option value="5">x5</option>
            <option value="10">x10</option>
            <option value="60">x60</option>        
        </select>
        <button type="button" onClick={onClkOKBtn}>OK</button>
            </form>
        </div>
    );
};
