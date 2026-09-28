import { CONFIG } from '../../shared/config';

export function getVietnamTime(): { minutes: number; day: number; hour: number } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    day: 'numeric',
    hour12: false,
  }).formatToParts(now);

  let h = 0, m = 0, s = 0, d = 1;
  for (const part of parts) {
    if (part.type === 'hour') h = parseInt(part.value, 10);
    else if (part.type === 'minute') m = parseInt(part.value, 10);
    else if (part.type === 'second') s = parseInt(part.value, 10);
    else if (part.type === 'day') d = parseInt(part.value, 10);
  }
  const dayMinutes = h * 60 + m + s / 60;
  const minutes = (d - 1) * 1440 + dayMinutes;
  return { minutes, day: d, hour: h + m / 60 + s / 3600 };
}

export class TimeManager {
  constructor(public minutes = 480, public useRealTime = false) {
    if (this.useRealTime) {
      this.sync();
    }
  }

  sync() {
    const vn = getVietnamTime();
    this.minutes = vn.minutes;
  }

  update(seconds: number) {
    if (this.useRealTime) {
      this.sync();
    } else {
      this.minutes += seconds * 1440 / CONFIG.daySeconds;
    }
  }

  get day() { return Math.floor(this.minutes / 1440) + 1; }
  get hour() { return (this.minutes % 1440) / 60; }
  setHour(hour: number) {
    this.useRealTime = false;
    this.minutes = Math.floor(this.minutes / 1440) * 1440 + hour * 60;
  }
}
