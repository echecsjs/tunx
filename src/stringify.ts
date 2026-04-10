import BinaryWriter from './writer.js';

import type { RawTournament, Tournament } from './types.js';

interface RawTournamentInput extends Tournament {
  _raw: RawTournament;
}

/**
 * Reconstruct a TUNX binary file from a parsed `Tournament`.
 *
 * Requires `tournament._raw` to be present; throws a `RangeError` if missing.
 *
 * @param tournament - A `Tournament` produced by `parse()`.
 * @returns The raw bytes of the corresponding `.TUNX` file.
 */
export default function stringify(tournament: RawTournamentInput): Uint8Array {
  if (!tournament._raw) {
    throw new RangeError(
      'stringify() requires tournament._raw — only tournaments produced by parse() are supported',
    );
  }

  const raw = tournament._raw;
  const writer = new BinaryWriter();

  // 1. Header (108 bytes)
  writer.writeBytes(raw.headerBytes);

  // 2. Metadata strings — each re-encoded as U16LE-prefixed UTF-16LE
  for (const string_ of raw.metadataStrings) {
    writer.writeString(string_);
  }

  // 3. Config section bytes (includes config marker + A3 sub-section,
  //    up to but not including the player section marker)
  writer.writeBytes(raw.configBytes);

  // 4. Player section marker + player records
  //    Player section: marker (A5 FF 89 44) followed by string/numeric blocks
  for (let index = 0; index < raw.playerStrings.length; index++) {
    const strings = raw.playerStrings[index];
    const numericBytes = raw.playerNumericBytes[index];

    if (strings === undefined || numericBytes === undefined) {
      continue;
    }

    // Write player section marker before the first player only
    if (index === 0) {
      writer.writeBytes(new Uint8Array([0xa5, 0xff, 0x89, 0x44]));
    }

    for (const string_ of strings) {
      writer.writeString(string_);
    }

    writer.writeBytes(numericBytes);
  }

  // Handle case of zero players — still need the player section marker
  if (raw.playerStrings.length === 0) {
    writer.writeBytes(new Uint8Array([0xa5, 0xff, 0x89, 0x44]));
  }

  // 5. Pairings section — stored verbatim from the original file.
  //    This raw slice begins with the pairings marker (B3 FF 89 44) and
  //    includes all pairing records plus any trailing sections (D3, E3).
  writer.writeBytes(raw.pairingsSection);

  return writer.toUint8Array();
}
