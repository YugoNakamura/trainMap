import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LatLng } from 'leaflet';
import { Railloads} from './Railloads';
import { Train } from './Train';
import { LoadJson } from './LoadJson';
import { useEffect, useState } from 'react';
import { Railload } from '../types/railload';

const initialPosition:LatLng = new LatLng(35, 137);
const initialZoom: number = 16;

export const Map = () => {
  const [railData, setRailData] = useState<Railload>({ sections: [], stations: [] });
  useEffect(() => {
    LoadJson<Railload>('./trainRoute/mikawaLine.json')
    .then(railData => {
      setRailData(railData);
    });
  },[])

  return (
    <div>
      <MapContainer
        maxZoom={18}
        center={initialPosition}
        zoom={initialZoom}
        style={{ width: '100%', height: '100dvh'}}
      >
        <TileLayer 
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Railloads railload={railData} />
        <Train />
      </MapContainer>
    </div>
  );
};
