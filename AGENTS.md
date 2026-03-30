# AGENTS.md

Agent guidance for the `@echecs/tunx` package — SwissManager TUNX binary
tournament file parser/serializer.

See the root `AGENTS.md` for workspace-wide conventions (package manager,
TypeScript settings, formatting, naming, testing, ESLint rules).

**Backlog:** See [`BACKLOG.md`](BACKLOG.md) for pending work items. Update it
after completing any work.

---

## Project Overview

Binary parser and serializer for SwissManager `.TUNX` files. Zero runtime
dependencies. Named exports: `parse(input, options?) → Tournament | undefined`
and `stringify(tournament) → Uint8Array`. `parse()` never throws; failures
return `undefined` and call `options.onError`. Recoverable issues (e.g. missing
players, empty strings) call `options.onWarning`. `stringify()` requires
`tournament._raw` and throws `RangeError` if it is absent.

Full round-trip fidelity is the primary design constraint — parsing a file and
re-serializing it must produce byte-for-byte identical output to the original.

---

## Commands

### Build

```bash
pnpm run build          # bundle → dist/
```

### Test

```bash
pnpm run test                              # run all tests once
pnpm run test:watch                        # watch mode
pnpm run test:coverage                     # with coverage report
pnpm run test src/__tests__/index.spec.ts  # single file
```

### Lint & Format

```bash
pnpm run lint           # ESLint + tsc type-check (auto-fixes style)
pnpm run lint:ci        # strict — zero warnings, no auto-fix
pnpm run lint:style     # ESLint only
pnpm run lint:types     # tsc --noEmit only
pnpm run format         # Prettier (writes)
pnpm run format:ci      # Prettier check only
```

### Full pre-PR check

```bash
pnpm lint && pnpm test && pnpm build
```

---

## TUNX Format Reference

SwissManager TUNX is a proprietary binary format produced by the SwissManager
pairing software. All integers are little-endian.

### Header (bytes 0x00–0x6B, 108 bytes)

Fixed-size block at the start of every file. Starts with the 4-byte magic
`93 FF 89 44` (LE: `0x4489FF93`). The header is preserved verbatim for
round-trip fidelity.

| Offset | Size | Field         | Type  | Notes                                    |
| ------ | ---- | ------------- | ----- | ---------------------------------------- |
| 0x00   | 4    | Magic         | U32LE | `0x4489FF93`                             |
| 0x04   | 4    | (reserved)    | U32LE | Always 0 in known samples                |
| 0x08   | 20   | License hash  | bytes | High-entropy, identical per SW install   |
| 0x1C   | 4    | Saved-at date | U32LE | YYYYMMDD integer                         |
| 0x20   | 4    | Tournament ID | U32LE | Matches chess-results.com tournament IDs |
| 0x24   | 4    | (unknown)     | U32LE | Purpose undetermined                     |
| 0x28   | 8    | (reserved)    | —     | Always 0                                 |
| 0x30   | 4    | Installed-at  | U32LE | YYYYMMDD integer, likely SW install date |
| 0x34   | 52   | Install sig.  | bytes | High-entropy, identical per SW install   |

### Metadata strings (0x6C → config marker)

Sequence of variable-length UTF-16LE strings, each prefixed by a U16LE character
count. Field indices:

| Index | Field            |
| ----- | ---------------- |
| 0     | Tournament name  |
| 1     | Subtitle (short) |
| 2     | Subtitle (long)  |
| 3     | Chief arbiter    |
| 4     | Deputy arbiter   |
| 5     | Venue            |
| 6     | Other arbiters   |
| 7     | PGN path 1       |
| 8     | PGN path 2       |
| 9     | Short name       |
| 10    | City             |
| 11    | Internal ID      |
| 13    | Categories       |
| 14    | Time control     |
| 20    | Federation       |

### Config section (marker `95 FF 89 44`)

Starts with the 4-byte config marker. Relevant offsets within the data (after
skipping the 4-byte marker):

| Offset | Size  | Field         |
| ------ | ----- | ------------- |
| 0x00   | U16LE | Total rounds  |
| 0x11   | U8    | Current round |
| 0x13   | U16LE | Player count  |

The entire config section is stored raw for round-trip.

### Player section (marker `A5 FF 89 44`)

Immediately follows the config section. Each player record contains:

1. **30 UTF-16LE strings** — surname, first name, title, club, federation,
   national ID, etc.
2. **110-byte numeric block** — fixed-size binary data including:

| Offset | Size  | Field           |
| ------ | ----- | --------------- |
| 0x08   | U16LE | FIDE rating     |
| 0x0A   | U16LE | National rating |
| 0x18   | U32LE | FIDE ID         |

Player string field indices within the 30-field block:

| Index | Field       |
| ----- | ----------- |
| 0     | Surname     |
| 1     | First name  |
| 3     | Short name  |
| 4     | Title       |
| 5     | National ID |
| 9     | Club        |
| 10    | Federation  |

### Pairings section (marker `B3 FF 89 44`)

Each pairing record is 21 bytes:

| Offset | Size  | Field               |
| ------ | ----- | ------------------- |
| 0      | U16LE | White player number |
| 2      | U16LE | Black player number |
| 4      | U16LE | Result code         |

Result codes: `1` = white wins, `2` = draw, `3` = black wins, `4` = white wins
(forfeit), `5` = black wins (forfeit), `9` = unplayed/bye.

Bye player number is `0xFFFE`. Records are ordered by round then board. Pairings
per round = `ceil(playerCount / 2)`.

The entire pairings section (including marker and all trailing sub-sections such
as `D3` and `E3`) is stored verbatim in `_raw.pairingsSection`.

---

## Architecture Notes

- **ESM-only** — the package ships only ESM. Do not add a CJS build.
- No runtime dependencies — keep it that way.
- `parse()` and `stringify()` are synchronous — do not introduce async.
- `src/index.ts` is a re-export barrel. Logic lives in `src/parse.ts` and
  `src/stringify.ts`.
- `src/constants.ts` contains all binary layout constants.
- `src/types.ts` contains all exported types.
- `src/reader.ts` — `BinaryReader` class: cursor-based reader over a
  `Uint8Array` with `readU8()`, `readU16LE()`, `readU32LE()`, `readString()`
  (UTF-16LE), and `readBytes()`.
- `src/writer.ts` — `BinaryWriter` class: chunk-accumulating writer with
  `writeU8()`, `writeU16LE()`, `writeU32LE()`, `writeString()` (UTF-16LE), and
  `writeBytes()`. Call `toUint8Array()` to flush all chunks.
- `Tournament._raw` preserves the original byte sequences needed for round-trip
  reconstruction: `headerBytes`, `metadataStrings`, `configBytes`,
  `playerStrings`, `playerNumericBytes`, `pairingsSection`.
- Section markers are located using a linear byte-scan (`findMarker`) rather
  than fixed offsets; the metadata and config sections have variable length.
- All interface fields sorted alphabetically (`sort-keys` is an ESLint error).
- Always use `.js` extensions on relative imports (NodeNext resolution).

---

## Error Handling

- `parse()` returns `undefined` for unrecoverable failures (bad magic, missing
  section markers) and calls `options.onError`.
- `parse()` calls `options.onWarning` for recoverable issues (player count
  mismatch, unexpected end of data, zero round count).
- `stringify()` throws `RangeError` if `tournament._raw` is absent.
- Never use `null`; prefer `undefined` for absent optional values.

---

## Release Protocol

Step-by-step process for releasing a new version. CI auto-publishes to npm when
`version` in `package.json` changes on `main`.

1. **Verify the package is clean:**

   ```bash
   pnpm lint && pnpm test && pnpm build
   ```

   Do not proceed if any step fails.

2. **Decide the semver level:**
   - `patch` — bug fixes, internal refactors with no API change
   - `minor` — new features, new exports, non-breaking additions
   - `major` — breaking changes to the public API

3. **Update `CHANGELOG.md`** following
   [Keep a Changelog](https://keepachangelog.com) format:

   ```markdown
   ## [x.y.z] - YYYY-MM-DD

   ### Added

   - …

   ### Changed

   - …

   ### Fixed

   - …

   ### Removed

   - …
   ```

   Include only sections that apply. Use past tense.

4. **Update `README.md`** if the release introduces new public API, changes
   usage examples, or deprecates/removes existing features.

5. **Bump the version:**

   ```bash
   npm version <major|minor|patch> --no-git-tag-version
   ```

6. **Commit and push:**

   ```bash
   git add package.json CHANGELOG.md README.md
   git commit -m "release: @echecs/tunx@x.y.z"
   git push
   ```

7. **CI takes over:** GitHub Actions detects the version bump, runs format →
   lint → test, and publishes to npm.

Do not manually publish with `npm publish`.
