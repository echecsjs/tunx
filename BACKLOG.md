# Backlog

Last updated: 2026-03-30

## Medium

- [x] ~~Decode remaining header fields (bytes 0x08–0x1B checksum algorithm).~~
      Decoded: tournamentId, savedAt, installedAt, licenseHash,
      installSignature. Bytes 0x04, 0x24, 0x28–0x2F remain undetermined.
- [x] ~~Decode remaining player numeric fields (110 bytes, only rating and FIDE
      ID mapped).~~ Decoded: sex, nationalRating, kFactor, alphabeticalIndex,
      ratingDelta, ratingPeriod, categoryId, registrationId. ~70 bytes remain as
      zero-padding.
- [ ] Decode config section fully (dates, pairing system, tiebreak settings).
- [ ] Add `NPM_TOKEN` secret to GitHub repo and verify npm publish.

## Low

- [ ] Decode additional result codes beyond 1–5, 9.
- [ ] Support creating TUNX files from scratch (currently requires `_raw` from a
      parsed file).
