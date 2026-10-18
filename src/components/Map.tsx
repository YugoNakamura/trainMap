import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LatLng, LatLngBounds } from 'leaflet';
import { Railloads} from './Railloads';
import { RawTimeTable, TimeTable } from "../types/timeTable"
import { Fragment, useEffect, useRef, useState } from 'react';
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
                        : dayjs("2100/01/01 00:00:00", "YYYY/MM/DD HH:mm:ss"),
                    p: dia.p ?? false
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

const FitRoutes = ({ routes }: { routes: RouteData[] }) => {
    const map = useMap();

    useEffect(() => {
        const bounds = new LatLngBounds([]);
        routes.forEach((route) => {
            route.railload.sections.forEach((section) => {
                section.coords.forEach(([latitude, longitude]) => {
                    bounds.extend([latitude, longitude]);
                });
            });
        });

        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [32, 32], maxZoom: initialZoom });
        }
    }, [map, routes]);

    return null;
};

export const Map = () => {
    const [speedRate, setSpeedRate] = useState<number>(1);
    const [date, setDate] = useState<dayjs.Dayjs>(dayjs());
    const [isPlaying, setIsPlaying] = useState(true);
    const frameRate = 30;
    const [routes] = useState(() => loadRoutes(date));
    const clockAnchor = useRef({
        realTime: Date.now(),
        displayTime: date.valueOf()
    });

    const getDisplayTime = (realTime: number, rate: number) =>
        clockAnchor.current.displayTime +
        (realTime - clockAnchor.current.realTime) * rate;

    const setDisplayDate = (nextDate: dayjs.Dayjs) => {
        const realTime = Date.now();
        clockAnchor.current = {
            realTime,
            displayTime: nextDate.valueOf()
        };
        setDate(nextDate);
    };

    useEffect(() => {
        if (!isPlaying) return;
        const id = window.setInterval(() => {
            setDate(dayjs(getDisplayTime(Date.now(), speedRate)));
        }, frameRate);
        return () => {
            window.clearInterval(id);
        };
    }, [isPlaying, speedRate]);

    return (
    <main className="map-screen">
        <aside className="map-sidebar">
            <section className="map-panel" aria-label="運行表示と操作">
                <header className="map-panel-header">
                    <div>
                        <p className="map-eyebrow">TRAIN MAP</p>
                        <h1>三河線 運行マップ</h1>
                    </div>
                    <span className={`playback-status${isPlaying ? ' is-playing' : ''}`}>
                        <span className="status-indicator" />
                        {isPlaying ? '再生中' : '一時停止'}
                    </span>
                </header>

                <div className="clock-display" aria-live="off">
                    <time dateTime={date.toISOString()}>{date.format("HH:mm:ss")}</time>
                    <span>{date.format("YYYY年MM月DD日")}</span>
                </div>

                <button
                    className="current-time-button"
                    type="button"
                    onClick={() => setDisplayDate(dayjs())}
                >
                    <span aria-hidden="true">↻</span>
                    現在時刻に戻す
                </button>

                <div className="playback-controls">
                    <button
                        className="playback-button"
                        type="button"
                        onClick={() => {
                            const realTime = Date.now();
                            const displayTime = isPlaying
                                ? getDisplayTime(realTime, speedRate)
                                : date.valueOf();
                            clockAnchor.current = { realTime, displayTime };
                            setDate(dayjs(displayTime));
                            setIsPlaying(playing => !playing);
                        }}
                        aria-label={isPlaying ? '再生を一時停止' : '再生を開始'}
                    >
                        <span aria-hidden="true">{isPlaying ? 'Ⅱ' : '▶'}</span>
                        {isPlaying ? '一時停止' : '再生'}
                    </button>
                    <label className="speed-control">
                        速度
                        <select
                            name="speedRate"
                            value={speedRate}
                            onChange={(event) => {
                                const realTime = Date.now();
                                const displayTime = isPlaying
                                    ? getDisplayTime(realTime, speedRate)
                                    : date.valueOf();
                                clockAnchor.current = { realTime, displayTime };
                                setDate(dayjs(displayTime));
                                setSpeedRate(Number(event.target.value));
                            }}
                        >
                            <option value="1">1倍</option>
                            <option value="2">2倍</option>
                            <option value="5">5倍</option>
                            <option value="10">10倍</option>
                            <option value="60">60倍</option>
                        </select>
                    </label>
                </div>

                <details className="time-adjustment">
                    <summary>表示時刻を指定</summary>
                    <label>
                        日時
                        <input
                            type="datetime-local"
                            step="1"
                            value={date.format("YYYY-MM-DDTHH:mm:ss")}
                            onChange={(event) => {
                                if (event.target.value) {
                                    setDisplayDate(dayjs(event.target.value));
                                }
                            }}
                        />
                    </label>
                </details>

                <div className="route-legend">
                    <h2>路線</h2>
                    <ul>
                        {routes.map((route) => (
                            <li key={route.code}>
                                <span
                                    className="route-swatch"
                                    style={{ backgroundColor: route.railload.colorcode }}
                                    aria-hidden="true"
                                />
                                <span>{route.timeTables[0]?.line ?? route.code}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>
        </aside>
        <section className="map-region" aria-label="路線地図">
            <MapContainer
                maxZoom={21}
                center={initialPosition}
                zoom={initialZoom}
                className="map-canvas"
            >
                <TileLayer
                    maxNativeZoom={19}
                    maxZoom={21}
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FitRoutes routes={routes} />
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
        </section>
    </main>
    );
};
