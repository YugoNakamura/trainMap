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
  
  // 使用例
  const splitCount = 20; // 10分割
  var raillatlon = [[34.99083232125649, 137.00849839076383], [34.991062395717265, 137.0060996555937], [34.99043528891681, 137.00364986047262], [34.98625399762896, 136.99517810632577], [34.98485322340993, 136.9938768437879]];
  const equidistantPoint = equidistantPoints(raillatlon, splitCount);
  console.log(equidistantPoint);