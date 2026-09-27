import type { BusinessType, ItemId, WeatherKind } from './config';
export interface Point { x: number; y: number }
export interface Actor extends Point { id: string; name: string; avatar: number; direction: number; moving: boolean }
export interface Npc extends Actor { state: 'walking' | 'idle' | 'shopping' | 'working' | 'home' | 'sitting' | 'talking'; archetype: string; targetBusiness?: string }
export interface InventoryItem { itemId: ItemId; quantity: number; cost: number }
export interface Business {
  id: string; ownerId: string; propertyId: string; type: BusinessType; name: string; level: number;
  equipped: boolean; open: boolean; price: number; servings: number; stockCost: number;
  revenue: number; cogs: number; rent: number; salary: number; utility: number;
  profit: number; reputation: number; customers: number; valuation: number;
}
export interface PlayerState extends Actor {
  cash: number; bankBalance: number; netWorth: number; inventory: InventoryItem[];
  businesses: Business[]; apartment: boolean; skills: { commerce: number };
  ledger: { id: string; label: string; amount: number; createdAt: number }[];
}
export interface Listing { id: string; sellerId: string; sellerName: string; itemId: ItemId; quantity: number; price: number }
export interface WorldEvent { id: string; name: string; description: string; endsAt: number; priceFactor: number; demandFactor: number }
export interface WorldState {
  minutes: number; day: number; weather: WeatherKind; temperature: number;
  prices: Record<ItemId, number>; event: WorldEvent | null; players: Actor[]; npcs: Npc[];
  properties: { id: string; ownerId: string | null; businessName: string | null; open: boolean }[];
  debug: boolean;
}
export type Panel = 'inventory' | 'business' | 'market' | 'marketplace' | 'bank' | 'phone' | 'profile' | 'map' | 'property' | 'apartment' | 'npc' | 'debug' | null;
export interface Action { type: string; [key: string]: unknown }
export type ServerMessage =
  | { type: 'world'; world: WorldState }
  | { type: 'state'; player: PlayerState }
  | { type: 'sale'; businessId: string; propertyId: string; amount: number; ownerId: string }
  | { type: 'error'; message: string };
