# Changelog

## 1.0.1 — 2026-05-28

### Fixed

- `parse()` now returns `null` instead of `undefined` on failure, aligning with
  `@echecs/fen` and `@echecs/trf`.

## 1.0.0 — 2026-05-25

### Changed

- **BREAKING:** `parse()` now returns `TournamentData | undefined` from
  `@echecs/tournament` instead of the tunx-specific `Tournament` type.
- Player `pairingNumber` replaced by `id` (string) and `startingRank` (number).
- Per-player `RoundResult[]` converted to `CompletedRound[]` with `Game[]` and
  `Bye[]`.
- Metadata (`name`, `city`, `federation`, etc.) moved to `TournamentMetadata`.
- Added `@echecs/tournament` as runtime dependency.

### Removed

- Tunx-specific type exports: `Tournament`, `Player`, `RoundResult`, `Pairing`,
  `Header`, `ResultCode`, `Sex`, `Title`, `Tiebreak`.
- Format-specific fields: `header`, `pairings[][]`, `venue`, `subtitle`,
  `roundTimes`, `currentRound`.

## 0.3.0 — 2026-04-19

### Added

- `tournamentType` populated from config byte `0x0B` — detects `'swiss'`,
  `'round-robin'`, and `'team-round-robin'`.

### Removed

- Deleted dead `stringify()` and `BinaryWriter` code left behind after v0.2.0
  dropped `_raw`.
- Removed `RawTournament` type (was not re-exported from the package entry
  point).
- Removed six unused player numeric offset constants.

## 0.2.0 — 2026-04-11

### Changed

- `RoundResult.opponentId` changed from `?: number` to `number | null` to match
  `@echecs/trf`.
- `ResultCode` now includes `'L'` (loss), matching `@echecs/trf`.
- `NationalRating` now includes `birthDate`, `classification`, `name`, `origin`,
  and `sex` optional fields, matching `@echecs/trf`.

### Removed

- `stringify()` is no longer exported — will return once config byte generation
  is supported.
- `_raw` and `RawTournament` removed from the public `Tournament` type.

## 0.1.2 — 2026-04-09

### Fixed

- Added missing `D` and `W` descriptions to the `ResultCode` meaning table.

## 0.1.1 — 2026-04-04

### Added

- `parse(input, options?)` decodes TUNX binary files into a `Tournament` object.
- `stringify(tournament)` re-encodes a parsed tournament with byte-for-byte
  fidelity.
- Output types align with the `@echecs/trf` model (`Player.name`, `RoundResult`,
  `ResultCode`, etc.).
- Decoded header fields: `tournamentId`, `savedAt`, `installedAt`,
  `licenseHash`, `installSignature`.
- Decoded player fields: `sex`, `rating`, `nationalRatings`, `fideId`, `title`,
  `federation`, `points`, `rank`.
- Decoded config fields: `startDate`, `endDate`, `currentRound`, `roundDates`,
  `tiebreaks` (11 codes), `roundTimes`.
- 11 tiebreak codes mapped (Buchholz, Sonneborn-Berger, etc.).
- Result code 0 mapped as unpaired (`'Z'`).
