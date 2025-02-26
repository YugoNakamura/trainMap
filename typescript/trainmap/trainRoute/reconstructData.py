import json
import math

jsonfile = open('./mikawaLineRailroad.json', 'r')
jsondata = json.load(jsonfile)
jsonfile.close()

# 始点から終点までの緯度経度を一つの配列に格納する
# JSONから各区間の配列を取得
railroads = jsondata['coordinates']

# 始点の緯度経度と終点の緯度経度
startPoint = [137.0397465, 35.0056828]
endPoint = [136.9856149, 34.8738224]
# 既に参照したindexを格納する配列
usedIndex = []
startToEnd = [0]
for l in range(len(railroads)):
    for i in range(len(railroads)):
        # ある区間の配列の最初の要素がstartPointの緯度経度と一致する場合
        if railroads[i]['geometry']['coordinates'][0] == startPoint and i not in usedIndex:
            tmpCoords = railroads[i]['geometry']['coordinates']
            # 末尾の要素を上書きして書き込む
            startToEnd = startToEnd[:-1]
            # 緯度経度を入れ替えて追加
            for j in range(len(tmpCoords)):
                startToEnd.append([tmpCoords[j][1], tmpCoords[j][0]])
                # 次の検索対象を設定
            startPoint = railroads[i]['geometry']['coordinates'][-1]
            usedIndex.append(i)
            break

        # ある区間の配列の最後の要素がstartPointの緯度経度と一致する場合
        if railroads[i]['geometry']['coordinates'][-1] == startPoint and i not in usedIndex:
            tmpCoords = railroads[i]['geometry']['coordinates']
            # 末尾の要素を上書きして書き込む
            startToEnd = startToEnd[:-1]
            for j in reversed(range(len(tmpCoords))):
                startToEnd.append([tmpCoords[j][1], tmpCoords[j][0]])
            startPoint = railroads[i]['geometry']['coordinates'][0]
            usedIndex.append(i)
            break
    # 対象路線の最後の緯度経度が終着駅の緯度経度と一致する場合
    if startToEnd[-1] == [endPoint[1], endPoint[0]]:
        break

# 駅間ごとにrailroadsを分割
jsonfile = open('./mikawaLineStations.json', 'r')
jsondata = json.load(jsonfile)
jsonfile.close()

stationData = jsondata['coordinates']
# stationDataの各行が始発駅から何番目の駅か格納
stationIndex = []
# 各駅の緯度経度がstartToEndの何番目の要素か格納
stationIndexInStartToEnd = []

for i in range(len(startToEnd)):
    for j in range(len(stationData)):
        if [startToEnd[i][1], startToEnd[i][0]] == stationData[j]['geometry']['coordinates']:
            stationIndex.append(j)
            stationIndexInStartToEnd.append(i)
            break

output = {'sections':[], 'stations':[]}
# sections
for i in range(len(stationIndex)-1):
    section = {
        'id': stationData[stationIndex[i]]['properties']['name:en'] + '_' + stationData[stationIndex[i+1]]['properties']['name:en'],
        'prev': '',
        'next': '',
        'distance': 0,
        # [start:end]のend-1番目の要素までスライスされるので[i:[i+1]+1]
        'coords': startToEnd[stationIndexInStartToEnd[i]:stationIndexInStartToEnd[i+1]+1]
    }
    output['sections'].append(section)

for i in range(len(output['sections'])):
    # 1Sectionの長さ
    dist=0;
    coords = output['sections'][i]['coords'];
    for j in range(len(output['sections'][i]['coords'])-1):
        dist += math.sqrt((coords[j][0]-coords[j+1][0])**2 + (coords[j][1]-coords[j+1][1])**2)
    output['sections'][i]['distance'] = dist
    # 前後のsectionのid
    if i != 0:
        output['sections'][i]['prev'] = output['sections'][i-1]['id']
    if i != len(output['sections'])-1:
        output['sections'][i]['next'] = output['sections'][i+1]['id']

# stations
for i in range(len(stationIndex)):
    station ={
        "name": stationData[stationIndex[i]]['properties']['name'],
        "name_en": stationData[stationIndex[i]]['properties']['name:en'],
        "prev": '',
        "next": '',
        "coord": startToEnd[stationIndexInStartToEnd[i]]
    }
    output['stations'].append(station)
# 前後のsectionのid
for i in range(len(output['stations'])):
    if i != 0:
        output['stations'][i]['prev'] = output['sections'][i-1]['id']
    if i !=len(output['stations'])-1:
        output['stations'][i]['next'] = output['sections'][i]['id']

jsonfile = open('./mikawaLine.json', 'w')
json.dump(output, jsonfile, indent=4, ensure_ascii=False)
jsonfile.close()
# 出力するjsonのフォーマット
# section:{[
# id: railroadId,
# prev: prevRailroadId,
# next: nextRailroadId,
# coordinates: [[136.9856149,34.8738224],...]
# ]...}
# station:{[
# name:
# name:en:
# coord: [136.9856149,34.8738224]
# ]...}