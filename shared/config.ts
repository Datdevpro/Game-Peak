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
  umbrella: { id: 'umbrella', name: 'Dù đi mưa Pastel', category: 'Thời trang', basePrice: 2500, icon: '☂️', rarity: 'rare', description: 'Dù che mưa cao cấp chống thấm, tự động che bảo vệ bạn mỗi khi trời thị trấn đổ mưa.' },
  raincoat: { id: 'raincoat', name: 'Áo mưa Hàn Quốc', category: 'Thời trang', basePrice: 3500, icon: '🧥', rarity: 'rare', description: 'Áo mưa thời trang dáng dài chống gió lạnh và bảo vệ sức khỏe khi trời mưa gió.' },
  cap: { id: 'cap', name: 'Nón lưỡi trai Mầm Xanh', category: 'Thời trang', basePrice: 1500, icon: '🧢', rarity: 'common', description: 'Nón lưỡi trai thể thao năng động, tôn vinh phong cách cư dân.' },
} as const;
export type ItemId = keyof typeof ITEMS;

export const BANK_TERMS = [
  { months: 1, rate: 0.045, label: '1 Tháng', rateLabel: '4.5%/năm', durationSeconds: 300, minDeposit: 10_000 },
  { months: 3, rate: 0.058, label: '3 Tháng', rateLabel: '5.8%/năm', durationSeconds: 900, minDeposit: 20_000 },
  { months: 6, rate: 0.072, label: '6 Tháng', rateLabel: '7.2%/năm', durationSeconds: 1800, minDeposit: 50_000 },
  { months: 9, rate: 0.085, label: '9 Tháng', rateLabel: '8.5%/năm', durationSeconds: 2700, minDeposit: 100_000 },
  { months: 12, rate: 0.105, label: '12 Tháng', rateLabel: '10.5%/năm', durationSeconds: 3600, minDeposit: 200_000 },
] as const;
export type BankTermMonths = typeof BANK_TERMS[number]['months'];

export function calculateSavingsPayout(principal: number, termMonths: number, rate: number, isCompound: boolean, progress = 1) {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  if (isCompound) {
    const amount = principal * Math.pow(1 + rate / 12, termMonths * clampedProgress);
    const interest = Math.round(amount - principal);
    return { interest, total: principal + interest };
  } else {
    const fullInterest = principal * rate * (termMonths / 12);
    const interest = Math.round(fullInterest * clampedProgress);
    return { interest, total: principal + interest };
  }
}

export const FASHION_SHOP = {
  id: 'fashion',
  name: 'Cửa Hàng Thời Trang',
  npcName: 'Cô Ba Thời Trang',
  x: 1410,
  y: 520,
  door: { x: 1410, y: 515 },
  interactionDistance: 75,
} as const;

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

