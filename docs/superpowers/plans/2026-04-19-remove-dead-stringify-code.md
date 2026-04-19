# Remove Dead Stringify Code Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove dead stringify/writer code left behind after v0.2.0 dropped `_raw`, and update docs to reflect reality.

**Architecture:** Pure deletion + doc updates. No behavioral changes to `parse()`. The `pairingBytes` array in `parse.ts` gets replaced with direct index math into `pairingData`. Six dead constant exports get removed from `constants.ts`.

**Tech Stack:** TypeScript, Vitest

---

### Task 1: Delete `src/stringify.ts` and `src/writer.ts`

**Files:**
- Delete: `src/stringify.ts`
- Delete: `src/writer.ts`
- Delete: `src/__tests__/writer.spec.ts`

- [ ] **Step 1: Delete the three files**

```bash
rm src/stringify.ts src/writer.ts src/__tests__/writer.spec.ts
```

- [ ] **Step 2: Run type check to confirm no imports break**

Run: `pnpm run lint:types`
Expected: PASS — nothing imports these files.

- [ ] **Step 3: Run tests to confirm nothing breaks**

Run: `pnpm run test`
Expected: All tests pass. Writer tests are gone, parser tests unaffected.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: delete dead stringify and writer modules"
```

---

### Task 2: Remove `RawTournament` from `src/types.ts`

**Files:**
- Modify: `src/types.ts:1-9` (delete interface)
- Modify: `src/types.ts:152` (delete from export)

- [ ] **Step 1: Delete `RawTournament` interface (lines 1-9)**

Remove the entire interface block:

```typescript
interface RawTournament {
  configBytes: Uint8Array;
  headerBytes: Uint8Array;
  metadataStrings: string[];
  pairingBytes: Uint8Array[];
  pairingsSection: Uint8Array;
  playerNumericBytes: Uint8Array[];
  playerStrings: string[][];
}
```

- [ ] **Step 2: Remove `RawTournament` from the export block**

In the `export type { ... }` block, remove:

```typescript
  RawTournament,
```

- [ ] **Step 3: Run type check**

Run: `pnpm run lint:types`
Expected: PASS — nothing imports `RawTournament` (the only consumer was `stringify.ts`, deleted in Task 1).

- [ ] **Step 4: Run tests**

Run: `pnpm run test`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts
git commit -m "refactor: remove dead RawTournament type"
```

---

### Task 3: Remove dead code from `src/parse.ts`

**Files:**
- Modify: `src/parse.ts:26-27,30,32-34` (remove 6 constant imports)
- Modify: `src/parse.ts:395-400` (remove `pairingBytes` array construction)
- Modify: `src/parse.ts:430-436` (remove 6 `void` reads)
- Modify: `src/parse.ts:492-494,502` (replace `pairingBytes` usage with direct math)

- [ ] **Step 1: Remove 6 dead constant imports**

In the import block from `'./constants.js'`, remove these 6 lines:

```typescript
  PLAYER_NUMERIC_OFFSET_ALPHABETICAL_INDEX,
  PLAYER_NUMERIC_OFFSET_CATEGORY_ID,
  PLAYER_NUMERIC_OFFSET_K_FACTOR,
  PLAYER_NUMERIC_OFFSET_RATING_DELTA,
  PLAYER_NUMERIC_OFFSET_RATING_PERIOD,
  PLAYER_NUMERIC_OFFSET_REGISTRATION_ID,
```

- [ ] **Step 2: Remove `pairingBytes` array construction (lines 395-400)**

Delete:

```typescript
  const pairingBytes: Uint8Array[] = [];

  for (let index = 0; index < totalPairingRecords; index++) {
    const offset = index * PAIRING_RECORD_SIZE;
    pairingBytes.push(pairingData.slice(offset, offset + PAIRING_RECORD_SIZE));
  }
```

- [ ] **Step 3: Remove 6 `void` reads (lines 430-436)**

Delete:

```typescript
    // Read remaining numeric fields — kept in raw but not surfaced on Player
    void numericView.getUint16(PLAYER_NUMERIC_OFFSET_RATING_DELTA, true);
    void numericView.getUint16(PLAYER_NUMERIC_OFFSET_RATING_PERIOD, true);
    void numericView.getUint16(PLAYER_NUMERIC_OFFSET_CATEGORY_ID, true);
    void numericView.getUint16(PLAYER_NUMERIC_OFFSET_REGISTRATION_ID, true);
    void numericView.getUint16(PLAYER_NUMERIC_OFFSET_ALPHABETICAL_INDEX, true);
    void numericView.getUint16(PLAYER_NUMERIC_OFFSET_K_FACTOR, true);
```

- [ ] **Step 4: Refactor pairing loop to use direct index math**

Replace the `endPairing` computation and inner loop that used `pairingBytes[pairingIndex]` with direct reads from `pairingData`:

Old code (around lines 491-512):

```typescript
    const endPairing = Math.min(
      startPairing + pairingsPerRound,
      pairingBytes.length,
    );

    for (
      let pairingIndex = startPairing;
      pairingIndex < endPairing;
      pairingIndex++
    ) {
      const record = pairingBytes[pairingIndex];

      if (record === undefined) {
        break;
      }

      const pairingView = new DataView(
        record.buffer,
        record.byteOffset,
        record.byteLength,
      );
      const white = pairingView.getUint16(0, true);
      const black = pairingView.getUint16(2, true);
      const resultCode = pairingView.getUint16(4, true);
```

New code:

```typescript
    const endPairing = Math.min(
      startPairing + pairingsPerRound,
      totalPairingRecords,
    );

    for (
      let pairingIndex = startPairing;
      pairingIndex < endPairing;
      pairingIndex++
    ) {
      const offset = pairingIndex * PAIRING_RECORD_SIZE;

      if (offset + PAIRING_RECORD_SIZE > pairingData.length) {
        break;
      }

      const pairingView = new DataView(
        pairingData.buffer,
        pairingData.byteOffset + offset,
        PAIRING_RECORD_SIZE,
      );
      const white = pairingView.getUint16(0, true);
      const black = pairingView.getUint16(2, true);
      const resultCode = pairingView.getUint16(4, true);
```

- [ ] **Step 5: Run type check**

Run: `pnpm run lint:types`
Expected: PASS.

- [ ] **Step 6: Run tests**

Run: `pnpm run test`
Expected: All tests pass — behavior unchanged.

- [ ] **Step 7: Commit**

```bash
git add src/parse.ts
git commit -m "refactor: remove dead void reads and pairingBytes intermediate array"
```

---

### Task 4: Remove dead constant exports from `src/constants.ts`

**Files:**
- Modify: `src/constants.ts:80,83,89,95,98,101` (delete 6 constant declarations)
- Modify: `src/constants.ts:206-207,210,212-214` (delete from export)

- [ ] **Step 1: Delete 6 constant declarations**

Remove:

```typescript
/** Byte offset inside the numeric block for the alphabetical sort index (U16LE). */
const PLAYER_NUMERIC_OFFSET_ALPHABETICAL_INDEX = 0x38;

/** Byte offset inside the numeric block for the category ID (U16LE). */
const PLAYER_NUMERIC_OFFSET_CATEGORY_ID = 0x12;

/** Byte offset inside the numeric block for the FIDE K-factor (U16LE). */
const PLAYER_NUMERIC_OFFSET_K_FACTOR = 0x3a;

/** Byte offset inside the numeric block for the rating delta (U16LE). */
const PLAYER_NUMERIC_OFFSET_RATING_DELTA = 0x0e;

/** Byte offset inside the numeric block for the rating period (U16LE). */
const PLAYER_NUMERIC_OFFSET_RATING_PERIOD = 0x10;

/** Byte offset inside the numeric block for the registration ID (U16LE). */
const PLAYER_NUMERIC_OFFSET_REGISTRATION_ID = 0x16;
```

- [ ] **Step 2: Remove 6 constants from the export block**

Remove from the `export { ... }` block:

```typescript
  PLAYER_NUMERIC_OFFSET_ALPHABETICAL_INDEX,
  PLAYER_NUMERIC_OFFSET_CATEGORY_ID,
  PLAYER_NUMERIC_OFFSET_K_FACTOR,
  PLAYER_NUMERIC_OFFSET_RATING_DELTA,
  PLAYER_NUMERIC_OFFSET_RATING_PERIOD,
  PLAYER_NUMERIC_OFFSET_REGISTRATION_ID,
```

- [ ] **Step 3: Run lint and tests**

Run: `pnpm run lint && pnpm run test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/constants.ts
git commit -m "refactor: remove unused player numeric offset constants"
```

---

### Task 5: Update `AGENTS.md`

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Update project overview paragraph (line 3-4)**

Old:
```
Agent guidance for the `@echecs/tunx` package — SwissManager TUNX binary
tournament file parser/serializer.
```

New:
```
Agent guidance for the `@echecs/tunx` package — SwissManager TUNX binary
tournament file parser.
```

- [ ] **Step 2: Remove stringify and create from named exports (lines 23-26)**

Delete:
```markdown
- `stringify(tournament) → Uint8Array` — re-encodes a parsed tournament.
  Requires `tournament._raw` and throws `RangeError` if it is absent.
- `create(template, input) → Tournament` — constructs a new `Tournament` from a
  template TUNX file and a plain-object description.
```

- [ ] **Step 3: Replace round-trip fidelity statement (lines 38-39)**

Old:
```
Full round-trip fidelity is the primary design constraint — parsing a file and
re-serializing it must produce byte-for-byte identical output to the original.
```

New:
```
The TUNX binary format is not fully understood — several header, config, and
player numeric fields remain undocumented. The parser extracts all known fields
and silently skips unknown regions.
```

- [ ] **Step 4: Remove round-trip note from header section (line 87-88)**

Old:
```
`93 FF 89 44` (LE: `0x4489FF93`). The header is preserved verbatim for
round-trip fidelity.
```

New:
```
`93 FF 89 44` (LE: `0x4489FF93`).
```

- [ ] **Step 5: Remove round-trip note from config section (line 155)**

Delete:
```
The entire config section is stored raw for round-trip.
```

- [ ] **Step 6: Remove `_raw.pairingsSection` reference (lines 206-207)**

Old:
```
The entire pairings section (including marker and all trailing sub-sections such
as `D3` and `E3`) is stored verbatim in `_raw.pairingsSection`.
```

New (just remove the paragraph, keep the surrounding content).

- [ ] **Step 7: Remove `_raw` reference from common data model (line 237)**

Old:
```
TUNX's `Tournament` adds format-specific fields (`_raw`, `pairings`, `header`).
```

New:
```
TUNX's `Tournament` adds format-specific fields (`pairings`, `header`).
```

- [ ] **Step 8: Update architecture notes**

Remove or update these lines:

Line 253 — Old:
```
- `parse()` and `stringify()` are synchronous — do not introduce async.
```
New:
```
- `parse()` is synchronous — do not introduce async.
```

Lines 254-255 — Old:
```
- `src/index.ts` is a re-export barrel. Logic lives in `src/parse.ts` and
  `src/stringify.ts`.
```
New:
```
- `src/index.ts` is a re-export barrel. Logic lives in `src/parse.ts`.
```

Lines 261-266 — Delete entirely:
```
- `src/writer.ts` — `BinaryWriter` class: chunk-accumulating writer with
  `writeU8()`, `writeU16LE()`, `writeU32LE()`, `writeString()` (UTF-16LE), and
  `writeBytes()`. Call `toUint8Array()` to flush all chunks.
- `Tournament._raw` preserves the original byte sequences needed for round-trip
  reconstruction: `headerBytes`, `metadataStrings`, `configBytes`,
  `playerStrings`, `playerNumericBytes`, `pairingsSection`.
```

- [ ] **Step 9: Remove stringify error handling note (line 280)**

Delete:
```
- `stringify()` throws `RangeError` if `tournament._raw` is absent.
```

- [ ] **Step 10: Commit**

```bash
git add AGENTS.md
git commit -m "docs: update AGENTS.md — remove stringify/round-trip references"
```

---

### Task 6: Update `README.md` and `package.json`

**Files:**
- Modify: `README.md:1-6` (update intro)
- Modify: `README.md:193-209` (delete `RawTournament` section)
- Modify: `package.json:6` (update description)
- Modify: `package.json:47` (remove "serializer" keyword)

- [ ] **Step 1: Update README intro (lines 1-6)**

Old:
```markdown
# @echecs/tunx

Parse and stringify [Swiss-Manager](https://swiss-manager.at/) `.TUNX` binary
tournament files. Zero dependencies, strict TypeScript, full round-trip
fidelity. Output types align with
[`@echecs/trf`](https://www.npmjs.com/package/@echecs/trf).
```

New:
```markdown
# @echecs/tunx

Parse [Swiss-Manager](https://swiss-manager.at/) `.TUNX` binary tournament
files. Zero dependencies, strict TypeScript. Output types align with
[`@echecs/trf`](https://www.npmjs.com/package/@echecs/trf).
```

- [ ] **Step 2: Delete RawTournament section (lines 193-209)**

Delete the entire block:
```markdown
### `RawTournament`

Preserved binary chunks for byte-exact round-trip reconstruction. Internal type
— not exported from the package entry point. Available on `Tournament._raw`
after parsing.

\`\`\`typescript
interface RawTournament {
  configBytes: Uint8Array;
  headerBytes: Uint8Array;
  metadataStrings: string[];
  pairingBytes: Uint8Array[];
  pairingsSection: Uint8Array;
  playerNumericBytes: Uint8Array[];
  playerStrings: string[][];
}
\`\`\`
```

- [ ] **Step 3: Update package.json description (line 6)**

Old:
```json
"description": "Parse and stringify SwissManager TUNX binary tournament files. Zero dependencies, strict TypeScript, full round-trip fidelity.",
```

New:
```json
"description": "Parse SwissManager TUNX binary tournament files. Zero dependencies, strict TypeScript.",
```

- [ ] **Step 4: Remove "serializer" keyword from package.json (line 47)**

Delete the line:
```json
    "serializer",
```

- [ ] **Step 5: Run full check**

Run: `pnpm run lint && pnpm run test && pnpm run build`
Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add README.md package.json
git commit -m "docs: update README and package.json — remove stringify references"
```
