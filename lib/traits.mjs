// Moon Dogs traits, computed from a Dogecoin block alone (no network, no dependencies).
// Identical to the on-chain renderer (renderer/moondogs-renderer.html) and to doginals.store.
//
//   import { moonDogTraits } from './lib/traits.mjs';
//   moonDogTraits({ hash: '<block hash hex>', time: <unix seconds> })

export const SYNODIC = 29.530588853;   // average lunar month, days
const NEW_MOON = 947182440;            // 2000-01-06 18:14 UTC, a known new moon

/** The i-th byte counted from the END of the block hash as displayed (big-endian hex). */
export const hashByte = (hash, i) => parseInt(hash.substr(hash.length - 2 * (i + 1), 2), 16);

export function moonPhase(time) {
  const age = (((time - NEW_MOON) / 86400) % SYNODIC + SYNODIC) % SYNODIC;
  const p = age / SYNODIC;                          // 0 = new, 0.5 = full
  return { p, age, lit: (1 - Math.cos(2 * Math.PI * p)) / 2 };
}

export function phaseName(p) {
  if (p < 0.0339 || p >= 0.9661) return 'New Moon';
  if (p < 0.2161) return 'Waxing Crescent';
  if (p < 0.2839) return 'First Quarter';
  if (p < 0.4661) return 'Waxing Gibbous';
  if (p < 0.5339) return 'Full Moon';
  if (p < 0.7161) return 'Waning Gibbous';
  if (p < 0.7839) return 'Last Quarter';
  return 'Waning Crescent';
}

const COATS = [[90, 'Shiba Red'], [141, 'Cream'], [192, 'Black and Tan'], [223, 'Sesame Grey'], [243, 'Snow White'], [256, 'Moon Silver']];
const COLLARS = ['Red', 'Blue', 'Green', 'Purple', 'Pink', 'Gold'];
const SKIES = ['Midnight Blue', 'Violet Night', 'Teal Night', 'Plum Night'];

/** { moon_phase, moon_lit_percent, coat, collar, sky, rarity, moon_silver } */
export function moonDogTraits({ hash, time }) {
  const { p, lit } = moonPhase(time);
  const coat = COATS.find(([max]) => hashByte(hash, 0) < max)[1];
  const moonRare = lit >= 0.99 ? 'Full Moon Howl' : lit <= 0.01 ? 'Dark Sky' : null;
  return {
    moon_phase: phaseName(p),
    moon_lit_percent: Math.round(lit * 100),
    coat,
    collar: COLLARS[hashByte(hash, 1) % 6],
    sky: SKIES[hashByte(hash, 2) % 4],
    rarity: moonRare ?? (coat === 'Moon Silver' ? 'Moon Silver' : 'Common'),
    moon_silver: coat === 'Moon Silver',
  };
}
