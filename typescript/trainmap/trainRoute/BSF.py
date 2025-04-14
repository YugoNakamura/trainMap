import json
class BSF:
    def __init__(self, railRoads, startPoint):
        # 既に探索したindex
        self.searchedIndexes = []
        # 探索予定のrailIndex
        self.searchIndexes = []
        # 未加工の路線情報
        self.railRoads = railRoads
        # 探索を開始する座標(路線の末端)
        self.startPoint = startPoint
        # 区間生成の最後に出力するリスト
        self.output = []

    # 指定した座標から始まる/終わる要素がいくつあるか
    def countRailload(self, coord):
        count = 0
        for i in range(len(self.railRoads)):
            tmpCoords = self.railRoads[i]['geometry']['coordinates']
            if tmpCoords[0] == coord or tmpCoords[-1] == coord:
                count += 1
        # 自分自身の分を引く
        return count-1
    
    def searchUnUsedRailRoad(self, coord):
        indexes = []
        for i in range(len(self.railRoads)):
            tmpCoords = self.railRoads[i]['geometry']['coordinates']
            # [railRoads内で座標が一致しているindex, 先頭か末尾か]
            # 先頭の座標が一致した
            if tmpCoords[0] == coord and i not in self.searchedIndexes:
                indexes.append([i, 0])
            # 末尾の座標が一致した
            if tmpCoords[-1] == coord and i not in self.searchedIndexes:
                indexes.append([i, -1])
        return indexes
    
    # 指定したRailRoadの座標から接続数1の区間を連結させ，sectionに変換
    def connectRailRoad(self, railIndex, coordIndex):
        section = []
        while True:
            # 探索済みリストに追加
            self.searchedIndexes.append(railIndex)
            tmpCoords = self.railRoads[railIndex]['geometry']['coordinates']
            if coordIndex == 0:
                for j in range(len(tmpCoords)):
                    section.append([tmpCoords[j][1], tmpCoords[j][0]])
            else:
                for j in reversed(range(len(tmpCoords))):
                    section.append([tmpCoords[j][1], tmpCoords[j][0]])

            # railRoads[railIndex]の後が分岐しているか
            count = self.countRailload(section[-1])
            if count !=1:
                self.sections.append(section)
                return [section[-1][1], section[-1][0]]
            else:
                indexes = self.searchUnUsedRailRoad(section[-1])
                # railIndexとcoordIndexを更新
                railIndex = indexes[0][0]
                coordIndex = indexes[0][1]
                # sectionの末尾を削除
                section = section[:-1]

    def getDistance(coord1, coord2):
        # 緯度経度から距離を計算する
        lat1, lon1 = coord1
        lat2, lon2 = coord2
        return ((lat2 - lat1)**2 + (lon2 - lon1)**2) ** 0.5

    def start(self):
        # 区間情報を生成
        # 路線の末端の座標
        startCoord = self.startPoint
        indexes = self.searchUnUsedRailRoad(startCoord)
        self.searchIndexes.append(indexes[0])

        while True:
            nodeIndex = self.searchIndexes.pop(0)
            lastCoord = self.connectRailRoad(nodeIndex[0], nodeIndex[1])
            # serachedIndexesにもsearchIndexesにもないindexをsearchIndexesに追加
            indexes = self.searchUnUsedRailRoad(lastCoord)
            for index in indexes:
                match = False
                # 既に探索済みのindexと一致しているか
                for searchIndex in self.searchIndexes:
                    if index[0] == searchIndex[0]:
                        match = True
                if match == False:
                    self.searchIndexes.append(index)
            if len(self.searchIndexes) == 0:
                break

        # 出力用リストにsectionを追加
        for i in range(len(self.sections)):
            dist = 0
            for j in range(len(self.sections[i])-1):
                dist += self.getDistance(self.sections[i][j], self.sections[i][j+1])

            self.output.append({
                'id': '',
                'prev': '',
                'next': '',
                'distance': dist,
                'coords': self.sections[i]
            })
