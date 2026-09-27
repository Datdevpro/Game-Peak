import { WEATHER, type WeatherKind } from '../../shared/config';
export class WeatherManager {
  private period: number;
  constructor(public kind: WeatherKind = 'sunny', minutes = 480) { this.period = Math.floor(minutes / 180); }
  update(minutes: number) {
    const period = Math.floor(minutes / 180); if (period === this.period) return;
    this.period = period;
    // A seeded weather cycle keeps a town consistent and is independent of frame rate.
    const value = Math.abs(Math.sin(period * 127.1 + 7) * 43758.5453) % 1;
    this.kind = value < 0.5 ? 'sunny' : value < 0.8 ? 'cloudy' : 'rain';
  }
  temperature(hour: number) { return Math.round(WEATHER[this.kind].temperature + Math.sin((hour - 8) / 24 * Math.PI * 2) * 3); }
}
