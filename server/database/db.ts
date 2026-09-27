import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ITEMS } from '../../shared/config';
import { BUILDINGS } from '../../shared/world';
export class GameDatabase {
  readonly raw: DatabaseSync;
  constructor(path = process.env.DATABASE_PATH || './data/gamepeak.sqlite') {
    if (path !== ':memory:') mkdirSync(dirname(resolve(path)), { recursive: true });
    this.raw = new DatabaseSync(path);
    this.raw.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
    this.raw.exec(readFileSync(fileURLToPath(new URL('./migrations/001_initial.sql', import.meta.url)), 'utf8'));
    this.run('INSERT OR IGNORE INTO schema_migrations VALUES(1,?)', Date.now());
    for (const item of Object.values(ITEMS)) this.run('INSERT OR IGNORE INTO items VALUES(?,?,?)', item.id, item.name, item.basePrice);
    for (const b of BUILDINGS.filter(b => b.kind === 'property')) this.run('INSERT OR IGNORE INTO properties(id) VALUES(?)', b.id);
    this.run("INSERT OR IGNORE INTO world_state(id,minutes,weather) VALUES(1,480,'sunny')");
  }
  get<T>(sql: string, ...params: SQLInputValue[]) { return this.raw.prepare(sql).get(...params) as T | undefined; }
  all<T>(sql: string, ...params: SQLInputValue[]) { return this.raw.prepare(sql).all(...params) as T[]; }
  run(sql: string, ...params: SQLInputValue[]) { return this.raw.prepare(sql).run(...params); }
  transaction<T>(fn: () => T): T {
    this.raw.exec('BEGIN IMMEDIATE');
    try { const result = fn(); this.raw.exec('COMMIT'); return result; }
    catch (error) { this.raw.exec('ROLLBACK'); throw error; }
  }
  close() { this.raw.close(); }
}
