# 鉄道路線データ活用方法
## データの準備
参照:https://qiita.com/naogify/items/525be5f41a21d4c82805
1. OpenStreetMapを構成するデータをダウンロードする
    OpenSteetMapのデータはPBFという形式で配布されている．以下のリンクからダウンロードする
    https://download.geofabrik.de/asia/japan.html
2. 鉄道要素を抽出する
    PDFファイルには地図を構成する全ての要素が含まれているため，そこから鉄道要素を抽出する．そのためには**osmium-tool**というソフトを使用する．
    ```bash
    sudo apt install osmium-tool
    ```
    osmium-toolを使用して鉄道要素を抽出する．w/railwayが鉄道を示している．
    ```bash
    osmium tags-filter <抽出元ファイル> w/railway -o <出力ファイル>
    osmium tags-filter chubu-latest.osm.pbf w/railway -o test.osm.pbf
    ```
3. 使用しやすいJSON形式に変換する
    ```bash
    osmium export <変換元pbfファイル> -o <出力jsonファイル>
    osmium export chubu-railway-latest.osm.pbf -o test.json
    ```

## trainMap用データ成型方法
osmiumから変換したjsonファイルは線路が高架や踏切など細かいところで細切れになっていたり，余分な情報を多く含んでいるので自作プログラムで変換する．

