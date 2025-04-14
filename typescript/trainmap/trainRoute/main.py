import json
import BSF
if __name__ == '__main__':
    # JSONからOSMのデータ読み込み
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
    # 路線関係
    # 幅優先探索で路線の座標をまとめる
    bsf = BSF.BSF(railRoads, [136.9855133,34.8738334], output)
    bsf.start()
    # 配列の向きを上り順にする

    # 駅関係
    # 駅名と座標，ホーム番号，駅番号を結びつける
    
    # 分岐点関係
    # 分岐点の座標を集計

    # 駅と分岐点との距離から各分岐点ごとにIDを付与


    # 路線の配列の内，駅の座標が含まれているものを分割する

    # 路線，駅，分岐点のそれぞれのnext, prevを設定する
    # 路線，駅，分岐点を統合してJSON形式で保存
    print()
