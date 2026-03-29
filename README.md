# @echecs/tunx

Parse and stringify SwissManager `.TUNX` binary tournament files. Zero
dependencies, strict TypeScript, full round-trip fidelity.

## Installation

```bash
npm install @echecs/tunx
```

## Quick Start

```typescript
import { parse, stringify } from '@echecs/tunx';
import { readFileSync, writeFileSync } from 'node:fs';

// Parse a TUNX file
const buffer = new Uint8Array(readFileSync('tournament.TUNX').buffer);
const tournament = parse(buffer);

if (tournament) {
  console.log(tournament.name); // "IV Elllobregat Open Chess Tmnt Grupo A"
  console.log(tournament.players.length); // 210
  console.log(tournament.rounds.length); // 9

  // Access player data
  const player = tournament.players[0];
  console.log(player.surname); // "Fedoseev"
  console.log(player.firstName); // "Vladimir"
  console.log(player.rating); // 2675
  console.log(player.fideId); // 24130737
  console.log(player.title); // "GM"

  // Round-trip: write back to TUNX
  const output = stringify(tournament);
  writeFileSync('tournament-copy.TUNX', output);
}
```

## API

### `parse(input, options?)`

Parse a TUNX binary buffer into a `Tournament` object.

```typescript
function parse(
  input: Uint8Array,
  options?: ParseOptions,
): Tournament | undefined;
```

- Returns `undefined` if the magic bytes don't match or the structure is fatally
  corrupted.
- Calls `options.onError` before returning `undefined` so consumers know why.
- Calls `options.onWarning` for recoverable issues (unexpected data, truncated
  records) — parsing continues.
- Never throws.

### `stringify(tournament)`

Serialize a `Tournament` object back to TUNX binary.

```typescript
function stringify(tournament: Tournament): Uint8Array;
```

- Requires `tournament._raw` (populated by `parse`) for byte-exact
  reconstruction.
- Throws `RangeError` if `_raw` is missing.
- Produces output identical to the original input: `stringify(parse(input))` ===
  `input`.

### `ParseOptions`

```typescript
interface ParseOptions {
  onError?: (error: ParseError) => void;
  onWarning?: (warning: ParseWarning) => void;
}
```

### `Tournament`

```typescript
interface Tournament {
  _raw: RawTournament;
  arbiters: Arbiter[];
  city?: string;
  dates?: DateRange;
  federation?: string;
  name: string;
  pairingSystem: PairingSystem;
  players: Player[];
  rounds: Round[];
  subtitle?: string;
  tiebreaks: Tiebreak[];
  timeControl?: string;
  venue?: string;
}
```

### `Player`

```typescript
interface Player {
  birthYear?: number;
  club?: string;
  federation?: string;
  fideId?: number;
  firstName: string;
  group?: string;
  nationalId?: string;
  pairingNumber: number;
  rating?: number;
  results: Result[];
  sex?: 'F' | 'M';
  surname: string;
  title?: Title;
}
```

### `Round`

```typescript
interface Round {
  date?: string;
  number: number;
  pairings: Pairing[];
}
```

### `Pairing`

```typescript
interface Pairing {
  black: number;
  board: number;
  result?: ResultKind;
  white: number;
}
```

### `Result`

```typescript
interface Result {
  color?: 'black' | 'white';
  kind: ResultKind;
  opponent?: number;
  round: number;
}
```

### Types

```typescript
type ResultKind =
  | 'bye'
  | 'double-forfeit'
  | 'draw'
  | 'forfeit-loss'
  | 'forfeit-win'
  | 'half-bye'
  | 'loss'
  | 'unpaired'
  | 'win';

type Title = 'CM' | 'FM' | 'GM' | 'IM' | 'WCM' | 'WFM' | 'WGM' | 'WIM';
type PairingSystem = 'burstein' | 'dutch' | 'lim' | 'round-robin';
```

## TUNX Format

TUNX is the proprietary binary format used by
[Swiss-Manager](https://swiss-manager.at/) for tournament files. The format uses
UTF-16LE strings with U16LE length prefixes and little-endian integers
throughout.

### File Structure

1. **Header** (108 bytes) — magic bytes `93 FF 89 44`, checksum block,
   tournament ID
2. **Metadata strings** — tournament name, subtitle, arbiters, city, time
   control, federation
3. **Config section** (marker `95 FF 89 44`) — round count, player count,
   pairing settings
4. **Player records** (marker `A5 FF 89 44`) — 30 strings + 110-byte numeric
   block per player
5. **Pairings** (marker `B3 FF 89 44`) — 21-byte records with white/black
   pairing numbers and result codes

## License

MIT
