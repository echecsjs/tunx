/** Magic bytes at offset 0x00 of every TUNX file: 93 FF 89 44 */
const MAGIC = 0x44_89_ff_93;

/** Config section marker: 95 FF 89 44 */
const CONFIG_MARKER = 0x44_89_ff_95;

/** Player section marker: A5 FF 89 44 */
const PLAYER_MARKER = 0x44_89_ff_a5;

/** Pairings section marker: B3 FF 89 44 */
const PAIRINGS_MARKER = 0x44_89_ff_b3;

/** Header occupies bytes 0x00 – 0x6B (108 bytes). */
const HEADER_SIZE = 0x6c;

/** Byte offset inside the header for the install signature (52 bytes). */
const HEADER_INSTALL_SIGNATURE_OFFSET = 0x34;

/** Size of the install signature block in bytes. */
const HEADER_INSTALL_SIGNATURE_SIZE = 52;

/** Byte offset inside the header for the installed-at date (U32LE, YYYYMMDD). */
const HEADER_INSTALLED_AT_OFFSET = 0x30;

/** Byte offset inside the header for the license hash (20 bytes). */
const HEADER_LICENSE_HASH_OFFSET = 0x08;

/** Size of the license hash block in bytes. */
const HEADER_LICENSE_HASH_SIZE = 20;

/** Byte offset inside the header for the saved-at date (U32LE, YYYYMMDD). */
const HEADER_SAVED_AT_OFFSET = 0x1c;

/** Byte offset inside the header for the tournament ID (U32LE). */
const HEADER_TOURNAMENT_ID_OFFSET = 0x20;

/** Metadata strings begin immediately after the header. */
const METADATA_OFFSET = 0x6c;

/** Offset from config data start to the first tiebreak code (5 × U16LE). */
const CONFIG_OFFSET_TIEBREAK_CODES = 0x1c;

/** Offset from config data start to the number of tiebreaks (U8). */
const CONFIG_OFFSET_TIEBREAK_COUNT = 0x1b;

/**
 * Offset from the start of the config data (after marker + 4) to
 * the total-rounds field (U16LE).
 */
const CONFIG_OFFSET_TOTAL_ROUNDS = 0x00;

/**
 * Offset from the start of the config data (after marker + 4) to
 * the current-round field (U8).
 */
const CONFIG_OFFSET_CURRENT_ROUND = 0x11;

/** Offset from config data start to the tournament end date (U32LE, YYYYMMDD). */
const CONFIG_OFFSET_END_DATE = 0x4b;

/**
 * Offset from the start of the config data (after marker + 4) to
 * the player-count field (U16LE).
 */
const CONFIG_OFFSET_PLAYER_COUNT = 0x13;

/** Offset from config data start to the tournament start date (U32LE, YYYYMMDD). */
const CONFIG_OFFSET_START_DATE = 0x47;

/** Number of UTF-16LE string fields per player record. */
const PLAYER_STRING_COUNT = 30;

/** Size of the numeric block appended after the string fields in each player record. */
const PLAYER_NUMERIC_BLOCK_SIZE = 110;

/** Byte offset inside the numeric block for the FIDE rating (U16LE). */
const PLAYER_NUMERIC_OFFSET_FIDE_RATING = 0x08;

/** Byte offset inside the numeric block for the FIDE ID (U32LE). */
const PLAYER_NUMERIC_OFFSET_FIDE_ID = 0x18;

/** Byte offset inside the numeric block for the national rating (U16LE). */
const PLAYER_NUMERIC_OFFSET_NATIONAL_RATING = 0x0a;

/** Byte offset inside the numeric block for the sex flag (U8: 0=male, 1=female). */
const PLAYER_NUMERIC_OFFSET_SEX = 0x06;

/** Fixed size of every pairing record in bytes. */
const PAIRING_RECORD_SIZE = 21;

/**
 * Metadata string field indices (0-based).
 * Not all indices carry data in every file; spare indices are empty strings.
 */
const METADATA = {
  CATEGORIES: 13,
  CHIEF_ARBITER: 3,
  CITY: 10,
  DEPUTY_ARBITER: 4,
  FEDERATION: 20,
  INTERNAL_ID: 11,
  NAME: 0,
  OTHER_ARBITERS: 6,
  PGN_PATH_1: 7,
  PGN_PATH_2: 8,
  SHORT_NAME: 9,
  SUBTITLE_LONG: 2,
  SUBTITLE_SHORT: 1,
  TIME_CONTROL: 14,
  VENUE: 5,
} as const;

/**
 * Player string field indices (0-based within each player's 30-string block).
 */
const PLAYER_STRINGS = {
  CLUB: 9,
  FEDERATION: 10,
  FIRST_NAME: 1,
  GROUP_1: 11,
  GROUP_2: 12,
  NATIONAL_ID: 5,
  SHORT_NAME: 3,
  SURNAME: 0,
  TITLE: 4,
  TYPE_CATEGORY: 17,
} as const;

/**
 * Maps TUNX tiebreak codes (low byte of U16LE) to Tiebreak type strings.
 * Only the low byte is meaningful; the high byte is always 0x00.
 */
const TIEBREAK_CODE = {
  0x0b: 'progressive',
  0x25: 'performance-rating',
  0x34: 'median-buchholz',
  0x3d: 'number-of-wins',
  0x44: 'direct-encounter',
  0x51: 'sonneborn-berger',
  0x54: 'buchholz',
  0x55: 'buchholz-cut-1',
  0x56: 'buchholz-cut-2',
  0x57: 'buchholz-cut-3',
  0x58: 'average-rating',
} as const;

/**
 * Result codes stored in the pairing record.
 */
const RESULT_CODE = {
  BLACK_WINS: 3,
  BLACK_WINS_FORFEIT: 5,
  DRAW: 2,
  UNPAIRED: 0,
  UNPLAYED: 9,
  WHITE_WINS: 1,
  WHITE_WINS_FORFEIT: 4,
} as const;

/** Pairing number used to indicate a bye (no opponent). */
const BYE_PLAYER_NUMBER = 0xff_fe;

export {
  BYE_PLAYER_NUMBER,
  CONFIG_MARKER,
  CONFIG_OFFSET_CURRENT_ROUND,
  CONFIG_OFFSET_END_DATE,
  CONFIG_OFFSET_PLAYER_COUNT,
  CONFIG_OFFSET_START_DATE,
  CONFIG_OFFSET_TIEBREAK_CODES,
  CONFIG_OFFSET_TIEBREAK_COUNT,
  CONFIG_OFFSET_TOTAL_ROUNDS,
  HEADER_INSTALL_SIGNATURE_OFFSET,
  HEADER_INSTALL_SIGNATURE_SIZE,
  HEADER_INSTALLED_AT_OFFSET,
  HEADER_LICENSE_HASH_OFFSET,
  HEADER_LICENSE_HASH_SIZE,
  HEADER_SAVED_AT_OFFSET,
  HEADER_SIZE,
  HEADER_TOURNAMENT_ID_OFFSET,
  MAGIC,
  METADATA,
  METADATA_OFFSET,
  PAIRING_RECORD_SIZE,
  PAIRINGS_MARKER,
  PLAYER_MARKER,
  PLAYER_NUMERIC_BLOCK_SIZE,
  PLAYER_NUMERIC_OFFSET_FIDE_ID,
  PLAYER_NUMERIC_OFFSET_FIDE_RATING,
  PLAYER_NUMERIC_OFFSET_NATIONAL_RATING,
  PLAYER_NUMERIC_OFFSET_SEX,
  PLAYER_STRING_COUNT,
  PLAYER_STRINGS,
  RESULT_CODE,
  TIEBREAK_CODE,
};
