# Changelog

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
