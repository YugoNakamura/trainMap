import dayjs, { PluginFunc } from 'dayjs';
const getSecondsFromDay = function (date:dayjs.Dayjs) {
    let hour = date.hour();
    let minute = date.minute();
    let second = date.second();
    return hour * 3600 + minute * 60 + second;
};
//dayjsのプラグイン関数を作成
export const hmsPlugin: PluginFunc = (_option, dayjsClass) => {

    dayjsClass.prototype.isHMSAfter = function (other:dayjs.Dayjs) {
        return getSecondsFromDay(this) > getSecondsFromDay(other);
    };
    dayjsClass.prototype.isHMSBefore = function (other:dayjs.Dayjs) {
        return getSecondsFromDay(this) < getSecondsFromDay(other);
    };
    dayjsClass.prototype.isHMSSame = function (other:dayjs.Dayjs) {
        return getSecondsFromDay(this) === getSecondsFromDay(other);
    };
    dayjsClass.prototype.isHMSSameOrAfter = function (other:dayjs.Dayjs) {
        return getSecondsFromDay(this) >= getSecondsFromDay(other);
    };
    dayjsClass.prototype.isHMSSameOrBefore = function (other:dayjs.Dayjs) {
        return getSecondsFromDay(this) <= getSecondsFromDay(other);
    };

    //2つの時刻の時分秒から差分をミリ秒で返す関数
    dayjsClass.prototype.hmsDiff = function (other:dayjs.Dayjs, unit:dayjs.ManipulateType) {
        let hourDiff = this.hour() - other.hour();
        let minuteDiff = this.minute() - other.minute();
        let secondDiff = this.second() - other.second();
        let millisecondDiff = this.millisecond() - other.millisecond();
        let diffInSeconds = hourDiff * 3600 + minuteDiff * 60 + secondDiff + millisecondDiff;
        switch (unit) {
            case 'millisecond':
                return diffInSeconds;
            case 'second':
                return diffInSeconds/1000;
            case 'minute':
                return diffInSeconds / 60*1000;
            case 'hour':
                return diffInSeconds / 60*60*1000;
            default:
                throw new Error("Invalid unit for hmsDiff. Use 'second', 'minute', or 'hour'.");
        }
    }
    dayjsClass.prototype.getMinuteFromDay = function () {
        let hour = this.hour();
        let minute = this.minute();
        return hour * 60 + minute;
    };
}