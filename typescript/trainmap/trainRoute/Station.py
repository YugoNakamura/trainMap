import json


class Station:
    def __init__(self, jsonStas):
        self.jsonStas = jsonStas
        self.stations = []
    
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
                "id": trackList[j]['code']+"_"+trackList[j]['trackNo'],
                "name": self.jsonStas[i]['properties']['name'],
                "name_en": self.jsonStas[i]['properties']['name:en'],
                "code": trackList[j]['code'],
                "prev": '',
                "next": '',
                "coord": [self.jsonStas[i]['geometry']['coordinates'][1], self.jsonStas[i]['geometry']['coordinates'][0]]
            })

    def setID(self, sections):
        for i in range(len(self.stations)):
            self.stations[i]['prev'] = 'end'
            self.stations[i]['next'] = 'end'
            for j in range(len(sections)):
                if self.stations[i]['coord'] == sections[j]['coords'][0]:
                    self.stations[i]['next'] = sections[j]['id']
                if self.stations[i]['coord'] == sections[j]['coords'][-1]:
                    self.stations[i]['prev'] = sections[j]['id']
