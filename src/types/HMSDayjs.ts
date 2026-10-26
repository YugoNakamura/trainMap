import { PluginFunc } from 'dayjs';
//dayjsのプラグイン関数を作成
export const hmsPlugin: PluginFunc = (_option, dayjsClass) => {

    dayjsClass.prototype.getMinuteFromDay = function () {
        let hour = this.hour();
        let minute = this.minute();
        return hour * 60 + minute;
    };
}