#!/usr/bin/env node
// Rebuilds collection/moon-dogs.json and collection/inscriptions.json: every Moon Dogs mint the
// TAP index counts, with its traits. Node 18+, no dependencies.
//
//   node scripts/snapshot.mjs [--explorer https://thedoginalsexplorer.com] [--rate 4]
//
// Reads the explorer's public API (CORS *, 300 requests/min per IP): the mint list from its copy
// of Trac's TAP index, then each block through /r/blockinfo. --rate is requests per second.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { moonDogTraits } from '../lib/traits.mjs';
import ids from '../inscriptions/ids.json' with { type: 'json' };

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const X = arg('--explorer', 'https://thedoginalsexplorer.com').replace(/\/+$/, '');
const RATE = Math.max(1, Number(arg('--rate', '4')));
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let last = 0;
async function get(path) {
  for (let attempt = 0; ; attempt++) {
    const wait = last + 1000 / RATE - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    const r = await fetch(X + path);
    if (r.ok) return r.json();
    if ((r.status === 429 || r.status >= 500) && attempt < 6) { await sleep(Number(r.headers.get('retry-after') || 5) * 1000); continue; }
    throw new Error(`${path}: HTTP ${r.status}`);
  }
}

const rows = [];
for (let page = 1; ; page++) {
  const r = await get(`/v1/tap/ticker/activity?tick=${ids.index_ticker}&kind=mint&limit=100&page=${page}`);
  rows.push(...r.activity);
  process.stderr.write(`\rmints: page ${page}/${r.pages}`);
  if (page >= r.pages) break;
}
// counted = accepted by the index; one per block, the first one wins
const seen = new Set();
const counted = rows.filter((m) => !m.fail).sort((a, b) => a.blck - b.blck || a.num - b.num)
  .filter((m) => !seen.has(String(m.dmtblck)) && seen.add(String(m.dmtblck)));

const items = [];
for (const [i, m] of counted.entries()) {
  const b = await get(`/r/blockinfo/${m.dmtblck}`);
  const block = Number(m.dmtblck);
  items.push({
    inscription_id: m.ins, name: `Moon Dogs #${block.toLocaleString('en-US')}`, block,
    minter: m.addr, minted_in_block: m.blck, attributes: moonDogTraits({ hash: b.hash, time: b.timestamp }),
  });
  if (i % 25 === 0) process.stderr.write(`\rblocks: ${i + 1}/${counted.length}   `);
}
items.sort((a, b) => a.block - b.block);
process.stderr.write(`\r${items.length} counted mints                \n`);

mkdirSync(join(ROOT, 'collection'), { recursive: true });
writeFileSync(join(ROOT, 'collection', 'moon-dogs.json'), JSON.stringify({ collection: ids, generated_at: new Date().toISOString(), counted_mints: items.length, items }, null, 1) + '\n');
// the list format most Doginals marketplaces import: [{ id, meta: { name, attributes: [{ trait_type, value }] } }]
writeFileSync(join(ROOT, 'collection', 'inscriptions.json'), JSON.stringify(items.map((it) => ({
  id: it.inscription_id,
  meta: {
    name: it.name,
    attributes: [
      { trait_type: 'Block', value: String(it.block) },
      { trait_type: 'Moon Phase', value: it.attributes.moon_phase },
      { trait_type: 'Coat', value: it.attributes.coat },
      { trait_type: 'Collar', value: it.attributes.collar },
      { trait_type: 'Sky', value: it.attributes.sky },
      { trait_type: 'Rarity', value: it.attributes.rarity },
    ],
  },
})), null, 1) + '\n');
console.log(`wrote collection/moon-dogs.json and collection/inscriptions.json (${items.length} items)`);
