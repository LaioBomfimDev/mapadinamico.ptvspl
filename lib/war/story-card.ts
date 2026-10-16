import { CATALOG, forceOf, STATES, type Base } from './game';
import { armyTier } from './engagement';
/** Original local artwork; generating/downloading it never awards points. */
export async function makeStoryCard(base: Base, link: string) {
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1920;
  const c = canvas.getContext('2d'); if (!c) throw Error('Este navegador não conseguiu gerar a imagem.');
  const navy = '#253b44', gold = '#f5d267', team = base.team === 'red' ? '#d9695b' : '#568fc4';
  c.fillStyle = '#f3f1e3'; c.fillRect(0, 0, 1080, 1920);
  c.strokeStyle = '#e2e5d4'; c.lineWidth = 2;
  for (let x = 0; x < 1080; x += 72) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 1920); c.stroke(); }
  for (let y = 0; y < 1920; y += 72) { c.beginPath(); c.moveTo(0, y); c.lineTo(1080, y); c.stroke(); }
  const box = (x: number, y: number, w: number, h: number, fill: string, radius = 35) => { c.fillStyle = fill; c.beginPath(); c.roundRect(x, y, w, h, radius); c.fill(); c.strokeStyle = navy; c.lineWidth = 5; c.stroke(); };
  const text = (value: string, x: number, y: number, size: number, color = navy, max = 920) => { c.fillStyle = color; c.font = `900 ${size}px Arial`; c.fillText(value, x, y, max); };
  text('BRASIL EM BATALHA', 80, 130, 37); box(80, 185, 920, 120, gold); text('MINHA BASE ESTÁ NO MAPA.', 110, 262, 44);
  text(`@${base.username}`, 80, 410, 65); text(`${STATES.find(s => s.uf === base.uf)?.name} · TIME ${base.team === 'red' ? '13 / VERMELHO' : '22 / AZUL'}`, 80, 475, 30, team);
  box(80, 550, 920, 760, '#e6ebd6');
  c.fillStyle = '#c5d2a9'; c.beginPath(); c.ellipse(540, 930, 380, 270, 0, 0, Math.PI * 2); c.fill();
  const assets = await Promise.all(CATALOG.map(unit => new Promise<HTMLImageElement | null>(resolve => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => resolve(null); img.src = `/war-assets/previews/${unit.kind}${base.team === 'blue' ? '-blue' : ''}.png`; })));
  CATALOG.forEach((unit, i) => { const x = i < 3 ? 130 + i * 270 : 270 + (i - 3) * 290, y = i < 3 ? 630 : 960; const img = assets[i]; if (img) c.drawImage(img, x, y, 245, 259); text(`× ${base.inventory[unit.kind]}`, x + 80, y + 288, 30, navy, 190); });
  box(80, 1365, 435, 170, team); box(545, 1365, 455, 170, '#fffdf3'); text(forceOf(base).toLocaleString('pt-BR'), 115, 1455, 70, '#fffdf3', 360); text('FORÇA MILITAR', 115, 1505, 23, '#fffdf3'); text(armyTier(base).current.name, 575, 1450, 37, navy, 400); text('MEU EXÉRCITO', 575, 1505, 23);
  text('Um comentário. Uma base. Seu arsenal.', 80, 1660, 37); text('Entre no mapa e monte seu exército.', 80, 1725, 31);
  text(link.replace(/^https?:\/\//, ''), 80, 1810, 24, '#66816e'); text('PRÉVIA DO JOGO · DADOS DA DEMONSTRAÇÃO', 80, 1875, 19, '#83947b');
  return canvas.toDataURL('image/png');
}
