// Moon Dogs renderer (the "id" script of the dmt-moondogs deploy).
// Finds its mint (the viewer fills in mint="…" on the #preview script, or #<mint id> / #<block> /
// ?blk= in the URL), reads the block through recursion (/r/blockinfo) and draws the dog:
// moon phase from the block time, coat/collar/sky from the hash, stars from the merkle root and
// transaction count. Everything comes from the block; nothing is random.
(async () => {
  const W = 64, H = 64, SYN = 29.530588853, REF = 947182440;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  document.body.appendChild(cv);
  const getJ = async u => { const r = await fetch(u); if (!r.ok) throw r.status; return r.json(); };

  // --- which block ---
  const tag = document.getElementById('preview');
  let mint = tag && tag.getAttribute('mint');
  if (!mint || mint.includes('MINT_INSCRIPTION')) mint = null;
  const q = new URLSearchParams(location.search), hsh = location.hash.slice(1);
  let blk = q.get('blk') || (/^\d+$/.test(hsh) ? hsh : null);
  if (!blk) {
    mint = mint || q.get('mint') || (/^[0-9a-f]{64}i\d+$/.test(hsh) ? hsh : null);
    if (mint) blk = (await getJ('/content/' + mint)).blk;
  }
  if (!/^\d+$/.test(String(blk))) return;

  // --- the block's data ---
  let b;
  try { const i = await getJ('/r/blockinfo/' + blk); b = { hash: i.hash, time: i.timestamp, mr: i.merkle_root, ntx: i.transaction_count }; }
  catch { const i = await getJ('/v1/block/' + blk + '?limit=1'); b = { hash: i.hash, time: i.time, mr: i.merkle_root, ntx: i.total }; }

  // --- helpers ---
  const by = i => parseInt(b.hash.substr(b.hash.length - 2 * (i + 1), 2), 16);
  const rgb = h => { const v = parseInt(h, 16); return [v >> 16, v >> 8 & 255, v & 255]; };
  const mix = (a, c, t) => a.map((v, i) => Math.round(v + (c[i] - v) * t));
  let s = parseInt(b.mr.slice(-8), 16);
  const rnd = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const age = (((b.time - REF) / 86400) % SYN + SYN) % SYN, p = age / SYN, lit = (1 - Math.cos(2 * Math.PI * p)) / 2;
  const full = lit >= 0.99, dark = lit <= 0.01;

  // coats: [up to byte, base, shade, light, belly]
  const COATS = [[90, 'd9822b', 'a65a1c', 'f5ab5e', 'f7e8d0'], [141, 'e9cf9d', 'c4a271', 'fff0cf', 'fffaf0'], [192, '2e2823', '18130f', '51453a', 'd69c62'],
    [223, '8f8b86', '65625e', 'b8b3ac', 'ede7dc'], [243, 'eeebe4', 'c9c4ba', 'ffffff', 'ffffff'], [256, 'b6c4e6', '8493be', 'e8efff', 'f5f8ff']];
  const COLLARS = ['d64545', '3f72e0', '34a464', '9058d6', 'e46aaa', 'e9bb2e'];
  const SKIES = [['060a22', '26336f', '1a2350', '10163a'], ['0e071f', '40266b', '2a1a4a', '190f30'], ['03131a', '14505f', '0e3440', '08222a'], ['13050e', '521f40', '36122b', '210a1b']];
  const coat = COATS.find(c => by(0) < c[0]).slice(1).map(rgb), col = rgb(COLLARS[by(1) % 6]), sky = SKIES[by(2) % 4].map(rgb), hb = by(3);
  document.body.style.background = '#' + SKIES[by(2) % 4][0];

  // --- dog masks (fixed shape, thresholded so edges stay crisp) ---
  const off = document.createElement('canvas'); off.width = W; off.height = H;
  const c = off.getContext('2d', { willReadFrequently: true });
  const mask = f => { c.clearRect(0, 0, W, H); f(); const d = c.getImageData(0, 0, W, H).data, m = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) m[i] = d[i * 4 + 3] > 127; return m; };
  const ell = (x, y, rx, ry, r = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, r, 0, 7); c.fill(); };
  const snout = (f, l, y, h) => { c.save(); c.translate(31.5, 20.5); c.rotate(-Math.PI / 4); c.fillRect(f, y, l, h); c.restore(); };
  const DOG = mask(() => {
    ell(17, 42, 7, 6); ell(22, 36, 5.5, 9, -.35); ell(25, 29, 4, 6, -.5); ell(27, 24, 5, 5); snout(-2, 8.5, -3, 6);
    c.beginPath(); c.moveTo(23.5, 22.5); c.lineTo(22, 15.5); c.lineTo(28.5, 20.5); c.fill();
    c.fillRect(23, 38, 3, 10); c.fillRect(26.5, 39, 2.5, 9); ell(15, 47.5, 4.5, 1.6);
    c.lineWidth = 3; c.beginPath(); c.arc(10.5, 35, 3.5, Math.PI * .35, Math.PI * 1.85); c.stroke();
  });
  const BELLY = mask(() => { ell(24.8, 36.5, 2.6, 7, -.35); snout(.5, 6, .6, 2.4); ell(29, 25.5, 2.4, 2); c.fillRect(23, 45, 6, 3); });
  const COLLAR = mask(() => { c.save(); c.translate(24, 31); c.rotate(.45); c.fillRect(-7, -1, 14, 2); c.restore(); });
  const at = (m, x, y) => x >= 0 && y >= 0 && x < W && y < H && m[y * W + x];
  const edge = (x, y) => at(DOG, x, y) && !(at(DOG, x + 1, y) && at(DOG, x - 1, y) && at(DOG, x, y + 1) && at(DOG, x, y - 1));

  // --- paint ---
  const ctx = cv.getContext('2d'), img = ctx.createImageData(W, H), px = img.data;
  const put = (x, y, k) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4; px[i] = k[0]; px[i + 1] = k[1]; px[i + 2] = k[2]; px[i + 3] = 255; };
  const get = (x, y) => { const i = (y * W + x) * 4; return [px[i], px[i + 1], px[i + 2]]; };
  const MOON = rgb('f6ecc8'), MX = 50, MY = 14, MR = 9, BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) put(x, y, mix(sky[0], sky[1], Math.max(0, Math.min(5, Math.round(y / 52 * 5 + BAY[(y % 4) * 4 + x % 4] / 16 - .5))) / 5));
  for (let i = 0, n = Math.round((10 + b.ntx % 31) * (dark ? 1.7 : 1)); i < n; i++) {
    const x = Math.floor(rnd() * W), y = Math.floor(rnd() * 42), br = rnd();
    if (Math.hypot(x - MX, y - MY) < MR + 3 || br < lit * .55) continue;
    const k = mix(get(x, y), rgb(br > .8 ? 'fff3c4' : 'ffffff'), .45 + br * .55);
    put(x, y, k);
    if (br > .93) { const h = mix(get(x, y), k, .5); put(x + 1, y, h); put(x - 1, y, h); put(x, y + 1, h); put(x, y - 1, h); }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const d = Math.hypot(x - MX, y - MY); if (d > MR && d <= MR + 5) put(x, y, mix(get(x, y), MOON, lit * .22 * (1 - (d - MR) / 5))); }
  const CR = ['-3-3', '-2-3', '23', '33', '3-4', '-14', '-51', '40', '00', '-42'];
  for (let dy = -MR; dy <= MR; dy++) for (let dx = -MR; dx <= MR; dx++) {
    if (dx * dx + dy * dy > MR * MR + MR * .6) continue;
    const xt = Math.sqrt(Math.max(0, MR * MR - dy * dy)) * Math.cos(2 * Math.PI * p);
    const on = p < .5 ? dx + .5 > xt : dx - .5 < -xt;
    put(MX + dx, MY + dy, on ? (CR.includes('' + dx + dy) ? rgb('d8cca4') : MOON) : mix(get(MX + dx, MY + dy), rgb('4a5278'), .35));
  }
  for (let x = 0; x < W; x++) {
    const fy = Math.round(49 - 3 * Math.sin(x / 7 + hb / 40) - 2 * Math.sin(x / 3.1 + hb / 20)), gy = Math.round(47 + (x - 20) * (x - 20) / 90);
    for (let y = fy; y < H; y++) put(x, y, y === fy ? mix(sky[2], MOON, .08 + lit * .12) : sky[2]);
    for (let y = gy; y < H; y++) put(x, y, y === gy ? mix(sky[3], MOON, .12 + lit * .28) : sky[3]);
  }
  const INK = rgb('0b0912'), EYE = rgb('ffd84a');
  let nx = 0, ny = 0, best = -99;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!at(DOG, x, y)) continue;
    if (x - y > best) { best = x - y; nx = x; ny = y; }
    if (edge(x, y)) { put(x, y, INK); continue; }
    let k = at(BELLY, x, y) ? coat[3] : coat[0];
    if (edge(x + 1, y - 1) && !at(BELLY, x, y)) k = mix(k, mix(coat[2], MOON, .3), .35 + lit * .65);
    else if (edge(x - 1, y + 1)) k = mix(k, coat[1], .85);
    if (at(COLLAR, x, y) && y > 26 && y < 36) k = col;
    put(x, y, k);
  }
  put(27, 21, full ? EYE : INK);
  if (full) { put(28, 21, mix(coat[0], EYE, .5)); [[2, -1], [3, -2], [3, 1], [4, 0], [5, -1], [2, -3], [3, -4]].forEach(([a, d]) => put(nx + a, ny + d, mix(MOON, [255, 255, 255], .4))); }
  ctx.putImageData(img, 0, 0);
})();
