import json
import numpy as np
import BFS
class Section:
    def __init__(self, railRoads, startPoint, stations):
        bfs = BFS.BFS(railRoads, startPoint)
        # 区間情報
        self.coords = bfs.start()
        # 路線区間情報
        self.sections = []
        # sectionを駅の座標で分割する
        self.stations = stations

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