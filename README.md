# @echecs/tunx

Parse and stringify [Swiss-Manager](https://swiss-manager.at/) `.TUNX` binary
tournament files. Zero dependencies, strict TypeScript, full round-trip
fidelity. Output types align with
[`@echecs/trf`](https://www.npmjs.com/package/@echecs/trf).

## Installation

```bash
npm install @echecs/tunx
```

## Quick Start

```typescript
import { parse } from '@echecs/tunx';
import { readFileSync } from 'node:fs';

// Parse a TUNX file
const buffer = new Uint8Array(readFileSync('tournament.TUNX'));
const tournament = parse(buffer);

if (tournament) {
  console.log(tournament.name); // "IV Elllobregat Open Chess Tmnt Grupo A"
  console.log(tournament.rounds); // 9
  console.log(tournament.players.length); // 210

  // Player data
  const player = tournament.players[0];
  console.log(player.name); // "Fedoseev, Vladimir"
  console.log(player.rating); // 2675
  console.log(player.fideId); // "24130737"
  console.log(player.title); // "GM"
  console.log(player.points); // 6.5
  console.log(player.rank); // 1
}
```

## API

### `parse(input, options?)`

Decode a TUNX binary buffer into a `Tournament` object.

```typescript
function parse(
  input: Uint8Array,
  options?: ParseOptions,
): Tournament | undefined;
```

- Returns `undefined` for unrecoverable failures (bad magic, missing markers).
- Calls `options.onError` before returning `undefined`.
- Calls `options.onWarning` for recoverable issues — parsing continues.
- Never throws.

### `ParseOptions`

```typescript
interface ParseOptions {
  onError?: (error: ParseError) => void;
  onWarning?: (warning: ParseWarning) => void;
}
```

### `ParseError`

```typescript
interface ParseError {
  message: string;
  offset?: number;
}
```

### `ParseWarning`

```typescript
interface ParseWarning {
  message: string;
  offset?: number;
}
```

## Types

Output types are compatible with
[`@echecs/trf`](https://www.npmjs.com/package/@echecs/trf).

### `Tournament`

```typescript
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
  rounds: number;
  startDate?: string;
  tiebreaks?: string[];
  timeControl?: string;
  tournamentType?: string;

  // TUNX-specific extensions
  currentRound?: number;
  header?: Header;
  pairings?: Pairing[][];
  roundTimes?: string[];
  subtitle?: string;
  venue?: string;
}
```

### `Player`

```typescript
interface Player {
  birthDate?: string;
  federation?: string;
  fideId?: string;
  name: string;
  nationalRatings?: NationalRating[];
  pairingNumber: number;
  points: number;
  rank: number;
  rating?: number;
  results: RoundResult[];
  sex?: Sex;
  title?: Title;
}
```

### `RoundResult`

```typescript
interface RoundResult {
  color: '-' | 'b' | 'w';
  opponentId: number | null;
  result: ResultCode;
  round: number;
}
```

### `Pairing`

Per-board pairing record, grouped by round in `Tournament.pairings`.

```typescript
interface Pairing {
  black: number;
  board: number;
  result?: ResultCode;
  white: number;
}
```

### `Header`

TUNX-specific header metadata. Available on `Tournament.header`.

```typescript
interface Header {
  installSignature: Uint8Array;
  installedAt?: Date;
  licenseHash: Uint8Array;
  savedAt?: Date;
  tournamentId: number;
}
```

### `NationalRating`

```typescript
interface NationalRating {
  birthDate?: string;
  classification?: string;
  federation: string;
  name?: string;
  nationalId?: string;
  origin?: string;
  pairingNumber: number;
  rating: number;
  sex?: Sex;
}
```

### `RawTournament`

Preserved binary chunks for byte-exact round-trip reconstruction. Internal type
— not exported from the package entry point. Available on `Tournament._raw`
after parsing.

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

### `ResultCode`

```typescript
type ResultCode =
  | '+'
  | '-'
  | '0'
  | '1'
  | '='
  | 'D'
  | 'F'
  | 'H'
  | 'L'
  | 'U'
  | 'W'
  | 'Z';
```

| Code | Meaning                   |
| ---- | ------------------------- |
| `1`  | Win                       |
| `0`  | Loss                      |
| `=`  | Draw                      |
| `+`  | Forfeit win               |
| `-`  | Forfeit loss              |
| `D`  | Draw by forfeit           |
| `F`  | Full-point bye            |
| `H`  | Half-point bye            |
| `L`  | Loss by forfeit (special) |
| `W`  | Win by forfeit (special)  |
| `Z`  | Zero-point bye / unpaired |
| `U`  | Unplayed                  |

### `Sex`

```typescript
type Sex = 'm' | 'w';
```

### `Tiebreak`

Known tiebreak identifiers used as values in `Tournament.tiebreaks`.

```typescript
type Tiebreak =
  | 'average-rating'
  | 'buchholz'
  | 'buchholz-cut-1'
  | 'buchholz-cut-2'
  | 'buchholz-cut-3'
  | 'direct-encounter'
  | 'koya'
  | 'median-buchholz'
  | 'number-of-wins'
  | 'performance-rating'
  | 'progressive'
  | 'sonneborn-berger';
```

### `Title`

```typescript
type Title = 'CM' | 'FM' | 'GM' | 'IM' | 'WCM' | 'WFM' | 'WGM' | 'WIM';
```

## TUNX Format

TUNX is the proprietary binary format used by
[Swiss-Manager](https://swiss-manager.at/). The format uses little-endian
integers and UTF-16LE strings with U16LE length prefixes.

### File Structure

1. **Header** (108 bytes) — magic `93 FF 89 44`, tournament ID, license data
2. **Metadata strings** — name, subtitle, arbiters, city, time control
3. **Config section** (`95 FF 89 44`) — rounds, players, dates, tiebreaks
4. **A3 sub-section** (`A3 FF 89 44`) — per-round schedule (dates, times)
5. **Player records** (`A5 FF 89 44`) — 30 strings + 110-byte numeric block
6. **Pairings** (`B3 FF 89 44`) — 21-byte records per pairing
7. **D3 section** (`D3 FF 89 44`) — section offset table
8. **E3 section** (`E3 FF 89 44`) — file terminator

## License

MIT
