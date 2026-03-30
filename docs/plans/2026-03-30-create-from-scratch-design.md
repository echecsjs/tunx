# Create TUNX from Scratch — Design

Date: 2026-03-30

## Goal

Support creating TUNX files from scratch for importing tournament data from
other formats (TRF, etc.) into SwissManager. Use a template-based approach: an
existing parsed TUNX provides the binary scaffolding (license bytes, config
structure), while the user provides the new tournament data.

## API

```typescript
function create(template: Tournament, input: CreateInput): Tournament;
```

Returns a new `Tournament` with `_raw` populated, ready for `stringify()`.

### CreateInput

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

interface CreatePairing {
  black: number;
  result: ResultKind;
  white: number;
}
```

## What Comes from the Template

| Component      | Source                          | Notes                                               |
| -------------- | ------------------------------- | --------------------------------------------------- |
| headerBytes    | Template verbatim               | Preserves license hash and install signature        |
| configBytes    | Template as base                | Patch totalRounds, playerCount, currentRound, dates |
| D3/E3 trailers | Template's pairingsSection tail | Everything after the pairing records                |

## What's Generated from Input

| Component          | Source        | Notes                                                            |
| ------------------ | ------------- | ---------------------------------------------------------------- |
| metadataStrings    | input fields  | name, subtitle, arbiters, venue, etc. mapped to string indices   |
| playerStrings      | input.players | 30 strings per player; map firstName, surname, title, club, etc. |
| playerNumericBytes | input.players | 110 bytes per player; encode sex, rating, fideId, kFactor, etc.  |
| pairingRecords     | input.rounds  | 21 bytes per pairing record                                      |

## Implementation Approach

### Config Patching

Take the template's `configBytes` and patch specific offsets:

- 0x04 (within config, after marker): totalRounds (U16LE)
- 0x15 (current round): set to input.rounds.length
- 0x17 (player count): set to input.players.length
- 0x4B (start date): from input.dates
- 0x4F (end date): from input.dates

Note: offsets are relative to config section start (including 4-byte marker).

### Metadata String Generation

Map CreateInput fields to the 21 metadata string indices:

- [0] name, [1] subtitle (short), [2] subtitle (long)
- [3] chief arbiter, [4] deputy arbiter, [6] other arbiters
- [5] venue, [10] city, [14] time control, [20] federation

### Player String Generation

Map CreatePlayer fields to the 30 player string indices:

- [0] surname, [1] firstName, [3] short name (auto-generated)
- [4] title, [5] nationalId, [9] club, [10] federation

### Player Numeric Block Generation

110-byte block per player. Write known fields at their offsets:

- 0x06: sex (U8, 1=F, 0=M)
- 0x08: FIDE rating (U16LE)
- 0x0A: national rating (U16LE)
- 0x18: FIDE ID (U32LE)
- 0x3A: K-factor (U16LE)

Zero-fill all unknown bytes.

### Pairing Section Generation

Build pairing records (21 bytes each):

- Bytes 0-1: white player number (U16LE)
- Bytes 2-3: black player number (U16LE, 0xFFFE for bye)
- Bytes 4-5: result code (U16LE)
- Bytes 6-20: zero

Prepend pairings marker `B3 FF 89 44`. Append the D3/E3 trailer from the
template (extracted by finding D3 marker in template's pairingsSection).

### Result Code Mapping (reverse of mapResultCode)

| ResultKind     | Code          |
| -------------- | ------------- |
| unpaired       | 0             |
| win            | 1             |
| draw           | 2             |
| loss           | 3             |
| forfeit-win    | 4             |
| forfeit-loss   | 5             |
| bye            | 9             |
| double-forfeit | 6 (tentative) |
| half-bye       | 7 (tentative) |

## Error Handling

- `create()` throws `RangeError` if template has no `_raw`
- `create()` throws `RangeError` if input has no players
- `create()` throws `RangeError` if input has no rounds

## Testing

- Create a tournament from template + new data, stringify it, parse it back,
  verify all fields match
- Verify the created file starts with the template's header bytes
- Verify player data is correctly encoded
- Verify pairing data is correctly encoded
- Round-trip: create → stringify → parse → verify fields

## Exports

- Export `create` from `src/index.ts`
- Export `CreateInput`, `CreatePairing`, `CreatePlayer`, `CreateRound` types

## File Structure

- `src/create.ts` — the `create()` function
- `src/types.ts` — new Create\* interfaces
- `src/index.ts` — re-export
