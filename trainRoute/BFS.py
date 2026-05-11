class BFS:
    def __init__(self, jsonRail, startPoint):
        # 既に探索したindex
        self.searchedIndexes = []
        # 探索予定のrailIndex
        self.searchIndexes = []
        # 区間情報
        self.coords = []
        # 未加工の路線情報
        self.jsonRail = jsonRail
        # 探索を開始する座標(路線の末端)
        self.startPoint = startPoint

        self.bfsRail()

    # 指定した座標から始まる/終わる要素がいくつあるか
    def countRailload(self, coord):
        count = 0
        for i in range(len(self.jsonRail)):
            if self.jsonRail[i][0] == coord or self.jsonRail[i][-1] == coord:
                count += 1
        # 自分自身の分を引く
        return (count-1)
    
    #coordで始まる未探索の線路を取得
    def searchUnUsedRailRoad(self, coord):
        indexes = []
        for i in range(len(self.jsonRail)):
            # [railRoads内で座標が一致しているindex, 先頭(0)か末尾(-1)か]
            # 先頭の座標が一致した


            if self.jsonRail[i][0] == coord and i not in self.searchedIndexes:
                indexes.append([i, 0])
            # 末尾の座標が一致した
            if self.jsonRail[i][-1] == coord and i not in self.searchedIndexes:
                indexes.append([i, -1])
        return indexes
    
    # 指定したRailRoadの座標から接続数1の区間を連結させ，sectionに変換
    def connectRailRoad(self, index):        
        railIndex = index[0]
        coordIndex = index[1]
        section = []
        while True:
            # 探索済みリストに追加
            self.searchedIndexes.append(railIndex)
            # 座標部分だけを取得
            # sectionに追加
            if coordIndex == 0:
                for j in range(len(self.jsonRail[railIndex])):
                    section.append(self.jsonRail[railIndex][j])
            else:
                for j in reversed(range(len(self.jsonRail[railIndex]))):
                    section.append(self.jsonRail[railIndex][j])

            # railRoads[railIndex]の後が分岐しているか
            count = self.countRailload(section[-1])
            # 線路の末端(0)，分岐点(2)の場合
            if count !=1:
                self.coords.append(section)
                return section[-1]
            else:
                indexes = self.searchUnUsedRailRoad(section[-1])

                # railIndexとcoordIndexを更新
                railIndex = indexes[0][0]
                coordIndex = indexes[0][1]
                # sectionの末尾を削除
                section = section[:-1]

    # 幅優先探索で路線の座標をまとめる
    def bfsRail(self):
        searchCoord = self.startPoint

        while True:
            indexes = self.searchUnUsedRailRoad(searchCoord)
            for index in indexes:
                self.searchIndexes.append(index)

            while True:
                # 探索予定のindexが無くなったら終了
                if len(self.searchIndexes) == 0:
                    return
                nodeIndex = self.searchIndexes.pop(0)
                if nodeIndex[0] not in self.searchedIndexes:
                    break

            searchCoord = self.connectRailRoad(nodeIndex)
    