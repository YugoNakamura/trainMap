import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LatLng } from 'leaflet';
import { TrainRoute } from './TrainRoute';
import { useEffect, useState } from 'react';

const initialPosition:LatLng = new LatLng(35, 137);
const initialZoom: number = 16;

export const Map = () => {
  const [markers, setMarkers] = useState<JSX.Element[]>([]);

  useEffect(() => {
    TrainRoute()
      .then((element) => setMarkers(element));
  }, []);
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
        {markers}
      </MapContainer>
    </div>
  );
};
