import { test, expect, type Page } from '@playwright/test';
import { createGameServer } from '../../server/app';
import { BUILDINGS } from '../../shared/world';

test('browser: buy, sell, select lot 2, rent, equip and stock a cafe', async ({ page }) => {
  const server = createGameServer({ databasePath: ':memory:', production: true });
  await server.listen(0);
  server.room.time.setHour(10);
  const base = `http://127.0.0.1:${(server.http.address() as { port: number }).port}`;
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  async function openAt(building: string) {
    // Fixture places the authoritative player at a door. UI still receives the
    // position through WS and must open the correct panel via the real E key.
    const actor = [...server.room.players.values()][0].actor;
    Object.assign(actor, BUILDINGS.find(b => b.id === building)!.door);
    await expect(page.locator('.proximity-prompt')).toContainText(BUILDINGS.find(b => b.id === building)!.name);
    await page.keyboard.press('e');
    await expect(page.getByRole('dialog')).toBeVisible();
  }
  try {
    await page.goto(base);
    await page.locator('input[type=text]').fill('BrowserTrader');
    await page.locator('input[type=password]').fill('password123');
    await page.getByRole('button', { name: 'Bắt đầu cuộc sống mới', exact: true }).click();
    await expect(page.locator('.status-text')).toContainText('Online');
    const id = [...server.room.players.keys()][0];
    await openAt('market');
    await page.getByRole('button', { name: /Xác nhận Mua/ }).click();
    await expect.poll(() => server.service.players.inventory(id).find(i => i.itemId === 'beans')?.quantity).toBe(5);
    await page.getByRole('button', { name: /Bán lại cho chợ/ }).click();
    await page.locator('.qty-input').fill('2');
    await page.getByRole('button', { name: /Xác nhận Bán/ }).click();
    await expect.poll(() => server.service.players.inventory(id).find(i => i.itemId === 'beans')?.quantity).toBe(3);
    await page.keyboard.press('Escape');
    await openAt('lot-2');
    await expect(page.locator('.lot-card.selected')).toContainText('Mặt bằng 02');
    await page.getByRole('button', { name: /Ký hợp đồng thuê/ }).click();
    await expect(page.locator('.business-dashboard')).toBeVisible();
    expect(server.service.players.businesses(id)[0].propertyId).toBe('lot-2');
    await page.getByRole('button', { name: /Mua máy/ }).click();
    await expect(page.getByText('Đã trang bị máy chuyên dụng', { exact: false })).toBeVisible();
    await page.locator('.stock-action-wrap input').fill('2');
    await page.getByRole('button', { name: /Nhập kho/ }).click();
    await expect.poll(() => server.service.players.businesses(id)[0].servings).toBe(8);
    await page.getByRole('button', { name: /Mở cửa đón khách/ }).click();
    await expect(page.getByRole('button', { name: /Đóng cửa quán/ })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.reload();
    await expect(page.locator('.status-text')).toContainText('Online');
    expect(server.service.players.businesses(id)[0].propertyId).toBe('lot-2');
    expect(errors).toEqual([]);
  } finally { await page.close(); await server.close(); }
});

test('browser: P2P refresh, partial purchase and cancellation in two sessions', async ({ browser }) => {
  const server = createGameServer({ databasePath: ':memory:', production: true });
  await server.listen(0);
  server.room.time.setHour(10);
  const base = `http://127.0.0.1:${(server.http.address() as { port: number }).port}`;
  const seller = await browser.newPage(), buyer = await browser.newPage();
  const errors: string[] = [];
  for (const page of [seller, buyer]) page.on('pageerror', error => errors.push(error.message));
  async function register(page: Page, username: string) {
    await page.goto(base);
    await page.locator('input[type=text]').fill(username);
    await page.locator('input[type=password]').fill('password123');
    await page.getByRole('button', { name: 'Bắt đầu cuộc sống mới', exact: true }).click();
    await expect(page.locator('.status-text')).toContainText('Online');
  }
  async function marketplace(page: Page) {
    await page.getByTitle('Mở Smartphone (Điện thoại cư dân)').click();
    await page.locator('.phone-app-item').filter({ hasText: 'Chợ cư dân' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  }
  try {
    await register(seller, 'BrowserSeller'); await register(buyer, 'BrowserBuyer');
    const sellerId = [...server.room.players.keys()].find(id => server.service.players.profile(id).username === 'BrowserSeller')!;
    const buyerId = [...server.room.players.keys()].find(id => id !== sellerId)!;
    // Seed stock only; all listing/purchase/cancel actions use real UI + API.
    server.db.transaction(() => server.service.players.addItem(sellerId, 'beans', 5, 5000));
    await marketplace(buyer); await marketplace(seller);
    await seller.getByRole('button', { name: /Đăng tin bán mới/ }).click();
    await seller.getByRole('button', { name: 'Xác nhận Đăng tin bán', exact: true }).click();
    await expect(buyer.locator('.listing-card')).toHaveCount(1, { timeout: 12000 });
    await buyer.locator('.listing-card input').fill('2');
    await buyer.locator('.listing-card').getByRole('button', { name: /Mua/ }).click();
    await expect.poll(() => server.service.players.inventory(buyerId)[0]?.quantity).toBe(2);
    await expect(seller.locator('.listing-title')).toContainText('× 3', { timeout: 12000 });
    await seller.getByRole('button', { name: 'Hủy tin & hoàn kho', exact: true }).click();
    await expect.poll(() => server.service.players.inventory(sellerId)[0]?.quantity).toBe(3);
    await expect(buyer.locator('.listing-card')).toHaveCount(0, { timeout: 12000 });
    expect(server.service.players.wallet(buyerId).cash).toBe(10_000_000 - 2400);
    expect(server.service.players.wallet(sellerId).cash).toBe(10_000_000 + 2400);
    expect(errors).toEqual([]);
  } finally { await seller.close(); await buyer.close(); await server.close(); }
});
