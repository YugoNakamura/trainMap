import json
import Section
import Station
import Switch
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
            jsonRail.append(data)
        elif data['geometry']['type'] == 'Point':
            jsonSta.append(data)

    output = {'sections':[], 'stations':[], 'switchPoints':[]}

    # 駅関係
    # 駅名と座標，ホーム番号，駅番号を結びつける
    sta = Station.Station(jsonSta)
    sta.start()

    # 路線関係
    # 幅優先探索で路線の座標をまとめる
    sec = Section.Section(jsonRail, [136.9855133,34.8738334], sta.stations)
    sec.start()

    # 分岐点関係
    # 分岐点の座標を集計
    sw = Switch.Switch(sec.coords, sta.stations)
    sw.start()

    # 路線，駅，分岐点のそれぞれのnext, prevを設定する
    # 路線，駅，分岐点を統合してJSON形式で保存
    
    output['sections'] = sec.sections
    output['stations'] = sta.stations
    output['switchPoints'] = sw.switch
    jsonfile = open('./mikawaLine.json', 'w')
    json.dump(output, jsonfile, indent=4, ensure_ascii=False)
    jsonfile.close()