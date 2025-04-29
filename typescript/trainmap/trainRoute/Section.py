import json
import numpy as np
class Section:
    def __init__(self, railRoads, startPoint, stations):
        # 既に探索したindex
        self.searchedIndexes = []
        # 探索予定のrailIndex
        self.searchIndexes = []
        # 区間情報
        self.coords = []
        # 路線区間情報
        self.sections = []
        # 未加工の路線情報
        self.railRoads = railRoads
        # 探索を開始する座標(路線の末端)
        self.startPoint = startPoint
        # sectionを駅の座標で分割する
        self.stations = stations

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
                self.coords.append(section)
                return [section[-1][1], section[-1][0]]
            else:
                indexes = self.searchUnUsedRailRoad(section[-1])
                # railIndexとcoordIndexを更新
                railIndex = indexes[0][0]
                coordIndex = indexes[0][1]
                # sectionの末尾を削除
                section = section[:-1]

    # 幅優先探索で路線の座標をまとめる
    def bsf(self):
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

    def getDistance(self, coord1, coord2):
        # 緯度経度から距離を計算する
        lat1, lon1 = coord1
        lat2, lon2 = coord2
        return ((lat2 - lat1)**2 + (lon2 - lon1)**2) ** 0.5

    # coordの向きをある点を基準に並びを整える
    def setCoordDirection(self):
        originPoint = [35.0069959, 137.0378692]
        for i in range(len(self.coords)):
            top = self.getDistance(self.coords[i][0], originPoint)
            bottom = self.getDistance(self.coords[i][-1], originPoint)
            # coodsの先頭から末尾にかけてoriginPointに近づく様にする            
            if top < bottom:
                self.coords[i].reverse()    
                
    # 駅の座標でsectionsを分割
    def splitSections(self):
        # 駅の座標を持つsectionを分割
        for i in range(len(self.stations)):
            for j in range(len(self.coords)):
                index = self.findList(self.coords[j], self.stations[i]['coord'])
                if index != -1 and index != 0 and index != len(self.coords[j])-1:
                    before = self.coords[j][:index+1]
                    after = self.coords[j][index:]
                    self.coords.pop(j)
                    self.coords.insert(j, after)
                    self.coords.insert(j, before)
                    j += 1

    def findList(self, list, element):
        if element in list:
            return list.index(element)
        else:
            return -1

    def start(self):
        self.bsf()
        self.setCoordDirection()
        self.splitSections()

        # 出力用リストにsectionを追加
        for i in range(len(self.coords)):
            dist = 0
            for j in range(len(self.coords[i])-1):
                dist += self.getDistance(self.coords[i][j], self.coords[i][j+1])

            self.sections.append({
                'id': '',
                'prev': '',
                'next': '',
                'distance': dist,
                'coords': self.coords[i]
            })