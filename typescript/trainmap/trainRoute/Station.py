import json


class Station:
    def __init__(self, jsonStas):
        self.jsonStas = jsonStas
        self.stations = []
    
    def start(self):
        # 駅情報を生成
        jsonfile = open('./mikawaLineTrackNo.json', 'r')
        trackList = json.load(jsonfile)
        jsonfile.close()

        for i in range(len(self.jsonStas)):
            for j in range(len(trackList)):
                if self.jsonStas[i]['geometry']['coordinates'] == trackList[j]['coord']:
                    trackListIndex = j
                    break
            self.stations.append({
                "id": trackList[j]['code']+"-"+trackList[j]['trackNo'],
                "name": self.jsonStas[i]['properties']['name'],
                "name_en": self.jsonStas[i]['properties']['name:en'],
                "code": trackList[j]['code'],
                "prev": '',
                "next": '',
                "coord": [self.jsonStas[i]['geometry']['coordinates'][1], self.jsonStas[i]['geometry']['coordinates'][0]]
            })
