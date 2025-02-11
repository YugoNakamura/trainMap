import { useEffect, useState } from "react";
import { Marker } from "react-leaflet";

export const Train = () => {
    const initialPosition: number[] = [35, 137];
    const radius: number = 0.0005;
    const [position, setPosition] = useState<number[]>(initialPosition);
    const [theta, setTheta] = useState<number>(0);
    useEffect(() => {
        const interval = setInterval(() => {
            const newLat:number = initialPosition[0]+(radius*Math.cos(theta));
            const newLng:number = initialPosition[1]+(radius*Math.sin(theta));
            setTheta(theta+0.1);
            setPosition([newLat, newLng]);
        }, 33);
        return () => clearInterval(interval);
    }, [position]);
    
    return (
        <Marker position={[position[0], position[1]]} />
    );
}   

