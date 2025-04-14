class Switch:
    def __init__(self, section, stations):
        self.section = section
        self.stations = stations
        self.switch = []

    def getDistance(coord1, coord2):
        # 緯度経度から距離を計算する
        lat1, lon1 = coord1
        lat2, lon2 = coord2
        return ((lat2 - lat1)**2 + (lon2 - lon1)**2) ** 0.5
    
    def searchSwitch(self):
        # 分岐点の座標を取得
        # sectionの始点，終点それぞれで分岐点を取得
        searchIndexes = [0, -1]
        for k in range(len(searchIndexes)):
            for i in range(len(self.sections)):
                coord = self.sections[i][searchIndexes[k]]
                count = 0
                appended = False
                # ある場合はスキップ
                for j in range(len(self.switch)):
                    if self.switch[j]['coord'] == coord:
                        appended = True
                # もし同じ座標がなければ同一の座標で始まる/終わるsectionの数をカウント
                if not appended:
                    for i in range(len(self.sections)):
                        if self.sections[i][0] == coord or self.sections[i][-1] == coord:
                            count += 1
                    # 自分自身の分を引く
                    count -= 1
                    # section[i]以外に同じ座標で始まる/終わるsectionがあれば分岐点
                    # とみなして追加
                    if count > 1:
                        self.switch.append({
                            'id': '',
                            'coord': coord
                        })
                        
    def setSwitchId(self):
        # 分岐点に最も近い駅の名前を取得
        for i in range(len(self.switch)):
            minDist = 999999
            for j in range(len(self.stations)):
                dist = self.getDistance(self.switch[i]['coord'], self.stations[j]['coord'])
                if dist < minDist:
                    minDist = dist
                    self.switch['switchPoints'][i]['id'] = self.stations[j]['code']

        # 分岐点のIDを駅名コード + A/B/C...のようにする
        # 駅名のリストを作成
        stationList = []
        for i in range(len(self.stations)):
            if self.stations[i]['code'] not in stationList:
                stationList.append(self.stations[i]['code'])

        for i in range(len(stationList)):
            trackList = list(filter(lambda switchId: switchId['id'] == stationList[i], self.switch))
            ch = 65
            for j in range(len(trackList)):
                trackList[j]['id'] = trackList[j]['id'] + "-" + chr(ch)
                ch += 1
                # 駅名 + A/B/C...
