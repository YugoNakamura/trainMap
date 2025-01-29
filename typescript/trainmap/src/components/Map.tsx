import { MapContainer, Polyline, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LatLng } from 'leaflet';
import { TrainRoute } from './TrainRoute';

const initialPosition:LatLng = new LatLng(35.00612565794908, 137.0386133186716);
const initialZoom: number = 13;

export const Map = () => {
  TrainRoute().then((data) => {console.log(data)});
  return (
    <div>
      <MapContainer
        center={initialPosition}
        zoom={initialZoom}
        style={{ width: '100%', height: '100dvh'}}
      >
        <TileLayer 
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      </MapContainer>
    </div>
  );
};
