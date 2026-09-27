export const CONFIG = {
  startingCash: 10_000_000, daySeconds: 1440, npcCount: 24,
  playerSpeed: 190, npcSpeed: 65, tickMs: 100, interactionDistance: 115,
  sessionDays: 7, maxQuantity: 1000, maxPrice: 100_000,
  apartmentRent: 15_000, spawn: { x: 960, y: 760 },
} as const;
export const ITEMS = {
  beans: { id: 'beans', name: 'Hạt cà phê', category: 'Nguyên liệu', basePrice: 1000, icon: '🫘', rarity: 'common', description: 'Một gói hạt thơm, pha được 4 cốc cà phê.' },
  milk: { id: 'milk', name: 'Sữa tươi', category: 'Thực phẩm', basePrice: 400, icon: '🥛', rarity: 'common', description: 'Hàng tiêu dùng có giá thay đổi theo cung cầu.' },
  tea: { id: 'tea', name: 'Trà lá', category: 'Nguyên liệu', basePrice: 700, icon: '🍃', rarity: 'common', description: 'Trà địa phương, có thể mua bán tại chợ.' },
} as const;
export type ItemId = keyof typeof ITEMS;
export const BUSINESS_DEFINITIONS = {
  coffee: { name: 'Quán cà phê', input: 'beans' as ItemId, servings: 4, equipment: 250_000, rent: 20_000, salary: 12_000, utility: 5000, defaultPrice: 500, baseDemand: 0.85, upgrade: 150_000 },
} as const;
export type BusinessType = keyof typeof BUSINESS_DEFINITIONS;
export const WEATHER = {
  sunny: { name: 'Nắng đẹp', icon: '☀️', temperature: 28, demand: 1.15, traffic: 1 },
  cloudy: { name: 'Nhiều mây', icon: '☁️', temperature: 25, demand: 1, traffic: 0.8 },
  rain: { name: 'Mưa nhẹ', icon: '🌧️', temperature: 22, demand: 0.7, traffic: 0.55 },
} as const;
export type WeatherKind = keyof typeof WEATHER;
export const money = (cents: number) => '$' + (cents / 100).toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: cents % 100 ? 2 : 0 });
