import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LatLng } from 'leaflet';
import { Railloads} from './Railloads';
import { RawTimeTable, TimeTable } from "../types/timeTable"
import { Fragment, useEffect, useState } from 'react';
import { Railload } from '../types/railload';
import { TrainScheduler } from './TrainScheduler';

import './Map.css';

import dayjs from 'dayjs';

const initialPosition:LatLng = new LatLng(35.0056828, 137.0397465);
const initialZoom: number = 16;
const railDataRaw = import.meta.glob<Railload>('../../trainRoute/*.trainmap.json', {
    eager: true,
    import: 'default'
});
const timeDataRaw = import.meta.glob<{ dias: RawTimeTable[] }>('../../timeTable/*.json', {
    eager: true,
    import: 'default'
});

interface RouteData {
    code: string;
    railload: Railload;
    timeTables: TimeTable[];
}

const getRouteCode = (filePath: string, fileType: 'route' | 'timeTable'): string => {
    const fileName = filePath.split('/').pop();
    const pattern = fileType === 'route'
        ? /^([a-z]{2})\.trainmap\.json$/i
        : /^([a-z]{2})_[^/]+\.json$/i;
    const routeCode = fileName?.match(pattern)?.[1];
    if (!routeCode) {
        throw new Error(`Could not determine route code from ${filePath}`);
    }
    return routeCode.toUpperCase();
};

const loadRoutes = (date: dayjs.Dayjs): RouteData[] => {
    const rawTimeTablesByRoute = new globalThis.Map<string, RawTimeTable[]>();
    Object.entries(timeDataRaw).forEach(([filePath, timeData]) => {
        const routeCode = getRouteCode(filePath, 'timeTable');
        rawTimeTablesByRoute.set(routeCode, [
            ...(rawTimeTablesByRoute.get(routeCode) ?? []),
            ...timeData.dias
        ]);
    });

    const routesByCode = new globalThis.Map<string, Railload>();
    Object.entries(railDataRaw).forEach(([filePath, railload]) => {
        const routeCode = getRouteCode(filePath, 'route');
        if (routesByCode.has(routeCode)) {
            throw new Error(`Multiple route files found for route ${routeCode}`);
        }
        routesByCode.set(routeCode, railload);
    });

    const routes = Array.from(routesByCode, ([code, railload]) => {
        const rawTimeTables = rawTimeTablesByRoute.get(code);
        if (!rawTimeTables?.length) {
            throw new Error(`No timetable data found for route ${code}`);
        }
        rawTimeTablesByRoute.delete(code);

        return {
            code,
            railload,
            timeTables: rawTimeTables.map((rawTimeTable) => ({
                ...rawTimeTable,
                tt: rawTimeTable.tt.map((dia) => ({
                    s: dia.s,
                    a: dia.a !== undefined
                        ? dayjs(`${date.format("YYYY/MM/DD")} ${dia.a}`, "YYYY/MM/DD HH:mm:ss")
                        : dayjs(0),
                    d: dia.d !== undefined
                        ? dayjs(`${date.format("YYYY/MM/DD")} ${dia.d}`, "YYYY/MM/DD HH:mm:ss")
                        : dayjs("2100/01/01 00:00:00", "YYYY/MM/DD HH:mm:ss")
                }))
            }))
        };
    });

    const unmatchedTimeTableCodes = Array.from(rawTimeTablesByRoute.keys());
    if (unmatchedTimeTableCodes.length > 0) {
        throw new Error(`No route data found for timetable route(s): ${unmatchedTimeTableCodes.join(", ")}`);
    }
    return routes;
};

export const Map = () => {
    const [speedRate, setSpeedRate] = useState<number>(1);
    const [date, setDate] = useState<dayjs.Dayjs>(dayjs());
    const frameRate = 30;
    const [routes] = useState(() => loadRoutes(date));

    useEffect(() => {
        const id = window.setInterval(() => {
            setDate(prevDate => prevDate.add(frameRate * speedRate, 'ms'));
        }, frameRate);
        return () => {
            window.clearInterval(id);
        };
    }, [speedRate]);

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
        {routes.map((route) => (
            <Fragment key={route.code}>
                <Railloads railload={route.railload} />
                <TrainScheduler
                    railload={route.railload}
                    timeTables={route.timeTables}
                    date={date}
                />
            </Fragment>
        ))}
        </MapContainer>

        <form style={{position: 'absolute', top: 10, left: 50, zIndex: 1000}}>
        <h3>{date.format()}</h3>
        <input type="datetime-local" onChange={(e) => setDate(dayjs(e.target.value))} value={date.format("YYYY-MM-DDTHH:mm:ss")} />
        <select name="speedRate" onChange={(e) => setSpeedRate(Number(e.target.value))}>
            <option value="1">x1</option>
            <option value="2">x2</option>
            <option value="5">x5</option>
            <option value="10">x10</option>
            <option value="60">x60</option>        
        </select>
        </form>
        </div>
    );
};
