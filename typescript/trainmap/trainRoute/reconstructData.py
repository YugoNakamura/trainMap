import json

jsonfile = open('./mikawaLineRailroad.json', 'r')
jsondata = json.load(jsonfile)

# 知立駅から碧南駅までの三河線の緯度経度を出力
railroads = jsondata['coordinates']
# 知立駅の緯度経度
startPoint = [137.0397465, 35.0056828]
endPoint = [136.9856149, 34.8738224]
# 既に参照したindexを格納する配列
usedIndex = []
mikawaLine = []
for l in range(len(railroads)):
    for i in range(len(railroads)):
        # 配列の最初の要素が知立駅の緯度経度と一致する場合
        if railroads[i]['geometry']['coordinates'][0] == startPoint and i not in usedIndex:
            for point in railroads[i]['geometry']['coordinates']:
                mikawaLine.append(point)
            startPoint = railroads[i]['geometry']['coordinates'][len(railroads[i]['geometry']['coordinates'])-1]
            usedIndex.append(i)
            break

        # 配列の最後の要素が知立駅の緯度経度と一致する場合
        if railroads[i]['geometry']['coordinates'][len(railroads[i]['geometry']['coordinates'])-1] == startPoint and i not in usedIndex:
            for point in reversed(railroads[i]['geometry']['coordinates']):
                mikawaLine.append(point)
            startPoint = railroads[i]['geometry']['coordinates'][0]
            usedIndex.append(i)
            break
    
    # 三河線の終点が碧南駅の緯度経度と一致する場合
    if mikawaLine[len(mikawaLine)-1] == endPoint:
        break
print(mikawaLine)