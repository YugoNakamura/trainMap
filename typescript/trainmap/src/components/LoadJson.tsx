import { useState } from "react";

export function LoadJson(path: string) {
    const [data, setData] = useState();

    fetch(path)
    .then(response => response.json())
    .then(data => setData(data));

    return data;
}