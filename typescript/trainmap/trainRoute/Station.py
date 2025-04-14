import json


class Station:
    def __init__(self, stations):
        self.stations = stations
        self.output = []
    
    def start(self):
        # 駅情報を生成
        jsonfile = open('./mikawaLineTrackNo.json', 'r')
        trackList = json.load(jsonfile)
        jsonfile.close()

        for i in range(len(self.stations)):
            for j in range(len(trackList)):
                if self.stations[i]['geometry']['coordinates'] == trackList[j]['coord']:
                    trackListIndex = j
                    break
            self.output.append({
                "id": trackList[j]['code']+"-"+trackList[j]['trackNo'],
                "name": self.stations[i]['properties']['name'],
                "name_en": self.stations[i]['properties']['name:en'],
                "code": trackList[j]['code'],
                "prev": '',
                "next": '',
                "coord": [self.stations[i]['geometry']['coordinates'][1], self.stations[i]['geometry']['coordinates'][0]]
            })
