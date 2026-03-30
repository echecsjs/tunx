import {
  BYE_PLAYER_NUMBER,
  CONFIG_MARKER,
  CONFIG_OFFSET_CURRENT_ROUND,
  CONFIG_OFFSET_END_DATE,
  CONFIG_OFFSET_PLAYER_COUNT,
  CONFIG_OFFSET_START_DATE,
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
  PLAYER_NUMERIC_OFFSET_ALPHABETICAL_INDEX,
  PLAYER_NUMERIC_OFFSET_CATEGORY_ID,
  PLAYER_NUMERIC_OFFSET_FIDE_ID,
  PLAYER_NUMERIC_OFFSET_FIDE_RATING,
  PLAYER_NUMERIC_OFFSET_K_FACTOR,
  PLAYER_NUMERIC_OFFSET_NATIONAL_RATING,
  PLAYER_NUMERIC_OFFSET_RATING_DELTA,
  PLAYER_NUMERIC_OFFSET_RATING_PERIOD,
  PLAYER_NUMERIC_OFFSET_REGISTRATION_ID,
  PLAYER_NUMERIC_OFFSET_SEX,
  PLAYER_STRINGS,
  PLAYER_STRING_COUNT,
  RESULT_CODE,
} from './constants.js';
import BinaryReader from './reader.js';

import type {
  DateRange,
  Header,
  Pairing,
  ParseOptions,
  Player,
  RawTournament,
  Result,
  ResultKind,
  Round,
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

/** Map a TUNX result code to our ResultKind type. */
function mapResultCode(code: number): ResultKind | undefined {
  switch (code) {
    case RESULT_CODE.WHITE_WINS: {
      return 'win';
    }
    case RESULT_CODE.DRAW: {
      return 'draw';
    }
    case RESULT_CODE.BLACK_WINS: {
      return 'loss';
    }
    case RESULT_CODE.WHITE_WINS_FORFEIT: {
      return 'forfeit-win';
    }
    case RESULT_CODE.BLACK_WINS_FORFEIT: {
      return 'forfeit-loss';
    }
    case RESULT_CODE.UNPLAYED: {
      return 'bye';
    }
    default: {
      return undefined;
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

  const dates: DateRange | undefined =
    startDate !== undefined && endDate !== undefined
      ? { end: endDate, start: startDate }
      : undefined;

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
  // Store raw bytes from pairings marker to EOF for round-trip fidelity.
  const pairingsSection = input.slice(pairingsMarkerOffset);
  const pairingData = input.slice(pairingSectionStart);
  const totalPairingRecords = Math.floor(
    pairingData.length / PAIRING_RECORD_SIZE,
  );
  const pairingBytes: Uint8Array[] = [];

  for (let index = 0; index < totalPairingRecords; index++) {
    const offset = index * PAIRING_RECORD_SIZE;
    pairingBytes.push(pairingData.slice(offset, offset + PAIRING_RECORD_SIZE));
  }

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
    const ratingDelta = numericView.getUint16(
      PLAYER_NUMERIC_OFFSET_RATING_DELTA,
      true,
    );
    const ratingPeriod = numericView.getUint16(
      PLAYER_NUMERIC_OFFSET_RATING_PERIOD,
      true,
    );
    const categoryId = numericView.getUint16(
      PLAYER_NUMERIC_OFFSET_CATEGORY_ID,
      true,
    );
    const registrationId = numericView.getUint16(
      PLAYER_NUMERIC_OFFSET_REGISTRATION_ID,
      true,
    );
    const fideId = numericView.getUint32(PLAYER_NUMERIC_OFFSET_FIDE_ID, true);
    const alphabeticalIndex = numericView.getUint16(
      PLAYER_NUMERIC_OFFSET_ALPHABETICAL_INDEX,
      true,
    );
    const kFactor = numericView.getUint16(PLAYER_NUMERIC_OFFSET_K_FACTOR, true);

    const surname = strings[PLAYER_STRINGS.SURNAME] ?? '';
    const firstName = strings[PLAYER_STRINGS.FIRST_NAME] ?? '';
    const titleRaw = strings[PLAYER_STRINGS.TITLE] ?? '';
    const club = strings[PLAYER_STRINGS.CLUB] ?? '';
    const federation = strings[PLAYER_STRINGS.FEDERATION] ?? '';
    const nationalId = strings[PLAYER_STRINGS.NATIONAL_ID] ?? '';

    const player: Player = {
      alphabeticalIndex: alphabeticalIndex > 0 ? alphabeticalIndex : undefined,
      categoryId: categoryId > 0 ? categoryId : undefined,
      club: nonEmpty(club),
      federation: nonEmpty(federation),
      fideId: fideId > 0 ? fideId : undefined,
      firstName,
      kFactor: kFactor > 0 ? kFactor : undefined,
      nationalId: nonEmpty(nationalId),
      nationalRating: nationalRating > 0 ? nationalRating : undefined,
      pairingNumber: index + 1,
      rating:
        fideRating > 0
          ? fideRating
          : nationalRating > 0
            ? nationalRating
            : undefined,
      ratingDelta: ratingDelta > 0 ? ratingDelta : undefined,
      ratingPeriod: ratingPeriod > 0 ? ratingPeriod : undefined,
      registrationId: registrationId > 0 ? registrationId : undefined,
      results: [],
      sex: sexByte === 1 ? 'F' : undefined,
      surname,
      title: toTitle(titleRaw),
    };

    players.push(player);
  }

  // Rounds and pairings
  const rounds: Round[] = [];
  const pairingsPerRound = playerCount > 0 ? Math.ceil(playerCount / 2) : 0;

  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex++) {
    const roundPairings: Pairing[] = [];

    const startPairing = roundIndex * pairingsPerRound;
    const endPairing = Math.min(
      startPairing + pairingsPerRound,
      pairingBytes.length,
    );

    for (
      let pairingIndex = startPairing;
      pairingIndex < endPairing;
      pairingIndex++
    ) {
      const record = pairingBytes[pairingIndex];

      if (record === undefined) {
        break;
      }

      const pairingView = new DataView(
        record.buffer,
        record.byteOffset,
        record.byteLength,
      );
      const white = pairingView.getUint16(0, true);
      const black = pairingView.getUint16(2, true);
      const resultCode = pairingView.getUint16(4, true);
      const resultKind = mapResultCode(resultCode);

      const pairing: Pairing = {
        black: black === BYE_PLAYER_NUMBER ? 0 : black,
        board: pairingIndex - startPairing + 1,
        result: resultKind,
        white,
      };

      roundPairings.push(pairing);

      // Populate player results
      const whitePlayer = players[white - 1];
      const blackPlayer =
        black === BYE_PLAYER_NUMBER ? undefined : players[black - 1];

      if (whitePlayer !== undefined && resultKind !== undefined) {
        let whiteKind: ResultKind;

        switch (resultKind) {
          case 'win': {
            whiteKind = 'win';
            break;
          }
          case 'draw': {
            whiteKind = 'draw';
            break;
          }
          case 'loss': {
            whiteKind = 'loss';
            break;
          }
          case 'forfeit-win': {
            whiteKind = 'forfeit-win';
            break;
          }
          case 'forfeit-loss': {
            whiteKind = 'forfeit-loss';
            break;
          }
          case 'bye': {
            whiteKind = 'bye';
            break;
          }
          default: {
            whiteKind = resultKind;
          }
        }

        const whiteResult: Result = {
          color: 'white',
          kind: whiteKind,
          opponent: black === BYE_PLAYER_NUMBER ? undefined : black,
          round: roundIndex + 1,
        };

        whitePlayer.results.push(whiteResult);
      }

      if (blackPlayer !== undefined && resultKind !== undefined) {
        let blackKind: ResultKind;

        switch (resultKind) {
          case 'win': {
            blackKind = 'loss';
            break;
          }
          case 'draw': {
            blackKind = 'draw';
            break;
          }
          case 'loss': {
            blackKind = 'win';
            break;
          }
          case 'forfeit-win': {
            blackKind = 'forfeit-loss';
            break;
          }
          case 'forfeit-loss': {
            blackKind = 'forfeit-win';
            break;
          }
          case 'bye': {
            blackKind = 'bye';
            break;
          }
          default: {
            blackKind = resultKind;
          }
        }

        const blackResult: Result = {
          color: 'black',
          kind: blackKind,
          opponent: white,
          round: roundIndex + 1,
        };

        blackPlayer.results.push(blackResult);
      }
    }

    rounds.push({
      number: roundIndex + 1,
      pairings: roundPairings,
    });
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
    // Within each round block, multiple date fields may be present close
    // together (≤ 20 bytes apart). The next round block starts further away
    // (typically 100+ bytes). We skip ahead by 32 bytes from the first found
    // date to land past any within-block duplicates before resuming the scan.
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

          const round = rounds[roundIndex];

          if (dateString !== undefined && round !== undefined) {
            round.date = dateString;
          }
        }
      }
    }
  } else if (roundBlockDateOffset !== -1 && totalRounds === 1) {
    // Single round — use the found date directly
    const dateValue = configDataView.getUint32(roundBlockDateOffset, true);
    const dateString = formatDate(dateValue);

    if (dateString !== undefined && rounds[0] !== undefined) {
      rounds[0].date = dateString;
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

  // Arbiters
  const arbiters = [];

  const chiefArbiterRaw = nonEmpty(getMetadata(METADATA.CHIEF_ARBITER));

  if (chiefArbiterRaw !== undefined) {
    arbiters.push({ name: chiefArbiterRaw, role: 'chief' as const });
  }

  const deputyArbiterRaw = nonEmpty(getMetadata(METADATA.DEPUTY_ARBITER));

  if (deputyArbiterRaw !== undefined) {
    arbiters.push({ name: deputyArbiterRaw, role: 'deputy' as const });
  }

  // ── 9. Assemble raw data for round-trip ──────────────────────────────────
  const raw: RawTournament = {
    configBytes,
    headerBytes,
    metadataStrings,
    pairingBytes,
    pairingsSection,
    playerNumericBytes,
    playerStrings,
  };

  return {
    _raw: raw,
    arbiters,
    city,
    currentRound,
    dates,
    federation,
    header,
    name,
    pairingSystem: 'dutch',
    players,
    rounds,
    subtitle: subtitleShort,
    tiebreaks: [],
    timeControl,
    venue,
  };
}
