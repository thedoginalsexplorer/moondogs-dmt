# Moon Dogs: DMT on Dogecoin

**Moon Dogs** is an open [Digital Matter Theory](https://thedoginalsexplorer.com/dmt) collection on Dogecoin: **one pixel dog for every block**. The first valid mint of a block owns it. The art is drawn from that block's own data:
- the moon phase from when the block was mined;
- the coat, collar and sky from the block hash;
- the stars from its transactions.

This repo has everything an **indexer, marketplace, wallet or explorer** needs to recognise Moon Dogs, decide which mints count, and show the right art and traits:

| Path | What it is |
|---|---|
| `inscriptions/ids.json` | Every on-chain id: deploy, element, renderer, deployer |
| `inscriptions/deploy.json`, `example-mint.json` | The exact inscription contents |
| `renderer/moondogs-renderer.html` | The on-chain renderer, byte-identical to inscription `6579cfae…c41i0` (sha256 in `ids.json`) |
| `renderer/renderer.source.js` | Its readable source |
| `lib/traits.mjs` | Traits from a block (hash and time), with no dependencies |
| `collection/moon-dogs.json` | Every counted mint with its traits (snapshot) |
| `collection/inscriptions.json` | The same list in the `[{ id, meta: { name, attributes } }]` format marketplaces import |
| `scripts/snapshot.mjs` | Rebuilds both collection files from public data (Node 18+) |

- **Mint:** <https://doginals.store/dmt/moon-dogs>, with a block map and bulk minting
- **Explorer:** <https://thedoginalsexplorer.com>
- **Contact:** @dannyutxo on X

---

## On-chain

| | |
|---|---|
| Standard | TAP DMT (`dmt-deploy` / `dmt-mint`), indexed by [Trac](https://trac.network) like `dmt-natdogs`, `dmt-nat`, `dmt-pet` |
| Ticker | `moondogs` in inscriptions, `dmt-moondogs` in the TAP index |
| Deploy | `cb472b406d725921187dac54474685b278fd1c6455cce769e0a05e9fad391afei0` (block 6,464,446) |
| Deployer | `DFgGCRVEWQKxk72k6jmvHRMa3Wym1CR79e` |
| Element | `dmt.11.element` (`bc837317…8749i0`), the existing Doge element for field 11, `bits` |
| Renderer | `6579cfaed329d53cbc1dba1f7eaf26a73a2489edeb39e8e791005b591ec28c41i0`, HTML, 5,155 bytes |
| Supply | Open: blocks 0 to the current tip, one mint per block |

```json
{"p":"tap","op":"dmt-deploy","elem":"bc837317c07590a111623f7b622e88fa7240209b6b9a9ee2940a5706ae818749i0","tick":"moondogs","dt":"n","id":"bf46c68b88e25c7d2956217f4ec4c2720a25d2e47cb596154364d1a213f64a16i0"}
{"p":"tap","op":"dmt-mint","dep":"cb472b406d725921187dac54474685b278fd1c6455cce769e0a05e9fad391afei0","tick":"moondogs","blk":"6445420"}
```

> **About the renderer id.** The deploy's `id` is `bf46c68b…a16i0`, the **last** transaction of the renderer's 4-transaction reveal chain. ord-dogecoin names a multi-transaction inscription after its **first** reveal transaction, so the inscription is **`6579cfae…c41i0`**. Both refer to the same file. The Doginals Explorer redirects the first to the second. Please use `6579…i0` directly.

## Which mints count

These are the standard TAP DMT rules:

- A mint counts when Trac's TAP index accepts it (`fail: false`). **The first valid mint of a block wins.** Later mints of that block are refused (`fail: true`) and are worthless copies, so never show one as a Moon Dog.
- **The item is the mint inscription.** Whoever holds it owns the dog, like any Doginal.
- **The coins are separate.** Each counted mint also credits `dmt-moondogs` TAP tokens to the minter: the block's `bits` read as a number (`dt: "n"`). Moving the dog does not move them.
- **The item number is the block number:** `Moon Dogs #6,445,420`.

### Data sources

**Trac TAP reader**, if you run one:
- `getTickerMintList/dmt-moondogs?offset=&max=`: every mint, with `ins`, `dmtblck`, `addr` and `fail`
- `getDmtMintHolder/<inscription id>`: the counted-mint record, or `null`
- `getDmtMintHolderByBlock/dmt-moondogs/<block>`: who owns block N (the `dmt-` prefix is needed)

**The Doginals Explorer** (public, CORS `*`, 300 requests/min per IP):

| | |
|---|---|
| `GET /v1/dmt/mint/<id>` | Is it a counted DMT mint? Returns ticker, block, deploy, owner and renderer, or 404. Works for **any** DMT collection |
| `GET /preview/dmt/<id>` | The mint drawn by its deploy's renderer. Sandboxed and embeddable. Works for any DMT collection with a renderer |
| `GET /v1/tap/ticker/activity?tick=dmt-moondogs&kind=mint&limit=100&page=N` | Every mint, newest first |
| `GET /r/blockinfo/<height or hash>` | Block data with ord field names |
| `GET /v1/inscription/<id>`, `GET /content/<id>` | Owner and raw content |

## Showing the art

**The easiest way** is to embed it:

```html
<iframe sandbox="allow-scripts" src="https://thedoginalsexplorer.com/preview/dmt/<MINT INSCRIPTION ID>"></iframe>
```

**To run it yourself** (the DMT UNAT convention), take the renderer HTML and replace `MINT_INSCRIPTION_ID` with the mint id. Serve it sandboxed with recursion on the same origin:
- `/content/<id>`, to read the mint's `blk`;
- `/r/blockinfo/<height>`, for `hash`, `timestamp`, `merkle_root` and `transaction_count`.

The renderer also accepts `#<mint id>`, `#<block>`, `?mint=` or `?blk=`. If `/r/blockinfo` is missing, it falls back to `/v1/block/<height>`.

## Traits

`lib/traits.mjs` is the reference. `byte(i)` is the *i*-th byte **from the end** of the block hash as displayed.

- **Moon phase:** from the block `timestamp`, using the 29.530588853-day lunar month counted from the new moon of 2000-01-06 18:14 UTC. There are eight named phases.
- **Coat** (`byte(0)`): under 90 is Shiba Red · under 141 is Cream · under 192 is Black and Tan · under 223 is Sesame Grey · under 243 is Snow White · otherwise **Moon Silver**.
- **Collar** (`byte(1) % 6`): Red, Blue, Green, Purple, Pink, Gold.
- **Sky** (`byte(2) % 4`): Midnight Blue, Violet Night, Teal Night, Plum Night.

| Rarity | Rule | Roughly |
|---|---|---|
| Full Moon Howl | moon at least 99% lit; the eyes glow and the dog howls | 6 in 100 blocks |
| Dark Sky | moon at most 1% lit; extra stars | 6 in 100 blocks |
| Moon Silver | coat byte ≥ 243 | 1 in 20 |
| Common | everything else | |

`rarity` lists the moon trait first. `moon_silver` is a separate true/false field.

## Refreshing the collection files

Minting is open, so the snapshot keeps growing:

```sh
node scripts/snapshot.mjs                       # uses https://thedoginalsexplorer.com, 4 requests/s
node scripts/snapshot.mjs --explorer <your own explorer> --rate 20
```

## License

MIT. Index it, display it, build on it.
