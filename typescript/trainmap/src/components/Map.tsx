import React from 'react';
import { MapContainer, TileLayer , Marker} from 'react-leaflet'
import './Map.css';

export const Map = () => {
  // 緯度軽度
  const position = [34.99, 137];
  // 初期マップズームレベル
  const zoom = 15;
  return (
    <MapContainer center={position} zoom={zoom}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={position}></Marker>
      <Marker position={[35, 137]}></Marker>
    </MapContainer>
  )
};