// Administração do jogo enquanto o Instagram não está conectado. Lê MAP_ADMIN_TOKEN do ambiente ou do .env.local.
//   node scripts/game-admin.mjs comentario "@fulano Catu BA 13"
//   node scripts/game-admin.mjs comprar u-fulano tank
// Para o site publicado: node scripts/game-admin.mjs --site https://seu-site.vercel.app comentario "@fulano SP 22"
import { readFile } from 'node:fs/promises';

const args = process.argv.slice(2), siteIndex = args.indexOf('--site');
const site = siteIndex >= 0 ? args.splice(siteIndex, 2)[1] : 'http://127.0.0.1:5182';
const [command, ...rest] = args;
const token = process.env.MAP_ADMIN_TOKEN || (await readFile(new URL('../.env.local', import.meta.url), 'utf8').catch(() => '')).match(/^MAP_ADMIN_TOKEN=(.+)$/m)?.[1]?.trim();
const body = command === 'comentario' && rest[0] ? { action: 'comment', text: rest.join(' ') }
  : command === 'comprar' && rest.length === 2 ? { action: 'buy', baseId: rest[0], kind: rest[1] }
  : null;
if (!body || !token) {
  console.error(!token ? 'Defina MAP_ADMIN_TOKEN (no .env.local ou no ambiente).' : 'Uso: comentario "@fulano Catu BA 13" | comprar <id-da-base> <infantry|tank|artillery|drone|aircraft>');
  process.exit(1);
}
const response = await fetch(new URL('/api/game/admin', site), { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const result = await response.json().catch(() => ({ error: `Resposta inesperada (HTTP ${response.status}).` }));
console.log(response.ok ? 'OK' : `Recusado (HTTP ${response.status})`, JSON.stringify(result));
process.exit(response.ok ? 0 : 1);
