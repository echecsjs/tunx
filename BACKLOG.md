# Backlog

Last updated: 2026-04-04

## Done

- [x] ~~Decode remaining header fields.~~ Decoded: tournamentId, savedAt,
      installedAt, licenseHash, installSignature.
- [x] ~~Decode remaining player numeric fields.~~ Decoded: sex, nationalRating,
      kFactor, alphabeticalIndex, ratingDelta, ratingPeriod, categoryId,
      registrationId.
- [x] ~~Decode config section (dates, pairing system, tiebreak settings).~~
      Decoded: startDate, endDate, currentRound, round dates, tiebreaks (11
      codes mapped), round start times from A3 sub-section.
- [x] ~~Add NPM_TOKEN secret to GitHub repo.~~
- [x] ~~Decode additional result codes.~~ Added code 0 = unpaired.
- [x] ~~Support creating TUNX files from scratch.~~ Template-based
      `create(template, input)` function added.
- [x] ~~Add Buchholz Cut 2/3 tiebreak types.~~
- [x] ~~Decode D3/E3 sections.~~ D3 = section offset table (4 U32LE pointers),
      E3 = file terminator (always empty). Documented in AGENTS.md.
- [x] ~~Decode header 0x24.~~ Per-installation tournament counter — not exposed
      on the API as it's internal to SwissManager.
- [x] ~~Align output types with @echecs/trf model.~~ Tournament, Player, and
      Result types restructured. Player.name combined, sex uses 'm'/'w', fideId
      is string, results use ResultCode, Tournament has flat structure with
      roundDates/pairings arrays.

## Residual unknowns

- [ ] Config 0x15 field (values 0–3 across 37 files from 11 countries, does not
      correlate with pairing system, rating mode, player categories, age groups,
      time control, or federation). Exhaustively tested — unknown.
- [ ] Config middle section (~5700 bytes of mostly zeros with sparse data at
      0x96, 0x280, 0x338, 0x4E5).
- [ ] Player numeric 0x20 (group/sub-category — non-zero in 2/698 players) and
      0x36 (team ID — non-zero in 5/698 players). Too sparse to expose
      confidently.
- [ ] Pairing system detection (Swiss vs Round Robin). Currently hardcoded to
      `'dutch'`. The binary field is unknown — chess-results shows tournament
      type but we can't map it to a config byte.
