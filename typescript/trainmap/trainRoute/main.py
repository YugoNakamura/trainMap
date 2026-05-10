import json
import Section
import Station
import Switch
import BFS
if __name__ == '__main__':
    # JSONからOSMのデータ読み込み
    jsonfile = open('./mikawaLineFull.json', 'r')
    jsondata = json.load(jsonfile)
    jsonfile.close()

    # JSONから鉄道(railRoads)と駅(stations)のデータを分割
    # 各行の座標を要素とした2次元配列
    jsonRail = []
    # 駅に関する1行全てを要素とした1次元配列
    jsonSta = []

    jsondata = jsondata['features']

    # JSONのデータから鉄道と駅の情報を抽出
    for data in jsondata:
        # 線路のデータはLineString，駅のデータはPointで表されているため，タイプを確認して分割
        if data['geometry']['type'] == 'LineString':
            # 座標部分を抽出
            jsonCoords = data['geometry']['coordinates']
            # 緯度経度の順番を[緯度, 経度]に変更
            for i in range(len(jsonCoords)):
                jsonCoords[i] = [jsonCoords[i][1], jsonCoords[i][0]]
            jsonRail.append(jsonCoords)

        elif data['geometry']['type'] == 'Point':
            jsonSta.append(data)
    
    # jsonRailの各要素の先頭と末尾が別の要素の先頭と末尾以外にある時は分割
    for i in range(len(jsonRail)):
        popList = []
        for j in range(len(jsonRail)):
            for k in range(len(jsonRail[j])):
                if (jsonRail[i][0] == jsonRail[j][k] or jsonRail[i][-1] == jsonRail[j][k]) and\
                      k != 0 and k != len(jsonRail[j])-1:
                    popList.append([j, k])
        for n in range(len(popList)):
            before = jsonRail[popList[n][0]][:popList[n][1]+1]
            after = jsonRail[popList[n][0]][popList[n][1]:]
            jsonRail.pop(popList[n][0])
            jsonRail.insert(popList[n][0], after)
            jsonRail.insert(popList[n][0], before)
            


    output = {'sections':[], 'stations':[], 'switchPoints':[]}

    # 駅関係
    # 駅名と座標，ホーム番号，駅番号を結びつける
    sta = Station.Station(jsonSta)

    bfs = BFS.BFS(jsonRail, [34.8738334, 136.9855133])

    # 分岐点関係
    # 分岐点の座標を集計
    sw = Switch.Switch(bfs.coords, sta.stations)

    # 路線関係
    # 幅優先探索で路線の座標をまとめる
    sec = Section.Section(bfs.coords, sta.stations, sw.switches)

    # Stationにその前後のSectionのIDを記入
    sta.setID(sec.sections)

    # Switchに接続しているSectionのIDと通行の条件を記入
    sw.setDirection(sec.sections)
    
    # 路線，駅，分岐点を統合してJSON形式で保存
    output['sections'] = sec.sections
    output['stations'] = sta.stations
    output['switchPoints'] = sw.switches
    jsonfile = open('./mikawaLine.json', 'w')
    json.dump(output, jsonfile, indent=4, ensure_ascii=False)
    jsonfile.close()