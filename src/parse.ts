import {
  BYE_PLAYER_NUMBER,
  CONFIG_MARKER,
  CONFIG_OFFSET_CURRENT_ROUND,
  CONFIG_OFFSET_END_DATE,
  CONFIG_OFFSET_PLAYER_COUNT,
  CONFIG_OFFSET_START_DATE,
  CONFIG_OFFSET_TIEBREAK_CODES,
  CONFIG_OFFSET_TIEBREAK_COUNT,
  CONFIG_OFFSET_TOTAL_ROUNDS,
  HEADER_INSTALLED_AT_OFFSET,
  HEADER_INSTALL_SIGNATURE_OFFSET,
  HEADER_INSTALL_SIGNATURE_SIZE,
  HEADER_LICENSE_HASH_OFFSET,
  HEADER_LICENSE_HASH_SIZE,
  HEADER_SAVED_AT_OFFSET,
  HEADER_SIZE,
  HEADER_TOURNAMENT_ID_OFFSET,
  MAGIC,
  METADATA,
  METADATA_OFFSET,
  PAIRINGS_MARKER,
  PAIRING_RECORD_SIZE,
  PLAYER_MARKER,
  PLAYER_NUMERIC_BLOCK_SIZE,
  PLAYER_NUMERIC_OFFSET_FIDE_ID,
  PLAYER_NUMERIC_OFFSET_FIDE_RATING,
  PLAYER_NUMERIC_OFFSET_NATIONAL_RATING,
  PLAYER_NUMERIC_OFFSET_SEX,
  PLAYER_STRINGS,
  PLAYER_STRING_COUNT,
  RESULT_CODE,
  TIEBREAK_CODE,
} from './constants.js';
import BinaryReader from './reader.js';

import type {
  Header,
  NationalRating,
  Pairing,
  ParseOptions,
  Player,
  ResultCode,
  RoundResult,
  Tiebreak,
  Title,
  Tournament,
} from './types.js';

/** Search for a 4-byte little-endian marker in the buffer. */
function findMarker(buffer: Uint8Array, marker: number): number {
  const b0 = (marker >>> 0) & 0xff;
  const b1 = (marker >>> 8) & 0xff;
  const b2 = (marker >>> 16) & 0xff;
  const b3 = (marker >>> 24) & 0xff;

  for (let index = 0; index <= buffer.length - 4; index++) {
    if (
      buffer[index] === b0 &&
      buffer[index + 1] === b1 &&
      buffer[index + 2] === b2 &&
      buffer[index + 3] === b3
    ) {
      return index;
    }
  }

  return -1;
}

/**
 * Map a TUNX result code to a ResultCode from WHITE's perspective.
 * Returns undefined for unknown codes.
 */
function mapResultCode(code: number): ResultCode | undefined {
  switch (code) {
    case RESULT_CODE.UNPAIRED: {
      return 'Z';
    }
    case RESULT_CODE.WHITE_WINS: {
      return '1';
    }
    case RESULT_CODE.DRAW: {
      return '=';
    }
    case RESULT_CODE.BLACK_WINS: {
      return '0';
    }
    case RESULT_CODE.WHITE_WINS_FORFEIT: {
      return '+';
    }
    case RESULT_CODE.BLACK_WINS_FORFEIT: {
      return '-';
    }
    case RESULT_CODE.UNPLAYED: {
      return 'F';
    }
    default: {
      return undefined;
    }
  }
}

/** Flip a result code from white's perspective to black's perspective. */
function flipResultCode(code: ResultCode): ResultCode {
  switch (code) {
    case '1': {
      return '0';
    }
    case '0': {
      return '1';
    }
    case '+': {
      return '-';
    }
    case '-': {
      return '+';
    }
    default: {
      return code;
    }
  }
}

/** Compute points earned from a ResultCode. */
function pointsFromResult(code: ResultCode): number {
  switch (code) {
    case '1':
    case '+':
    case 'W': {
      return 1;
    }
    case '=':
    case 'H':
    case 'D': {
      return 0.5;
    }
    default: {
      return 0;
    }
  }
}

/** Extract a non-empty string or return undefined. */
function nonEmpty(value: string): string | undefined {
  return value.length > 0 ? value : undefined;
}

/** Cast a string to Title if it is a recognised title, else return undefined. */
function toTitle(value: string): Title | undefined {
  const valid: Title[] = ['CM', 'FM', 'GM', 'IM', 'WCM', 'WFM', 'WGM', 'WIM'];
  return valid.includes(value as Title) ? (value as Title) : undefined;
}

/** Convert a YYYYMMDD integer to a UTC Date, or `undefined` if zero. */
function parseDate(yyyymmdd: number): Date | undefined {
  if (yyyymmdd === 0) {
    return undefined;
  }

  const year = Math.floor(yyyymmdd / 10_000);
  const month = Math.floor((yyyymmdd % 10_000) / 100);
  const day = yyyymmdd % 100;

  return new Date(Date.UTC(year, month - 1, day));
}

/** Format a YYYYMMDD integer as an ISO date string (YYYY-MM-DD). */
function formatDate(yyyymmdd: number): string | undefined {
  if (yyyymmdd === 0) {
    return undefined;
  }

  const year = Math.floor(yyyymmdd / 10_000);
  const month = Math.floor((yyyymmdd % 10_000) / 100);
  const day = yyyymmdd % 100;

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Parse a TUNX binary tournament file.
 *
 * @param input - Raw bytes of the `.TUNX` file.
 * @param options - Optional error/warning callbacks.
 * @returns Parsed `Tournament`, or `undefined` if the file is invalid.
 */
export default function parse(
  input: Uint8Array,
  options?: ParseOptions,
): Tournament | undefined {
  const onError = options?.onError;
  const onWarning = options?.onWarning;

  // ── 1. Validate magic ────────────────────────────────────────────────────
  if (input.length < HEADER_SIZE) {
    onError?.({ message: 'File too short to be a TUNX file', offset: 0 });
    return undefined;
  }

  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
  const magic = view.getUint32(0, true);

  if (magic !== MAGIC) {
    onError?.({
      message: `Invalid magic: expected 0x${MAGIC.toString(16)}, got 0x${magic.toString(16)}`,
      offset: 0,
    });
    return undefined;
  }

  // ── 2. Read header bytes ─────────────────────────────────────────────────
  const headerBytes = input.slice(0, HEADER_SIZE);

  // ── 2b. Decode header fields ─────────────────────────────────────────────
  const licenseHash = headerBytes.slice(
    HEADER_LICENSE_HASH_OFFSET,
    HEADER_LICENSE_HASH_OFFSET + HEADER_LICENSE_HASH_SIZE,
  );
  const savedAt = parseDate(view.getUint32(HEADER_SAVED_AT_OFFSET, true));
  const tournamentId = view.getUint32(HEADER_TOURNAMENT_ID_OFFSET, true);
  const installedAt = parseDate(
    view.getUint32(HEADER_INSTALLED_AT_OFFSET, true),
  );
  const installSignature = headerBytes.slice(
    HEADER_INSTALL_SIGNATURE_OFFSET,
    HEADER_INSTALL_SIGNATURE_OFFSET + HEADER_INSTALL_SIGNATURE_SIZE,
  );

  const header: Header = {
    installSignature,
    installedAt,
    licenseHash,
    savedAt,
    tournamentId,
  };

  // ── 3. Locate section markers ────────────────────────────────────────────
  const configMarkerOffset = findMarker(input, CONFIG_MARKER);

  if (configMarkerOffset === -1) {
    onError?.({
      message: 'Config section marker not found',
      offset: METADATA_OFFSET,
    });
    return undefined;
  }

  const playerMarkerOffset = findMarker(input, PLAYER_MARKER);

  if (playerMarkerOffset === -1) {
    onError?.({ message: 'Player section marker not found' });
    return undefined;
  }

  const pairingsMarkerOffset = findMarker(input, PAIRINGS_MARKER);

  if (pairingsMarkerOffset === -1) {
    onError?.({ message: 'Pairings section marker not found' });
    return undefined;
  }

  // ── 4. Read metadata strings (0x6C → configMarker) ──────────────────────
  const metadataReader = new BinaryReader(
    input.slice(METADATA_OFFSET, configMarkerOffset),
  );
  const metadataStrings: string[] = [];

  while (metadataReader.remaining >= 2) {
    metadataStrings.push(metadataReader.readString());
  }

  // ── 5. Read config section bytes (including marker) ──────────────────────
  const configBytes = input.slice(configMarkerOffset, playerMarkerOffset);
  const configDataOffset = 4; // skip the 4-byte marker

  const configView = new DataView(
    configBytes.buffer,
    configBytes.byteOffset,
    configBytes.byteLength,
  );

  const totalRounds = configView.getUint16(
    configDataOffset + CONFIG_OFFSET_TOTAL_ROUNDS,
    true,
  );
  const playerCount = configView.getUint16(
    configDataOffset + CONFIG_OFFSET_PLAYER_COUNT,
    true,
  );

  const currentRound = configView.getUint8(
    configDataOffset + CONFIG_OFFSET_CURRENT_ROUND,
  );

  const startDateRaw = configView.getUint32(
    configDataOffset + CONFIG_OFFSET_START_DATE,
    true,
  );
  const endDateRaw = configView.getUint32(
    configDataOffset + CONFIG_OFFSET_END_DATE,
    true,
  );
  const startDate = formatDate(startDateRaw);
  const endDate = formatDate(endDateRaw);

  // ── Tiebreaks ────────────────────────────────────────────────────────────
  const tiebreakCount = configView.getUint8(
    configDataOffset + CONFIG_OFFSET_TIEBREAK_COUNT,
  );

  const tiebreaks: string[] = [];
  for (let index = 0; index < tiebreakCount && index < 5; index++) {
    const code = configView.getUint16(
      configDataOffset + CONFIG_OFFSET_TIEBREAK_CODES + index * 2,
      true,
    );
    const lowByte = (code >> 8) & 0xff;
    const mapped: Tiebreak | undefined =
      TIEBREAK_CODE[lowByte as keyof typeof TIEBREAK_CODE];
    if (mapped !== undefined) {
      tiebreaks.push(mapped);
    }
  }

  if (totalRounds === 0) {
    onWarning?.({
      message: 'Total rounds is 0',
      offset: configMarkerOffset + 4,
    });
  }

  if (playerCount === 0) {
    onWarning?.({
      message: 'Player count is 0',
      offset: configMarkerOffset + 4 + CONFIG_OFFSET_PLAYER_COUNT,
    });
  }

  // ── 6. Read player section ───────────────────────────────────────────────
  const playerSectionStart = playerMarkerOffset + 4;
  const playerReader = new BinaryReader(
    input.slice(playerSectionStart, pairingsMarkerOffset),
  );

  const playerStrings: string[][] = [];
  const playerNumericBytes: Uint8Array[] = [];

  for (let index = 0; index < playerCount; index++) {
    if (playerReader.remaining < 2) {
      onWarning?.({
        message: `Expected ${playerCount} players, only parsed ${index}`,
      });
      break;
    }

    const strings: string[] = [];

    for (let s = 0; s < PLAYER_STRING_COUNT; s++) {
      if (playerReader.remaining < 2) {
        onWarning?.({
          message: `Player ${index + 1}: unexpected end of data while reading strings`,
        });
        strings.push('');
        continue;
      }
      strings.push(playerReader.readString());
    }

    playerStrings.push(strings);

    if (playerReader.remaining < PLAYER_NUMERIC_BLOCK_SIZE) {
      onWarning?.({
        message: `Player ${index + 1}: unexpected end of data while reading numeric block`,
      });
      playerNumericBytes.push(new Uint8Array(PLAYER_NUMERIC_BLOCK_SIZE));
      continue;
    }

    playerNumericBytes.push(playerReader.readBytes(PLAYER_NUMERIC_BLOCK_SIZE));
  }

  // ── 7. Read pairings section ─────────────────────────────────────────────
  const pairingSectionStart = pairingsMarkerOffset + 4;
  const pairingData = input.slice(pairingSectionStart);
  const totalPairingRecords = Math.floor(
    pairingData.length / PAIRING_RECORD_SIZE,
  );
  // ── 8. Build structured data ─────────────────────────────────────────────

  // Players
  const players: Player[] = [];

  for (const [index, strings] of playerStrings.entries()) {
    const numericBlock = playerNumericBytes[index];

    if (strings === undefined || numericBlock === undefined) {
      continue;
    }

    const numericView = new DataView(
      numericBlock.buffer,
      numericBlock.byteOffset,
      numericBlock.byteLength,
    );

    const sexByte = numericBlock[PLAYER_NUMERIC_OFFSET_SEX];
    const fideRating = numericView.getUint16(
      PLAYER_NUMERIC_OFFSET_FIDE_RATING,
      true,
    );
    const nationalRating = numericView.getUint16(
      PLAYER_NUMERIC_OFFSET_NATIONAL_RATING,
      true,
    );

    const fideId = numericView.getUint32(PLAYER_NUMERIC_OFFSET_FIDE_ID, true);

    const surname = strings[PLAYER_STRINGS.SURNAME] ?? '';
    const firstName = strings[PLAYER_STRINGS.FIRST_NAME] ?? '';
    const titleRaw = strings[PLAYER_STRINGS.TITLE] ?? '';
    const federation = strings[PLAYER_STRINGS.FEDERATION] ?? '';
    const nationalId = strings[PLAYER_STRINGS.NATIONAL_ID] ?? '';

    const name = firstName.length > 0 ? `${surname}, ${firstName}` : surname;

    const nationalRatings: NationalRating[] | undefined =
      nationalRating > 0
        ? [
            {
              federation: federation || '',
              nationalId: nonEmpty(nationalId),
              pairingNumber: index + 1,
              rating: nationalRating,
            },
          ]
        : undefined;

    const player: Player = {
      federation: nonEmpty(federation),
      fideId: fideId > 0 ? String(fideId) : undefined,
      name,
      nationalRatings,
      pairingNumber: index + 1,
      points: 0,
      rank: 0,
      rating:
        fideRating > 0
          ? fideRating
          : nationalRating > 0
            ? nationalRating
            : undefined,
      results: [],
      sex: sexByte === 1 ? 'w' : undefined,
      title: toTitle(titleRaw),
    };

    players.push(player);
  }

  // Rounds and pairings
  const roundDates: string[] = [];
  const roundTimes: string[] = [];
  const pairingsPerRound = playerCount > 0 ? Math.ceil(playerCount / 2) : 0;
  const allPairings: Pairing[][] = [];

  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex++) {
    const roundPairings: Pairing[] = [];

    const startPairing = roundIndex * pairingsPerRound;
    const endPairing = Math.min(
      startPairing + pairingsPerRound,
      totalPairingRecords,
    );

    for (
      let pairingIndex = startPairing;
      pairingIndex < endPairing;
      pairingIndex++
    ) {
      const offset = pairingIndex * PAIRING_RECORD_SIZE;

      if (offset + PAIRING_RECORD_SIZE > pairingData.length) {
        break;
      }

      const pairingView = new DataView(
        pairingData.buffer,
        pairingData.byteOffset + offset,
        PAIRING_RECORD_SIZE,
      );
      const white = pairingView.getUint16(0, true);
      const black = pairingView.getUint16(2, true);
      const resultCode = pairingView.getUint16(4, true);
      const whiteResultCode = mapResultCode(resultCode);

      const pairing: Pairing = {
        black: black === BYE_PLAYER_NUMBER ? 0 : black,
        board: pairingIndex - startPairing + 1,
        result: whiteResultCode,
        white,
      };

      roundPairings.push(pairing);

      // Populate player results
      const whitePlayer = players[white - 1];
      const blackPlayer =
        black === BYE_PLAYER_NUMBER ? undefined : players[black - 1];

      if (whitePlayer !== undefined && whiteResultCode !== undefined) {
        const whiteResult: RoundResult = {
          color: 'w',
          // eslint-disable-next-line unicorn/no-null
          opponentId: black === BYE_PLAYER_NUMBER ? null : black,
          result: whiteResultCode,
          round: roundIndex + 1,
        };

        whitePlayer.results.push(whiteResult);
      }

      if (blackPlayer !== undefined && whiteResultCode !== undefined) {
        const blackResultCode = flipResultCode(whiteResultCode);

        const blackResult: RoundResult = {
          color: 'b',
          opponentId: white,
          result: blackResultCode,
          round: roundIndex + 1,
        };

        blackPlayer.results.push(blackResult);
      }
    }

    allPairings.push(roundPairings);
  }

  // ── 8b. Extract round dates from config section ──────────────────────────
  const configDataView = new DataView(
    configBytes.buffer,
    configBytes.byteOffset,
    configBytes.byteLength,
  );

  // Scan for first date in round block area (after offset 0x1000 from config data start)
  let roundBlockDateOffset = -1;
  const scanStart = configDataOffset + 0x10_00;

  for (let index = scanStart; index < configBytes.byteLength - 3; index++) {
    const value = configDataView.getUint32(index, true);

    if (value >= 20_000_101 && value <= 20_991_231) {
      const month = Math.floor((value % 10_000) / 100);
      const day = value % 100;

      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        roundBlockDateOffset = index;
        break;
      }
    }
  }

  if (roundBlockDateOffset !== -1 && totalRounds >= 2) {
    // Find the second round's date to compute block size.
    let secondDateOffset = -1;

    for (
      let index = roundBlockDateOffset + 32;
      index < configBytes.byteLength - 3;
      index++
    ) {
      const value = configDataView.getUint32(index, true);

      if (value >= 20_000_101 && value <= 20_991_231) {
        const month = Math.floor((value % 10_000) / 100);
        const day = value % 100;

        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          secondDateOffset = index;
          break;
        }
      }
    }

    if (secondDateOffset !== -1) {
      const blockSize = secondDateOffset - roundBlockDateOffset;

      for (let roundIndex = 0; roundIndex < totalRounds; roundIndex++) {
        const dateOffset = roundBlockDateOffset + roundIndex * blockSize;

        if (dateOffset + 4 <= configBytes.byteLength) {
          const dateValue = configDataView.getUint32(dateOffset, true);
          const dateString = formatDate(dateValue);

          if (dateString !== undefined) {
            roundDates[roundIndex] = dateString;
          }
        }
      }
    }
  } else if (roundBlockDateOffset !== -1 && totalRounds === 1) {
    // Single round — use the found date directly
    const dateValue = configDataView.getUint32(roundBlockDateOffset, true);
    const dateString = formatDate(dateValue);

    if (dateString !== undefined) {
      roundDates[0] = dateString;
    }
  }

  // ── 8c. Extract round start times from A3 sub-section ────────────────────
  // Find A3 marker within config bytes
  let a3Offset = -1;
  for (let index = 0; index < configBytes.byteLength - 3; index++) {
    if (
      configBytes[index] === 0xa3 &&
      configBytes[index + 1] === 0xff &&
      configBytes[index + 2] === 0x89 &&
      configBytes[index + 3] === 0x44
    ) {
      a3Offset = index + 4; // skip marker
      break;
    }
  }

  if (a3Offset !== -1) {
    let a3Pos = a3Offset;
    for (let roundIndex = 0; roundIndex < totalRounds; roundIndex++) {
      // Read string: U16LE char count + chars
      if (a3Pos + 2 > configBytes.byteLength) break;
      const charCount = configDataView.getUint16(a3Pos, true);
      a3Pos += 2;
      const byteCount = charCount * 2;
      if (a3Pos + byteCount > configBytes.byteLength) break;

      if (charCount > 0) {
        const decoder = new TextDecoder('utf-16le');
        const timeString = decoder.decode(
          configBytes.subarray(a3Pos, a3Pos + byteCount),
        );
        if (timeString.length > 0) {
          roundTimes[roundIndex] = timeString;
        }
      }
      a3Pos += byteCount;

      // Skip 106 bytes of fixed round data
      a3Pos += 106;
    }
  }

  // ── 8d. Compute player points and ranks ───────────────────────────────────
  for (const player of players) {
    player.points = player.results.reduce(
      (sum, r) => sum + pointsFromResult(r.result),
      0,
    );
  }

  // Sort by points descending to assign ranks (ties share the same rank)
  const sorted = players.toSorted((a, b) => b.points - a.points);
  let currentRankValue = 1;
  for (let index = 0; index < sorted.length; index++) {
    const player = sorted[index];
    const previous = sorted[index - 1];
    if (
      index > 0 &&
      previous !== undefined &&
      player !== undefined &&
      player.points < previous.points
    ) {
      currentRankValue = index + 1;
    }
    if (player !== undefined) {
      player.rank = currentRankValue;
    }
  }

  // Extract metadata fields
  const getMetadata = (index: number): string => metadataStrings[index] ?? '';

  const name = getMetadata(METADATA.NAME);
  const subtitleShort = nonEmpty(getMetadata(METADATA.SUBTITLE_SHORT));
  const city = nonEmpty(getMetadata(METADATA.CITY));
  const venue = nonEmpty(getMetadata(METADATA.VENUE));
  const federation = nonEmpty(getMetadata(METADATA.FEDERATION));
  const timeControl = nonEmpty(getMetadata(METADATA.TIME_CONTROL));

  const chiefArbiter = nonEmpty(getMetadata(METADATA.CHIEF_ARBITER));
  const deputyArbiterRaw = nonEmpty(getMetadata(METADATA.DEPUTY_ARBITER));
  const deputyArbiters: string[] | undefined =
    deputyArbiterRaw === undefined ? undefined : [deputyArbiterRaw];

  return {
    chiefArbiter,
    city,
    currentRound,
    deputyArbiters,
    endDate,
    federation,
    header,
    name,
    numberOfPlayers: players.length,
    pairings: allPairings,
    players,
    roundDates: roundDates.length > 0 ? roundDates : undefined,
    roundTimes: roundTimes.length > 0 ? roundTimes : undefined,
    rounds: totalRounds,
    startDate,
    subtitle: subtitleShort,
    tiebreaks: tiebreaks.length > 0 ? tiebreaks : undefined,
    timeControl,
    venue,
  };
}
