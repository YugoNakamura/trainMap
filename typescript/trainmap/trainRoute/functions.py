# 指定した座標から始まる/終わる要素がいくつあるか
def countRailload(coord):
    count = 0
    for i in range(len(railRoads)):
        tmpCoords = railRoads[i]['geometry']['coordinates']
        if tmpCoords[0] == coord or tmpCoords[-1] == coord:
            count += 1
    # 自分自身の分を引く
    return count-1

def searchUnUsedRailRoad(coord):
    indexes = []
    for i in range(len(railRoads)):
        tmpCoords = railRoads[i]['geometry']['coordinates']
        if tmpCoords[0] == coord and i not in searchedIndexes:
            indexes.append([i, 1])
        if tmpCoords[-1] == coord and i not in searchedIndexes:
            indexes.append([i, -1])
    return indexes

# 指定したRailRoadの座標から接続数1の区間を連結させ，sectionに変換
def connectRailRoad(railIndex, coordIndex):
    section = []
    while True:
        searchedIndexes.append(railIndex)
        tmpCoords = railRoads[railIndex]['geometry']['coordinates']
        if coordIndex == 1:
            for j in range(len(tmpCoords)):
                section.append([tmpCoords[j][1], tmpCoords[j][0]])
        else:
            for j in reversed(range(len(tmpCoords))):
                section.append([tmpCoords[j][1], tmpCoords[j][0]])

        count = countRailload(section[-1])
        if count !=1:
            sections.append(section)
            return [section[-1][1], section[-1][0]]
        else:
            indexes = searchUnUsedRailRoad(section[-1])
            railIndex = indexes[0][0]
            coordIndex = indexes[0][1]
            section = section[:-1]

def getDistance(coord1, coord2):
    # 緯度経度から距離を計算する
    lat1, lon1 = coord1
    lat2, lon2 = coord2
    return ((lat2 - lat1)**2 + (lon2 - lon1)**2) ** 0.5