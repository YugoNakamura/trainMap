import json

jsonfile = open('./mikawaLineFull.json', 'r')
jsondata = json.load(jsonfile)
jsonfile.close()


stations = list(filter(lambda data: data['geometry']['type']=='Point', jsondata['features']))
output = []
for i in range(len(stations)):
    data = {'coord':'', 'name_en':'', 'trackNo':''}
    data['coord'] = stations[i]['geometry']['coordinates']
    data['name_en'] = stations[i]['properties']['name:en']
    data['trackNo'] = ''
    output.append(data)

jsonfile = open('./mikawaLineTrackNo.json', 'w')
json.dump(output, jsonfile, indent=4, ensure_ascii=False)
jsonfile.close()
