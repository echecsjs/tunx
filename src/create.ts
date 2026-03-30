import {
  BYE_PLAYER_NUMBER,
  CONFIG_OFFSET_CURRENT_ROUND,
  CONFIG_OFFSET_END_DATE,
  CONFIG_OFFSET_PLAYER_COUNT,
  CONFIG_OFFSET_START_DATE,
  CONFIG_OFFSET_TOTAL_ROUNDS,
  METADATA,
  PAIRING_RECORD_SIZE,
  PLAYER_NUMERIC_BLOCK_SIZE,
  PLAYER_NUMERIC_OFFSET_FIDE_ID,
  PLAYER_NUMERIC_OFFSET_FIDE_RATING,
  PLAYER_NUMERIC_OFFSET_K_FACTOR,
  PLAYER_NUMERIC_OFFSET_NATIONAL_RATING,
  PLAYER_NUMERIC_OFFSET_SEX,
  PLAYER_STRINGS,
  PLAYER_STRING_COUNT,
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
    case 'unpaired': {
      return RESULT_CODE.UNPAIRED;
    }
    case 'win': {
      return RESULT_CODE.WHITE_WINS;
    }
    case 'draw': {
      return RESULT_CODE.DRAW;
    }
    case 'loss': {
      return RESULT_CODE.BLACK_WINS;
    }
    case 'forfeit-win': {
      return RESULT_CODE.WHITE_WINS_FORFEIT;
    }
    case 'forfeit-loss': {
      return RESULT_CODE.BLACK_WINS_FORFEIT;
    }
    case 'bye': {
      return RESULT_CODE.UNPLAYED;
    }
    case 'double-forfeit': {
      return 6;
    }
    case 'half-bye': {
      return 7;
    }
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
function buildPlayerStrings(player: CreatePlayer): string[] {
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
  for (let index = 4; index < templatePairingsSection.length - 3; index++) {
    if (
      templatePairingsSection[index] === d3Marker[0] &&
      templatePairingsSection[index + 1] === d3Marker[1] &&
      templatePairingsSection[index + 2] === d3Marker[2] &&
      templatePairingsSection[index + 3] === d3Marker[3]
    ) {
      trailerOffset = index;
      break;
    }
  }

  const trailer =
    trailerOffset === -1
      ? new Uint8Array(0)
      : templatePairingsSection.slice(trailerOffset);

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
    playerNumericBytes: input.players.map((p) => buildPlayerNumericBlock(p)),
    playerStrings: input.players.map((p) => buildPlayerStrings(p)),
  };

  // Build structured tournament data from input
  const players = input.players.map((p, index) => ({
    club: p.club,
    federation: p.federation,
    fideId: p.fideId,
    firstName: p.firstName,
    kFactor: p.kFactor,
    nationalId: p.nationalId,
    nationalRating: p.nationalRating,
    pairingNumber: index + 1,
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
