import { CONFIG } from '../../shared/config';
export class TimeManager {
  constructor(public minutes = 480) {}
  update(seconds: number) { this.minutes += seconds * 1440 / CONFIG.daySeconds; }
  get day() { return Math.floor(this.minutes / 1440) + 1; }
  get hour() { return this.minutes % 1440 / 60; }
  setHour(hour: number) { this.minutes = Math.floor(this.minutes / 1440) * 1440 + hour * 60; }
}
