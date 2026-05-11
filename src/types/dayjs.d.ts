import dayjs from 'dayjs';

declare module 'dayjs' {
    interface Dayjs {
        getSecondsFromDay(): number;
        getMinuteFromDay(): number;
        isHMSAfter(other: dayjs.Dayjs): boolean;
        isHMSBefore(other: dayjs.Dayjs): boolean;
        isHMSSame(other: dayjs.Dayjs): boolean;
        isHMSSameOrAfter(other: dayjs.Dayjs): boolean;
        isHMSSameOrBefore(other: dayjs.Dayjs): boolean;
        hmsDiff(other: dayjs.Dayjs, unit: dayjs.ManipulateType): number;
    }
}