import json

# 既に探索したindex
searchedIndexes = []
# 探索予定のrailIndex
searchIndexes = []
sections = []

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

jsonfile = open('./mikawaLineFull.json', 'r')
jsondata = json.load(jsonfile)
jsonfile.close()

# JSONから鉄道(railRoads)と駅(stations)のデータを分割
railRoads = []
stations = []
jsondata = jsondata['features']
for data in jsondata:
    if data['geometry']['type'] == 'LineString':
        railRoads.append(data)
    elif data['geometry']['type'] == 'Point':
        stations.append(data)

output = {'sections':[], 'stations':[], 'switchPoints':[]}

# 区間情報を生成
startCoord = [136.9855133,34.8738334]
indexes = searchUnUsedRailRoad(startCoord)
searchIndexes.append(indexes[0])

while True:
    nodeIndex = searchIndexes.pop(0)
    lastCoord = connectRailRoad(nodeIndex[0], nodeIndex[1])
    # serachedIndexesにもsearchIndexesにもないindexをsearchIndexesに追加
    indexes = searchUnUsedRailRoad(lastCoord)
    for index in indexes:
        match = False
        for searchIndex in searchIndexes:
            if index[0] == searchIndex[0]:
                match = True
        if match == False:
            searchIndexes.append(index)
    if len(searchIndexes) == 0:
        break

for i in range(len(sections)):
    output['sections'].append({
        'id': '',
        'prev': '',
        'next': '',
        'distance': 0,
        'coords': sections[i]
    })

# 駅情報を生成
jsonfile = open('./mikawaLineTrackNo.json', 'r')
trackList = json.load(jsonfile)
jsonfile.close()

for i in range(len(stations)):
    for j in range(len(trackList)):
        if stations[i]['geometry']['coordinates'] == trackList[j]['coord']:
            trackListIndex = j
            break
    output['stations'].append({
        "name": stations[i]['properties']['name'],
        "name_en": stations[i]['properties']['name:en'],
        "trackNo":trackList[j]['trackNo'],
        "code": trackList[j]['code'],
        "prev": '',
        "next": '',
        "coord": [stations[i]['geometry']['coordinates'][1], stations[i]['geometry']['coordinates'][0]]
    })

# 分岐点の座標を取得
# sectionの始点，終点それぞれで分岐点を取得
searchIndexes = [0, -1]
for k in range(len(searchIndexes)):
    for i in range(len(sections)):
        coord = sections[i][searchIndexes[k]]
        count = 0
        appended = False
        # 既にoutput['switchPoints']に同じ座標があるか確認
        # ある場合はスキップ
        for j in range(len(output['switchPoints'])):
            if output['switchPoints'][j]['coord'] == coord:
                appended = True
        # もし同じ座標がなければ同一の座標で始まる/終わるsectionの数をカウント
        if not appended:
            for i in range(len(sections)):
                if sections[i][0] == coord or sections[i][-1] == coord:
                    count += 1
            # section[i]以外に同じ座標で始まる/終わるsectionがあれば分岐点
            # とみなして追加
            if count > 2:
                output['switchPoints'].append({
                    'id': '',
                    'coord': coord
                })

# 分岐点に最も近い駅の名前を取得
for i in range(len(output['switchPoints'])):
    minDist = 999999
    for j in range(len(output['stations'])):
        dist = getDistance(output['switchPoints'][i]['coord'], output['stations'][j]['coord'])
        if dist < minDist:
            minDist = dist
            output['switchPoints'][i]['id'] = output['stations'][j]['name_en']

# 分岐点の名前を駅名(英文) + A/B/C...のようにする
# 駅名のリストを作成
stationList = []
for i in range(len(output['stations'])):
    if output['stations'][i]['name_en'] not in stationList:
        stationList.append(output['stations'][i]['name_en'])

for i in range(len(stationList)):
    trackList = list(filter(lambda switchPoint: switchPoint['id'] == stationList[i], output['switchPoints']))
    ch = 65
    for j in range(len(trackList)):
        trackList[j]['id'] = trackList[j]['id'] + chr(ch)
        ch += 1
        # 駅名 + A/B/C...

jsonfile = open('./mikawaLine.json', 'w')
json.dump(output, jsonfile, indent=4, ensure_ascii=False)
jsonfile.close()