// Rigenera le icone dell'app e l'immagine di anteprima dei link: `npm run images`.
// I PNG vengono riscritti tenendo solo i blocchi d'immagine (IHDR, PLTE, tRNS,
// IDAT, IEND): nessun metadato.
// CHROMIUM_PATH permette di usare un Chromium già installato.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import pw from '@playwright/test';

const { chromium } = pw;
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 4175;

const KEEP = new Set(['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND']);
function cleanPng(buf) {
  const out = [buf.subarray(0, 8)];
  for (let i = 8; i < buf.length;) {
    const len = buf.readUInt32BE(i);
    const type = buf.toString('latin1', i + 4, i + 8);
    const end = i + 12 + len;
    if (KEEP.has(type)) out.push(buf.subarray(i, end));
    i = end;
  }
  return Buffer.concat(out);
}

const COMPASS = (size, pad) => {
  const r = size / 2 - pad;
  const c = size / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#1d2733" stroke-width="${r * 0.08}"/>
    <path d="M${c} ${c - r * 0.78}L${c + r * 0.26} ${c}L${c} ${c + r * 0.78}L${c - r * 0.26} ${c}z" fill="#1d2733"/>
    <path d="M${c} ${c - r * 0.78}L${c + r * 0.26} ${c}H${c - r * 0.26}z" fill="#b07d2b"/>
  </svg>`;
};

const iconPage = (size, pad, radius) => `<!doctype html><html><body style="margin:0">
  <div style="width:${size}px;height:${size}px;background:#efe7d6;border-radius:${radius}px;display:flex;align-items:center;justify-content:center">
  ${COMPASS(size, pad)}</div></body></html>`;

const server = spawn(process.execPath, [`${ROOT}tools/serve.mjs`, String(PORT)], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 500));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function render(html, width, height, path, url) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  if (url) await page.goto(url);
  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForTimeout(200);
  const png = await page.screenshot({ omitBackground: false });
  writeFileSync(path, cleanPng(png));
  await page.close();
  console.log('✓', path.replace(ROOT, ''));
}

mkdirSync(`${ROOT}icons`, { recursive: true });
// Icone: le normali con i bordi già arrotondati dal sistema, la "maskable" con margine ampio.
await render(iconPage(192, 22, 0), 192, 192, `${ROOT}icons/icon-192.png`);
await render(iconPage(512, 58, 0), 512, 512, `${ROOT}icons/icon-512.png`);
await render(iconPage(512, 120, 0), 512, 512, `${ROOT}icons/icon-maskable-512.png`);
await render(iconPage(180, 22, 0), 180, 180, `${ROOT}icons/apple-touch-icon.png`);

// Anteprima dei link: l'Italia con un percorso da Torino a Bari.
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(`http://localhost:${PORT}/`);
const data = await page.evaluate(async () => (await fetch('data/italia.json')).json());
await page.close();

const nb = {};
for (const [k, a] of Object.entries(data.areas)) nb[k] = [...a.neighbors];
for (const [a, b] of data.links) { nb[a].push(b); nb[b].push(a); }
function path(a, b) {
  const prev = { [a]: null }, q = [a];
  for (let i = 0; i < q.length; i++) for (const v of nb[q[i]]) if (!(v in prev)) { prev[v] = q[i]; q.push(v); }
  const p = [];
  for (let c = b; c != null; c = prev[c]) p.unshift(c);
  return p;
}
const route = path('TO', 'BA');
const colors = { start: '#2463d6', end: '#8a3fd1', ok: '#2fae5f' };
const fill = (k) => k === 'TO' ? colors.start : k === 'BA' ? colors.end : route.includes(k) ? colors.ok : '#f4eddb';
const [vx, vy, vw, vh] = data.viewBox;
const pts = route.map(k => `${data.areas[k].lx},${data.areas[k].ly}`).join(' ');
const ogHtml = `<!doctype html><html><head><style>
  body { margin: 0; width: 1200px; height: 630px; background: #efe7d6; display: flex; font-family: "Iowan Old Style", Palatino, Georgia, serif; color: #1d2733; }
  .text { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 0 0 0 80px; }
  h1 { font-size: 84px; margin: 0 0 22px; display: flex; align-items: center; gap: 20px; white-space: nowrap; }
  h1 i { font-weight: 400; }
  p { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 32px; line-height: 1.35; margin: 0; max-width: 560px; color: #3d4652; }
  .maps { margin-top: 30px; font-size: 22px; letter-spacing: .12em; text-transform: uppercase; color: #b07d2b; font-weight: 700; font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  .map { width: 500px; height: 630px; background: #c5dce1; border-left: 6px double #1d2733; }
</style></head><body>
  <div class="text">
    <h1>${COMPASS(96, 4)}<span>Travel <i>Maps</i></span></h1>
    <p>Collega partenza e arrivo attraversando i confini nel minor numero di mosse.</p>
    <div class="maps">Italia · Milano · Germania · Alpi · Mondo</div>
  </div>
  <svg class="map" viewBox="${vx - vw * 0.06} ${vy - vh * 0.04} ${vw * 1.12} ${vh * 1.08}" preserveAspectRatio="xMidYMid meet">
    ${Object.entries(data.areas).map(([k, a]) => `<path d="${a.path}" fill="${fill(k)}" stroke="#a8997a" stroke-width="${vw / 900}"/>`).join('')}
    <polyline points="${pts}" fill="none" stroke="#1d2733" stroke-width="${vw / 260}" stroke-dasharray="${vw / 90} ${vw / 140}" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</body></html>`;
await render(ogHtml, 1200, 630, `${ROOT}og.png`);

await browser.close();
server.kill();
