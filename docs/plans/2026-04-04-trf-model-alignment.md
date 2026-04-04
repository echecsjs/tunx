# TRF Model Alignment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor tunx output types to align with the `@echecs/trf` model so
both packages produce structurally compatible tournament objects.

**Architecture:** Replace tunx-specific types with trf-compatible equivalents.
Tournament flattens `dates` and `arbiters`, uses `rounds` as count +
`roundDates` array. Player combines `firstName`+`surname` into `name`, changes
`sex` to `'m'|'w'`, adds computed `points`+`rank`, restructures `results` to
match `RoundResult`. Round/Pairing types change: pairings move to a separate
`rounds`-indexed structure while `Round` becomes just metadata. TUNX-specific
fields (`_raw`, `header`, `currentRound`, etc.) are preserved as extensions.

**Tech Stack:** TypeScript, Vitest, no new dependencies.

---

## File Map

| File                          | Change        | Responsibility            |
| ----------------------------- | ------------- | ------------------------- |
| `src/types.ts`                | Major rewrite | All type definitions      |
| `src/parse.ts`                | Major rewrite | Produce new types         |
| `src/stringify.ts`            | Moderate      | Consume new types         |
| `src/create.ts`               | Moderate      | Consume/produce new types |
| `src/index.ts`                | Minor         | Update exports            |
| `src/__tests__/index.spec.ts` | Major rewrite | All assertions change     |

---

### Task 1: Rewrite types.ts to align with TRF model

**Files:**

- Modify: `src/types.ts`

The new types should match TRF's structure where possible, with TUNX-specific
extensions. Key changes:

```typescript
// ── Result codes ──────────────────────────────────────────────────────────
// Match TRF's ResultCode exactly
type ResultCode =
  | '+'
  | '-'
  | '0'
  | '1'
  | '='
  | 'D'
  | 'F'
  | 'H'
  | 'U'
  | 'W'
  | 'Z';

// ── Sex ───────────────────────────────────────────────────────────────────
// Match TRF: lowercase 'm' | 'w'
type Sex = 'm' | 'w';

// ── Player result (per-round) ─────────────────────────────────────────────
// Match TRF's RoundResult
interface RoundResult {
  color: 'b' | 'w' | '-';
  opponentId: number | null;
  result: ResultCode;
  round: number;
}

// ── Player ────────────────────────────────────────────────────────────────
interface Player {
  // TRF-compatible fields
  birthDate?: string; // not populated from TUNX binary
  federation?: string;
  fideId?: string; // string, not number (TRF compat)
  name: string; // "Surname, FirstName" format
  nationalRatings?: NationalRating[];
  pairingNumber: number;
  points: number; // computed from results
  rank: number; // computed from standings
  rating?: number;
  results: RoundResult[];
  sex?: Sex;
  title?: Title;
}

// ── NationalRating (TRF compat) ──────────────────────────────────────────
interface NationalRating {
  federation: string;
  nationalId?: string;
  pairingNumber: number;
  rating: number;
}

// ── Tournament ────────────────────────────────────────────────────────────
interface Tournament {
  // TRF-compatible fields
  chiefArbiter?: string;
  city?: string;
  deputyArbiters?: string[];
  endDate?: string;
  federation?: string;
  name?: string;
  numberOfPlayers?: number;
  players: Player[];
  roundDates?: string[];
  rounds: number; // count, not array
  startDate?: string;
  tiebreaks?: string[]; // string[] not Tiebreak[]
  timeControl?: string;
  tournamentType?: string;

  // TUNX-specific extensions (prefixed or grouped)
  _raw: RawTournament;
  currentRound?: number;
  header?: Header;
  pairings?: Pairing[][]; // indexed by round (0-based)
  roundTimes?: string[]; // parallel to roundDates
  subtitle?: string;
  venue?: string;
}
```

Remove: `Arbiter`, `DateRange`, `Result`, `ResultKind`, `Round`,
`PairingSystem`. Keep: `Header`, `RawTournament`, `Pairing`, `Title`, `Tiebreak`
(but Tiebreak becomes just documentation — Tournament.tiebreaks is string[]).
Add: `NationalRating`, `RoundResult`, `ResultCode`.

- [ ] **Step 1:** Rewrite `src/types.ts` with the new type definitions
- [ ] **Step 2:** Run `pnpm lint:types` — expect MANY errors (parse.ts,
      stringify.ts, create.ts, tests all break)
- [ ] **Step 3:** Commit: `refactor(types): align types with trf model`

---

### Task 2: Update parse.ts to produce TRF-compatible output

**Files:**

- Modify: `src/parse.ts`

Key changes:

- Player: combine `firstName + surname` → `"Surname, FirstName"` as `name`
- Player: `fideId` → `String(fideId)`
- Player: `sex` → `'w'` (was `'F'`) or `undefined`
- Player: compute `points` from pairing results
- Player: compute `rank` (sort by points descending, assign 1-based ranks)
- Player: `results` → `RoundResult[]` with `color: 'b'|'w'|'-'`,
  `opponentId: number|null`, `result: ResultCode`
- Player: wrap `nationalRating` into
  `nationalRatings: [{ federation, rating, pairingNumber }]`
- Tournament: flatten `dates` → `startDate`, `endDate`
- Tournament: flatten `arbiters` → `chiefArbiter`, `deputyArbiters`
- Tournament: `rounds` becomes count (number), dates go to `roundDates[]`
- Tournament: pairings go to `pairings[][]` (indexed by round)
- Tournament: round times go to `roundTimes[]`
- ResultKind → ResultCode mapping:
  - `'win'` → `'1'`, `'loss'` → `'0'`, `'draw'` → `'='`
  - `'forfeit-win'` → `'+'`, `'forfeit-loss'` → `'-'`
  - `'bye'` → `'U'`, `'half-bye'` → `'H'`, `'unpaired'` → `'Z'`
  - `'double-forfeit'` → `'Z'`

- [ ] **Step 1:** Update all imports and the return type construction
- [ ] **Step 2:** Add `computePoints()` helper (sum results per player)
- [ ] **Step 3:** Add `computeRanks()` helper (sort by points, assign ranks)
- [ ] **Step 4:** Run `pnpm lint:types` — should have fewer errors now
- [ ] **Step 5:** Commit: `refactor(parse): produce trf-compatible output`

---

### Task 3: Update stringify.ts to consume new types

**Files:**

- Modify: `src/stringify.ts`

Stringify reads from `_raw` for round-trip, so changes are minimal. But the
function signature and any field access needs updating.

- [ ] **Step 1:** Update imports and field access
- [ ] **Step 2:** Run `pnpm lint:types`
- [ ] **Step 3:** Commit: `refactor(stringify): consume trf-compatible types`

---

### Task 4: Update create.ts to produce new types

**Files:**

- Modify: `src/create.ts`

The `create()` function needs to produce the new Tournament shape. Also update
`CreateInput` and `CreatePlayer` to use the new conventions (or keep them as a
simpler input format and convert internally).

- [ ] **Step 1:** Update `CreatePlayer` — keep `firstName`+`surname` in input,
      combine in output
- [ ] **Step 2:** Update `create()` return value to match new Tournament shape
- [ ] **Step 3:** Run `pnpm lint:types`
- [ ] **Step 4:** Commit: `refactor(create): produce trf-compatible output`

---

### Task 5: Update index.ts exports

**Files:**

- Modify: `src/index.ts`

Remove old type exports, add new ones: `NationalRating`, `ResultCode`,
`RoundResult`. Remove: `Arbiter`, `DateRange`, `Result`, `ResultKind`, `Round`,
`PairingSystem`.

- [ ] **Step 1:** Update export list
- [ ] **Step 2:** Run `pnpm lint:types` — should pass now
- [ ] **Step 3:** Commit: `refactor(index): update exports for trf model`

---

### Task 6: Rewrite tests

**Files:**

- Modify: `src/__tests__/index.spec.ts`

Every assertion needs updating to match the new types. Key changes:

- `tournament.rounds[0].date` → `tournament.roundDates?.[0]`
- `tournament.rounds[0].time` → `tournament.roundTimes?.[0]`
- `tournament.rounds[0].pairings` → `tournament.pairings?.[0]`
- `tournament.dates?.start` → `tournament.startDate`
- `player.firstName` / `player.surname` → `player.name`
- `player.sex === 'F'` → `player.sex === 'w'`
- `player.fideId === 1503014` → `player.fideId === '1503014'`
- `player.results[0].kind` → `player.results[0].result`
- `tournament.arbiters[0].name` → `tournament.chiefArbiter`
- `tournament.tiebreaks[0]` — type widens to `string` but values stay same
- Round-trip tests: still verify `parse(stringify(t))` produces equivalent
  output
- Add `points` and `rank` assertions

- [ ] **Step 1:** Rewrite all test assertions
- [ ] **Step 2:** Run `pnpm test` — ALL should pass
- [ ] **Step 3:** Run `pnpm lint` — should pass
- [ ] **Step 4:** Run `pnpm build` — should pass
- [ ] **Step 5:** Commit: `test: rewrite tests for trf model alignment`

---

### Task 7: Update documentation

**Files:**

- Modify: `AGENTS.md` — update type descriptions
- Modify: `BACKLOG.md` — note the refactor

- [ ] **Step 1:** Update AGENTS.md project overview section
- [ ] **Step 2:** Update BACKLOG.md
- [ ] **Step 3:** Commit: `docs: update documentation for trf model alignment`
