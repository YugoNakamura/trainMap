//HTML上のID"map"に地図オブジェクトを設定
const map = L.map('map').setView([35,137], 14);
//OSMへ地図画像のリクエスト方法，最大ズーム，右下の権利表示
const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
	maxZoom: 19,
	attribution: '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);
main();

function main() {
	//刈谷駅から刈谷市駅までの線路座標
	var raillatlons = [[34.99083232125649, 137.00849839076383], [34.991062395717265, 137.0060996555937], [34.99043528891681, 137.00364986047262], [34.98625399762896, 136.99517810632577], [34.98485322340993, 136.9938768437879]];

	//路線
	L.polyline(raillatlons, {color: 'red', weight: 5}).addTo(map);
	//電車の位置を示すアイコン
	var trainMarker = L.marker(raillatlons[0]).addTo(map);

	//駅間の走行時間
	var during = 20;

	const equidistantPoint = equidistantPoints(raillatlons, during);
	const counter = createCounter();
	setInterval(() => {moveMarker(equidistantPoint, trainMarker, counter);}, 500);
}
//線路座標を線形補完
function equidistantPoints(raillatlons, split) {
    const result = [];
    const totalDistance = raillatlons.reduce((sum, point, index) => {
      if (index === 0) return 0;
      return sum + L.latLng(point).distanceTo(L.latLng(raillatlons[index - 1]));
    }, 0);
  
    const stepDistance = totalDistance / split;
  
    let currentDistance = 0;
    let lastPoint = raillatlons[0];
    result.push(lastPoint);
  
    for (let i = 1; i < raillatlons.length; i++) {
      const currentPoint = raillatlons[i];
      const distanceToCurrent = L.latLng(lastPoint).distanceTo(L.latLng(currentPoint));
  
      while (currentDistance + stepDistance <= distanceToCurrent) {
        const ratio = (currentDistance + stepDistance) / distanceToCurrent;
        const newLat = lastPoint[0] + (currentPoint[0] - lastPoint[0]) * ratio;
        const newLng = lastPoint[1] + (currentPoint[1] - lastPoint[1]) * ratio;
        result.push([newLat, newLng]);
        currentDistance += stepDistance;
      }
  
      lastPoint = currentPoint;
      currentDistance = 0;
    }
    result.push(raillatlons[raillatlons.length-1]);
    return result;
}

function moveMarker(equidistantPoint, trainMarker, counter) {
	
	var pos = counter();
	if (pos >= equidistantPoint.length) {
		pos = equidistantPoint.length-1;
	}
	trainMarker.setLatLng(equidistantPoint[pos]);
}
function createCounter() {
	let a = 0;
	return function() {
		a++;
		return a;
	};
}
