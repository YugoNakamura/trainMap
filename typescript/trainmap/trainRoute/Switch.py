import math
class Switch:
    def __init__(self, coords, stations):
        self.coords = coords
        self.stations = stations
        self.switches = []

        self.searchSwitch()
        self.setSwitchId()

    def getDistance(self, coord1, coord2):
        # 緯度経度から距離を計算する
        lat1, lon1 = coord1
        lat2, lon2 = coord2
        return ((lat2 - lat1)**2 + (lon2 - lon1)**2) ** 0.5
    
    def searchSwitch(self):
        # 分岐点の座標を取得
        # sectionの始点，終点それぞれで分岐点を取得
        searchIndexes = [0, -1]
        for k in range(len(searchIndexes)):
            for i in range(len(self.coords)):
                termCoord = self.coords[i][searchIndexes[k]]
                count = 0
                appended = False
                # ある場合はスキップ
                for j in range(len(self.switches)):
                    if self.switches[j]['coord'] == termCoord:
                        appended = True
                # もし同じ座標がなければ同一の座標で始まる/終わるsectionの数をカウント
                if not appended:
                    for i in range(len(self.coords)):
                        if self.coords[i][0] == termCoord or self.coords[i][-1] == termCoord:
                            count += 1
                    # 自分自身の分を引く
                    count -= 1
                    # section[i]以外に同じ座標で始まる/終わるsectionがあれば分岐点
                    # とみなして追加
                    if count > 1:
                        self.switches.append({
                            'id': '',
                            'coord': termCoord,
                            'direction':[]
                        })

    # 駅と分岐点との距離から各分岐点ごとにIDを付与
    def setSwitchId(self):
        # 分岐点に最も近い駅の名前を取得
        for i in range(len(self.switches)):
            minDist = 999999
            for j in range(len(self.stations)):
                dist = self.getDistance(self.switches[i]['coord'], self.stations[j]['coord'])
                if dist < minDist:
                    minDist = dist
                    self.switches[i]['id'] = self.stations[j]['code']

        # 分岐点のIDを駅名コード + A/B/C...のようにする
        # 駅名のリストを作成
        stationList = []
        for i in range(len(self.stations)):
            if self.stations[i]['code'] not in stationList:
                stationList.append(self.stations[i]['code'])

        for i in range(len(stationList)):
            trackList = list(filter(lambda switchId: switchId['id'] == stationList[i], self.switches))
            ch = 65
            for j in range(len(trackList)):
                trackList[j]['id'] = trackList[j]['id'] + "-" + chr(ch)
                ch += 1
                # 駅名 + A/B/C...

    def setDirection(self, sections):
        for i in range(len(self.switches)):
            # Switchに繋がるSectionのから座標とIDを取得
            miniSecs = []
            for j in range(len(sections)):
                if self.switches[i]['coord'] == sections[j]['coords'][0]:
                    miniSecs.append({
                        'id': sections[j]['id'],
                        'coords': [sections[j]['coords'][0], sections[j]['coords'][1]]
                    })
                if self.switches[i]['coord'] == sections[j]['coords'][-1]:
                    miniSecs.append({
                        'id': sections[j]['id'],
                        'coords': [sections[j]['coords'][-1], sections[j]['coords'][-2]]
                    })
                    
            # Switchに繋がる3つのSectionがなす角を計算
            angle01 = {
                'theta': self.getAngle(self.switches[i]['coord'], miniSecs[0]['coords'][1], miniSecs[1]['coords'][1]),
                'angleSecId': [miniSecs[0]['id'], miniSecs[1]['id']],
                'anotherSecId': miniSecs[2]['id']
                }
            angle12 = {
                'theta': self.getAngle(self.switches[i]['coord'], miniSecs[1]['coords'][1], miniSecs[2]['coords'][1]),
                'angleSecId': [miniSecs[1]['id'], miniSecs[2]['id']],
                'anotherSecId': miniSecs[0]['id']
                }
            angle20 = {
                'theta': self.getAngle(self.switches[i]['coord'], miniSecs[2]['coords'][1], miniSecs[0]['coords'][1]),
                'angleSecId': [miniSecs[2]['id'], miniSecs[0]['id']],
                'anotherSecId': miniSecs[1]['id']
            }

            # なす角が最小値のSectionの組み合わせを取得
            minAngle = min(angle01, angle12, angle20, key=self.min_func)

            # 条件なしで通過できる場合
            for j in range(len(minAngle['angleSecId'])):
                self.switches[i]['direction'].append({
                    'from': minAngle['angleSecId'][j],
                    'to': minAngle['anotherSecId'],
                    'condition': 'none'
                })
            # 条件から判断して分岐する場合
            for j in range(len(minAngle['angleSecId'])):
                self.switches[i]['direction'].append({
                    'from': minAngle['anotherSecId'],
                    'to': minAngle['angleSecId'][j],
                    'condition': ''
                })


    # setDirection内で用いているmin関数の用関数 
    def min_func(self, angle):
        return angle['theta']

    def getAngle(self, coordO, coord1, coord2):
        # 3点の緯度経度からなす角を求める
        distO1 = self.getDistance(coordO, coord1)
        distO2 = self.getDistance(coordO, coord2)
        inner = ((coord1[0]-coordO[0])*(coord2[0]-coordO[0]) + (coord1[1]-coordO[1])*(coord2[1]-coordO[1]))
        theta = math.degrees(math.acos(inner/(distO1*distO2)))
        return theta



