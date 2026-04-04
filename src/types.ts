interface RawTournament {
  configBytes: Uint8Array;
  headerBytes: Uint8Array;
  metadataStrings: string[];
  pairingBytes: Uint8Array[];
  pairingsSection: Uint8Array;
  playerNumericBytes: Uint8Array[];
  playerStrings: string[][];
}

interface Header {
  /** High-entropy bytes 0x34–0x67, likely tied to SW license/installation. */
  installSignature: Uint8Array;
  /** Older date (offset 0x30), possibly SW installation date. */
  installedAt?: Date;
  /** High-entropy bytes 0x08–0x1B, likely tied to SW license/installation. */
  licenseHash: Uint8Array;
  /** Date the file was last saved (offset 0x1C). */
  savedAt?: Date;
  /** Chess-Results tournament ID (offset 0x20). */
  tournamentId: number;
}

interface NationalRating {
  federation: string;
  nationalId?: string;
  pairingNumber: number;
  rating: number;
}

interface Pairing {
  black: number;
  board: number;
  result?: ResultCode;
  white: number;
}

interface ParseError {
  message: string;
  offset?: number;
}

interface ParseOptions {
  onError?: (error: ParseError) => void;
  onWarning?: (warning: ParseWarning) => void;
}

interface ParseWarning {
  message: string;
  offset?: number;
}

interface Player {
  // TRF-compatible fields
  birthDate?: string;
  federation?: string;
  fideId?: string;
  name: string;
  nationalRatings?: NationalRating[];
  pairingNumber: number;
  points: number;
  rank: number;
  rating?: number;
  results: RoundResult[];
  /** Player sex. `'w'` when explicitly flagged female; `undefined` otherwise. */
  sex?: Sex;
  title?: Title;
}

interface RoundResult {
  color: '-' | 'b' | 'w';
  opponentId?: number;
  result: ResultCode;
  round: number;
}

interface Tournament {
  // TRF-compatible fields
  chiefArbiter?: string;
  city?: string;
  deputyArbiters?: string[];
  endDate?: string;
  federation?: string;
  name?: string;
  numberOfPlayers?: number;
  players: Player[];
  roundDates?: string[];
  rounds: number;
  startDate?: string;
  tiebreaks?: string[];
  timeControl?: string;
  tournamentType?: string;

  // TUNX-specific extensions
  _raw: RawTournament;
  currentRound?: number;
  header?: Header;
  pairings?: Pairing[][];
  roundTimes?: string[];
  subtitle?: string;
  venue?: string;
}

/**
 * Tiebreak identifiers. Used as values in `Tournament.tiebreaks` (string[]).
 * Kept for documentation/reference.
 */
type Tiebreak =
  | 'average-rating'
  | 'buchholz'
  | 'buchholz-cut-1'
  | 'buchholz-cut-2'
  | 'buchholz-cut-3'
  | 'direct-encounter'
  | 'koya'
  | 'median-buchholz'
  | 'number-of-wins'
  | 'performance-rating'
  | 'progressive'
  | 'sonneborn-berger';

type ResultCode =
  | '+'
  | '-'
  | '0'
  | '1'
  | '='
  | 'D'
  | 'F'
  | 'H'
  | 'U'
  | 'W'
  | 'Z';

type Sex = 'm' | 'w';

type Title = 'CM' | 'FM' | 'GM' | 'IM' | 'WCM' | 'WFM' | 'WGM' | 'WIM';

export type {
  Header,
  NationalRating,
  Pairing,
  ParseError,
  ParseOptions,
  ParseWarning,
  Player,
  RawTournament,
  ResultCode,
  RoundResult,
  Sex,
  Tiebreak,
  Title,
  Tournament,
};
