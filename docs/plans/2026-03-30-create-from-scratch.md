# Create TUNX From Scratch — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Add a template-based `create(template, input)` function that builds a
new `Tournament` with `_raw` populated, ready for `stringify()`. Enables
importing tournament data from other formats into SwissManager's TUNX format.

**Architecture:** New `src/create.ts` module. Takes an existing parsed
`Tournament` as a template (for license bytes, config structure, unknown
sections) and a `CreateInput` describing the new data. Generates `_raw` fields:
metadata strings from input fields, player strings/numeric blocks from input
players, pairing records from input rounds, config bytes patched from template.
Header and D3/E3 trailers reused verbatim from template.

**Tech Stack:** TypeScript, Vitest, no new dependencies.

**Design doc:** `docs/plans/2026-03-30-create-from-scratch-design.md`

---

### Task 1: Add Create\* types to types.ts

**Files:**

- Modify: `src/types.ts`

**Step 1: Add the new interfaces**

Add after the existing `DateRange` interface (line 20), before `Header`:

```typescript
interface CreateInput {
  arbiters?: Arbiter[];
  city?: string;
  dates?: DateRange;
  federation?: string;
  name: string;
  players: CreatePlayer[];
  rounds: CreateRound[];
  subtitle?: string;
  timeControl?: string;
  venue?: string;
}

interface CreatePairing {
  black: number;
  result: ResultKind;
  white: number;
}

interface CreatePlayer {
  club?: string;
  federation?: string;
  fideId?: number;
  firstName: string;
  kFactor?: number;
  nationalId?: string;
  nationalRating?: number;
  rating?: number;
  sex?: 'F' | 'M';
  surname: string;
  title?: Title;
}

interface CreateRound {
  date?: string;
  pairings: CreatePairing[];
}
```

**Step 2: Add to exports**

Add `CreateInput`, `CreatePairing`, `CreatePlayer`, `CreateRound` to the export
block (alphabetically).

**Step 3: Export from index.ts**

Add the 4 new types to the type exports in `src/index.ts`.

**Step 4: Run type check**

Run: `pnpm lint:types` Expected: PASS

**Step 5: Commit**

```
feat(types): add Create* interfaces for template-based file creation
```

---

### Task 2: Write tests for create()

**Files:**

- Modify: `src/__tests__/index.spec.ts`

**Step 1: Add create() tests**

After the existing `stringify()` describe block, add:

```typescript
describe('create()', () => {
  const templateData = fixture('sample.TUNX');
  const template = parse(templateData);

  it('creates a tournament with the given name', () => {
    const result = create(template!, {
      name: 'Test Tournament',
      players: [
        { firstName: 'Magnus', surname: 'Carlsen', rating: 2830 },
        { firstName: 'Hikaru', surname: 'Nakamura', rating: 2780 },
      ],
      rounds: [
        {
          pairings: [{ white: 1, black: 2, result: 'win' }],
        },
      ],
    });
    expect(result.name).toBe('Test Tournament');
  });

  it('preserves the template header bytes', () => {
    const result = create(template!, {
      name: 'Test',
      players: [
        { firstName: 'A', surname: 'B' },
        { firstName: 'C', surname: 'D' },
      ],
      rounds: [
        {
          pairings: [{ white: 1, black: 2, result: 'draw' }],
        },
      ],
    });
    expect(result._raw.headerBytes).toEqual(template!._raw.headerBytes);
  });

  it('round-trips through stringify and parse', () => {
    const input = {
      name: 'Round-Trip Test',
      players: [
        {
          firstName: 'Magnus',
          surname: 'Carlsen',
          rating: 2830,
          fideId: 1503014,
          sex: 'M' as const,
        },
        {
          firstName: 'Hikaru',
          surname: 'Nakamura',
          rating: 2780,
          fideId: 2016192,
        },
      ],
      rounds: [
        {
          date: '2026-03-30',
          pairings: [{ white: 1, black: 2, result: 'win' as const }],
        },
      ],
    };

    const created = create(template!, input);
    const bytes = stringify(created);
    const reparsed = parse(bytes);

    expect(reparsed).toBeDefined();
    expect(reparsed?.name).toBe('Round-Trip Test');
    expect(reparsed?.players).toHaveLength(2);
    expect(reparsed?.players[0]?.surname).toBe('Carlsen');
    expect(reparsed?.players[0]?.rating).toBe(2830);
    expect(reparsed?.players[0]?.fideId).toBe(1503014);
    expect(reparsed?.players[1]?.surname).toBe('Nakamura');
    expect(reparsed?.rounds).toHaveLength(1);
    expect(reparsed?.rounds[0]?.pairings[0]?.result).toBe('win');
  });

  it('throws if template has no _raw', () => {
    const noRaw = { ...template!, _raw: undefined as never };
    expect(() => create(noRaw, { name: 'X', players: [], rounds: [] })).toThrow(
      RangeError,
    );
  });
});
```

Add `create` to the imports from the library at the top of the test file.

**Step 2: Run tests to verify they fail**

Run: `pnpm test` Expected: FAIL — `create` doesn't exist yet.

**Step 3: Commit**

```
test: add failing tests for create() function
```

---

### Task 3: Implement create() — core structure

**Files:**

- Create: `src/create.ts`
- Modify: `src/index.ts`

**Step 1: Create src/create.ts with the function skeleton**

```typescript
import {
  BYE_PLAYER_NUMBER,
  CONFIG_OFFSET_CURRENT_ROUND,
  CONFIG_OFFSET_END_DATE,
  CONFIG_OFFSET_PLAYER_COUNT,
  CONFIG_OFFSET_START_DATE,
  CONFIG_OFFSET_TOTAL_ROUNDS,
  METADATA,
  PAIRING_RECORD_SIZE,
  PAIRINGS_MARKER,
  PLAYER_NUMERIC_BLOCK_SIZE,
  PLAYER_NUMERIC_OFFSET_FIDE_ID,
  PLAYER_NUMERIC_OFFSET_FIDE_RATING,
  PLAYER_NUMERIC_OFFSET_K_FACTOR,
  PLAYER_NUMERIC_OFFSET_NATIONAL_RATING,
  PLAYER_NUMERIC_OFFSET_SEX,
  PLAYER_STRING_COUNT,
  PLAYER_STRINGS,
  RESULT_CODE,
} from './constants.js';

import type {
  CreateInput,
  CreatePlayer,
  RawTournament,
  ResultKind,
  Tournament,
} from './types.js';

/** Map a ResultKind back to a TUNX binary result code. */
function resultKindToCode(kind: ResultKind): number {
  switch (kind) {
    case 'unpaired':
      return RESULT_CODE.UNPAIRED;
    case 'win':
      return RESULT_CODE.WHITE_WINS;
    case 'draw':
      return RESULT_CODE.DRAW;
    case 'loss':
      return RESULT_CODE.BLACK_WINS;
    case 'forfeit-win':
      return RESULT_CODE.WHITE_WINS_FORFEIT;
    case 'forfeit-loss':
      return RESULT_CODE.BLACK_WINS_FORFEIT;
    case 'bye':
      return RESULT_CODE.UNPLAYED;
    case 'double-forfeit':
      return 6;
    case 'half-bye':
      return 7;
  }
}

/** Parse a YYYY-MM-DD string into a YYYYMMDD integer. */
function dateToYYYYMMDD(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return (year ?? 0) * 10_000 + (month ?? 0) * 100 + (day ?? 0);
}

/** Build the metadata string array from CreateInput fields. */
function buildMetadataStrings(
  template: string[],
  input: CreateInput,
): string[] {
  const strings = [...template];

  strings[METADATA.NAME] = input.name;
  strings[METADATA.SUBTITLE_SHORT] = input.subtitle ?? '';
  strings[METADATA.SUBTITLE_LONG] = input.subtitle ?? '';
  strings[METADATA.VENUE] = input.venue ?? '';
  strings[METADATA.CITY] = input.city ?? '';
  strings[METADATA.FEDERATION] = input.federation ?? '';
  strings[METADATA.TIME_CONTROL] = input.timeControl ?? '';

  // Arbiters
  const chief = input.arbiters?.find((a) => a.role === 'chief');
  const deputy = input.arbiters?.find((a) => a.role === 'deputy');
  const others = input.arbiters
    ?.filter((a) => a.role === 'arbiter')
    .map((a) => a.name)
    .join(', ');

  strings[METADATA.CHIEF_ARBITER] = chief?.name ?? '';
  strings[METADATA.DEPUTY_ARBITER] = deputy?.name ?? '';
  strings[METADATA.OTHER_ARBITERS] = others ?? '';

  return strings;
}

/** Build the 30-string array for a single player. */
function buildPlayerStrings(player: CreatePlayer, index: number): string[] {
  const strings: string[] = Array.from<string>({
    length: PLAYER_STRING_COUNT,
  }).fill('');

  strings[PLAYER_STRINGS.SURNAME] = player.surname;
  strings[PLAYER_STRINGS.FIRST_NAME] = player.firstName;
  strings[PLAYER_STRINGS.SHORT_NAME] =
    `${player.firstName.charAt(0)}. ${player.surname}`;
  strings[PLAYER_STRINGS.TITLE] = player.title ?? '';
  strings[PLAYER_STRINGS.NATIONAL_ID] = player.nationalId ?? '';
  strings[PLAYER_STRINGS.CLUB] = player.club ?? '';
  strings[PLAYER_STRINGS.FEDERATION] = player.federation ?? '';

  return strings;
}

/** Build the 110-byte numeric block for a single player. */
function buildPlayerNumericBlock(player: CreatePlayer): Uint8Array {
  const block = new Uint8Array(PLAYER_NUMERIC_BLOCK_SIZE);
  const view = new DataView(block.buffer);

  if (player.sex === 'F') {
    block[PLAYER_NUMERIC_OFFSET_SEX] = 1;
  }

  const rating = player.rating ?? 0;
  view.setUint16(PLAYER_NUMERIC_OFFSET_FIDE_RATING, rating, true);
  view.setUint16(
    PLAYER_NUMERIC_OFFSET_NATIONAL_RATING,
    player.nationalRating ?? 0,
    true,
  );
  view.setUint32(PLAYER_NUMERIC_OFFSET_FIDE_ID, player.fideId ?? 0, true);
  view.setUint16(PLAYER_NUMERIC_OFFSET_K_FACTOR, player.kFactor ?? 0, true);

  return block;
}

/** Patch config bytes with new tournament metadata. */
function patchConfigBytes(
  templateConfig: Uint8Array,
  input: CreateInput,
): Uint8Array {
  const config = new Uint8Array(templateConfig);
  const view = new DataView(
    config.buffer,
    config.byteOffset,
    config.byteLength,
  );

  // Offsets are relative to config data (after the 4-byte marker)
  const dataOffset = 4;

  view.setUint16(
    dataOffset + CONFIG_OFFSET_TOTAL_ROUNDS,
    input.rounds.length,
    true,
  );
  view.setUint8(dataOffset + CONFIG_OFFSET_CURRENT_ROUND, input.rounds.length);
  view.setUint16(
    dataOffset + CONFIG_OFFSET_PLAYER_COUNT,
    input.players.length,
    true,
  );

  if (input.dates) {
    view.setUint32(
      dataOffset + CONFIG_OFFSET_START_DATE,
      dateToYYYYMMDD(input.dates.start),
      true,
    );
    view.setUint32(
      dataOffset + CONFIG_OFFSET_END_DATE,
      dateToYYYYMMDD(input.dates.end),
      true,
    );
  }

  return config;
}

/** Build the pairings section from rounds data + template trailer. */
function buildPairingsSection(
  templatePairingsSection: Uint8Array,
  input: CreateInput,
): Uint8Array {
  // Find D3 marker in template to extract the trailer
  const d3Marker = [0xd3, 0xff, 0x89, 0x44];
  let trailerOffset = -1;
  for (let i = 4; i < templatePairingsSection.length - 3; i++) {
    if (
      templatePairingsSection[i] === d3Marker[0] &&
      templatePairingsSection[i + 1] === d3Marker[1] &&
      templatePairingsSection[i + 2] === d3Marker[2] &&
      templatePairingsSection[i + 3] === d3Marker[3]
    ) {
      trailerOffset = i;
      break;
    }
  }

  const trailer =
    trailerOffset !== -1
      ? templatePairingsSection.slice(trailerOffset)
      : new Uint8Array(0);

  // Count total pairing records
  const totalPairings = input.rounds.reduce(
    (sum, r) => sum + r.pairings.length,
    0,
  );

  // Build: marker (4) + records + trailer
  const pairingsSize = 4 + totalPairings * PAIRING_RECORD_SIZE + trailer.length;
  const section = new Uint8Array(pairingsSize);
  const view = new DataView(section.buffer);

  // Write pairings marker
  section[0] = 0xb3;
  section[1] = 0xff;
  section[2] = 0x89;
  section[3] = 0x44;

  let offset = 4;
  for (const round of input.rounds) {
    for (const pairing of round.pairings) {
      view.setUint16(offset, pairing.white, true);
      view.setUint16(
        offset + 2,
        pairing.black === 0 ? BYE_PLAYER_NUMBER : pairing.black,
        true,
      );
      view.setUint16(offset + 4, resultKindToCode(pairing.result), true);
      // Bytes 6-20 are zero (already initialized)
      offset += PAIRING_RECORD_SIZE;
    }
  }

  // Append trailer
  section.set(trailer, offset);

  return section;
}

/**
 * Create a new TUNX tournament using an existing tournament as a template.
 *
 * The template provides the binary scaffolding (license bytes, config
 * structure, unknown sections). The input provides the new tournament data.
 *
 * @param template - A parsed `Tournament` to use as the binary template.
 * @param input - The new tournament data.
 * @returns A new `Tournament` with `_raw` populated, ready for `stringify()`.
 */
export default function create(
  template: Tournament,
  input: CreateInput,
): Tournament {
  if (!template._raw) {
    throw new RangeError(
      'create() requires template._raw — only tournaments produced by parse() can be used as templates',
    );
  }

  const raw: RawTournament = {
    configBytes: patchConfigBytes(template._raw.configBytes, input),
    headerBytes: new Uint8Array(template._raw.headerBytes),
    metadataStrings: buildMetadataStrings(template._raw.metadataStrings, input),
    pairingBytes: [],
    pairingsSection: buildPairingsSection(template._raw.pairingsSection, input),
    playerNumericBytes: input.players.map(buildPlayerNumericBlock),
    playerStrings: input.players.map((p, i) => buildPlayerStrings(p, i)),
  };

  // Build structured tournament data from input
  const players = input.players.map((p, i) => ({
    club: p.club,
    federation: p.federation,
    fideId: p.fideId,
    firstName: p.firstName,
    kFactor: p.kFactor,
    nationalId: p.nationalId,
    nationalRating: p.nationalRating,
    pairingNumber: i + 1,
    rating: p.rating,
    results: [],
    sex: p.sex === 'F' ? ('F' as const) : undefined,
    surname: p.surname,
    title: p.title,
  }));

  const rounds = input.rounds.map((r, ri) => ({
    date: r.date,
    number: ri + 1,
    pairings: r.pairings.map((p, pi) => ({
      black: p.black,
      board: pi + 1,
      result: p.result,
      white: p.white,
    })),
  }));

  return {
    _raw: raw,
    arbiters: input.arbiters ?? [],
    city: input.city,
    currentRound: input.rounds.length,
    dates: input.dates,
    federation: input.federation,
    header: template.header,
    name: input.name,
    pairingSystem: 'dutch',
    players,
    rounds,
    subtitle: input.subtitle,
    tiebreaks: [],
    timeControl: input.timeControl,
    venue: input.venue,
  };
}
```

**Step 2: Export from index.ts**

Add `export { default as create } from './create.js';` at the top of the exports
in `src/index.ts`.

**Step 3: Run tests**

Run: `pnpm test` Expected: ALL PASS

**Step 4: Run lint**

Run: `pnpm lint` Expected: PASS

**Step 5: Commit**

```
feat: add create() for template-based TUNX file creation
```

---

### Task 4: Update documentation

**Files:**

- Modify: `BACKLOG.md`

**Step 1: Mark backlog item done**

Replace:

```
- [ ] Support creating TUNX files from scratch (currently requires `_raw` from a
      parsed file).
```

with:

```
- [x] ~~Support creating TUNX files from scratch (currently requires `_raw` from
      a parsed file).~~ Added template-based `create(template, input)`
      function. Requires an existing parsed TUNX as template for license bytes
      and config structure.
```

**Step 2: Commit**

```
docs: mark create-from-scratch backlog item as done
```

---

### Task 5: Final verification

Run: `pnpm lint && pnpm test && pnpm build` Expected: ALL PASS
