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
    jsonRail = []
    jsonSta = []
    jsondata = jsondata['features']

    for data in jsondata:
        if data['geometry']['type'] == 'LineString':
            # 座標部分を抽出/緯度経度の順番に変更
            jsonCoords = data['geometry']['coordinates']
            for i in range(len(jsonCoords)):
                jsonCoords[i] = [jsonCoords[i][1], jsonCoords[i][0]]
            jsonRail.append(jsonCoords)
        elif data['geometry']['type'] == 'Point':
            jsonSta.append(data)

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

    sta.setID(sec.sections)

    # 路線，駅，分岐点を統合してJSON形式で保存
    output['sections'] = sec.sections
    output['stations'] = sta.stations
    output['switchPoints'] = sw.switches
    jsonfile = open('./mikawaLine.json', 'w')
    json.dump(output, jsonfile, indent=4, ensure_ascii=False)
    jsonfile.close()