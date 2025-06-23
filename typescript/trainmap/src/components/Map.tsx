import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LatLng } from 'leaflet';
import { Railloads} from './Railloads';
import { LoadJson } from './LoadJson';
import { useEffect, useState } from 'react';
import { Railload } from '../types/railload';
import { TrainScheduler } from './TrainScheduler';
import './Map.css';

const initialPosition:LatLng = new LatLng(35.0056828, 137.0397465);
const initialZoom: number = 16;

export const Map = () => {
  const [railData, setRailData] = useState<Railload>({ sections: [], stations: [], switchPoints: []});
  useEffect(() => {
    LoadJson<Railload>('./trainRoute/mikawaLine.json')
    .then(railData => {
      setRailData(railData);
    });
  },[])

  const [speedRate, setSpeedRate] = useState<number>(1);
  const [trainSchProp, setTrainSchProp] = useState<number>(1);

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
        <TrainScheduler speedRate={trainSchProp}/>
      </MapContainer>

      <form style={{position: 'absolute', top: 20, left: 50, zIndex: 1000}}>
        <input type="datetime-local" name="date" />
        <select name="speedRate" onChange={(e) => setSpeedRate(Number(e.target.value))}>
          <option value="1">x1</option>
          <option value="2">x2</option>
          <option value="5">x5</option>
          <option value="10">x10</option>
          <option value="60">x60</option>        
        </select>
        <button type="button" onClick={() => setTrainSchProp(speedRate)}>OK</button>
      </form>
    </div>
  );
};
