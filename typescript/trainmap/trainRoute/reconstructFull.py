import json
import math

jsonfile = open('./mikawaLineFull.json', 'r')
jsondata = json.load(jsonfile)
jsonfile.close()

# JSONから鉄道(railRoads)と駅(stations)のデータを分割
railRoads = []
stations = []
for data in jsondata:
    if data['geometry']['type'] == 'LineString':
        railRoads.append(data)
    elif data['geometry']['type'] == 'Point':
        stations.append(data)

# 始点の緯度経度と終点の緯度経度
# 猿投
startPoint = [137.1786511,35.1221836]
# 碧南
endPoint = [136.9856149, 34.8738224]

# 路線の全探索
# 既に参照したindexを格納する配列
usedIndex = []
# 配列結合時に末尾の要素を上書きするので初期値を0に設定
section = [0]
sections = []
nextIndex = []




def connectRailRoad():
    for i in range(len(railRoads)):
        tmpCoords = railRoads[i]['geometry']['coordinates']
        if tmpCoords[0] == startPoint and i not in usedIndex:
            # 末尾の要素を上書きして書き込む
            section = section[:-1]
            for j in range(len(tmpCoords)):
                section.append([tmpCoords[j][1], tmpCoords[j][0]])
            # 次の検索対象を設定
            startPoint = railRoads[i]['geometry']['coordinates'][-1]
            usedIndex.append(i)

        if tmpCoords[-1] == startPoint and i not in usedIndex:
            # 末尾の要素を上書きして書き込む
            section = section[:-1]
            for j in reversed(range(len(tmpCoords))):
                section.append([tmpCoords[j][1], tmpCoords[j][0]])
            startPoint = railRoads[i]['geometry']['coordinates'][-1]
            usedIndex.append(i)                

    # 上で追加した座標の終点から繋がるrailRoadを取得
    for i in range(len(railRoads)):
        tmpCoords = railRoads[i]['geometry']['coordinates']
        if section[-1] == tmpCoords[0] or section[-1] == tmpCoords[-1]:
            nextIndex.append(i)
    # sectionで区切らない(場合分岐なく次のrailRoadに続く場合)
    if len(nextIndex) == 1:
        connectRailRoad()
    # sectionで区切る場合
    else:
        sections.append(section)
        if len(nextIndex) == 0:
            return
        else:
            for i in range(len(nextIndex)):
                connectRailRoad()
            