import { randomBytes, randomUUID, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { CONFIG } from '../../shared/config';
import { GameDatabase } from '../database/db';
import { ensure } from './errors';
const derive = promisify(scrypt);
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export class AuthService {
  constructor(private db: GameDatabase) {}
  async register(username: string, password: string, avatar: number) {
    const salt = randomBytes(16).toString('hex');
    const key = await derive(password, salt, 64) as Buffer;
    const id = randomUUID();
    this.db.transaction(() => {
      ensure(!this.db.get('SELECT id FROM profiles WHERE username=?', username), 'Tên cư dân này đã được sử dụng.', 409);
      this.db.run('INSERT INTO profiles(id,username,password_hash,avatar,created_at) VALUES(?,?,?,?,?)', id, username, `${salt}:${key.toString('hex')}`, avatar, Date.now());
      this.db.run('INSERT INTO player_wallets(player_id,cash) VALUES(?,?)', id, CONFIG.startingCash);
    });
    return { id, token: this.createSession(id) };
  }
  async login(username: string, password: string) {
    const profile = this.db.get<{ id: string; password_hash: string }>('SELECT id,password_hash FROM profiles WHERE username=?', username);
    const [salt, stored] = (profile?.password_hash ?? '00000000000000000000000000000000:' + '00'.repeat(64)).split(':');
    const key = await derive(password, salt, 64) as Buffer;
    ensure(profile && timingSafeEqual(key, Buffer.from(stored, 'hex')), 'Tên đăng nhập hoặc mật khẩu chưa đúng.', 401);
    return { id: profile.id, token: this.createSession(profile.id) };
  }
  private createSession(id: string) {
    const token = randomBytes(32).toString('hex');
    this.db.run('DELETE FROM sessions WHERE expires_at < ?', Date.now());
    this.db.run('INSERT INTO sessions VALUES(?,?,?)', hashToken(token), id, Date.now() + CONFIG.sessionDays * 86400000);
    return token;
  }
  resolve(token: string) {
    if (!/^[a-f0-9]{64}$/.test(token)) return null;
    return this.db.get<{ player_id: string }>('SELECT player_id FROM sessions WHERE token_hash=? AND expires_at>?', hashToken(token), Date.now())?.player_id ?? null;
  }
  logout(token: string) { this.db.run('DELETE FROM sessions WHERE token_hash=?', hashToken(token)); }
}
