interface RawTournament {
  configBytes: Uint8Array;
  headerBytes: Uint8Array;
  metadataStrings: string[];
  pairingBytes: Uint8Array[];
  pairingsSection: Uint8Array;
  playerNumericBytes: Uint8Array[];
  playerStrings: string[][];
}

interface Arbiter {
  fideId?: number;
  name: string;
  role: 'arbiter' | 'chief' | 'deputy';
}

interface DateRange {
  end: string;
  start: string;
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

interface Pairing {
  black: number;
  board: number;
  result?: ResultKind;
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
  alphabeticalIndex?: number;
  birthYear?: number;
  categoryId?: number;
  club?: string;
  federation?: string;
  fideId?: number;
  firstName: string;
  group?: string;
  kFactor?: number;
  nationalId?: string;
  nationalRating?: number;
  pairingNumber: number;
  rating?: number;
  ratingDelta?: number;
  ratingPeriod?: number;
  registrationId?: number;
  results: Result[];
  /** Player sex. `'F'` when explicitly flagged female; `undefined` otherwise. */
  sex?: 'F' | 'M';
  surname: string;
  title?: Title;
}

interface Result {
  color?: 'black' | 'white';
  kind: ResultKind;
  opponent?: number;
  round: number;
}

interface Round {
  date?: string;
  number: number;
  pairings: Pairing[];
}

interface Tournament {
  _raw: RawTournament;
  arbiters: Arbiter[];
  city?: string;
  dates?: DateRange;
  federation?: string;
  header: Header;
  name: string;
  pairingSystem: PairingSystem;
  players: Player[];
  rounds: Round[];
  subtitle?: string;
  tiebreaks: Tiebreak[];
  timeControl?: string;
  venue?: string;
}

type PairingSystem = 'burstein' | 'dutch' | 'lim' | 'round-robin';

type ResultKind =
  | 'bye'
  | 'double-forfeit'
  | 'draw'
  | 'forfeit-loss'
  | 'forfeit-win'
  | 'half-bye'
  | 'loss'
  | 'unpaired'
  | 'win';

type Sex = 'F' | 'M';

type Tiebreak =
  | 'average-rating'
  | 'buchholz'
  | 'buchholz-cut-1'
  | 'direct-encounter'
  | 'koya'
  | 'median-buchholz'
  | 'number-of-wins'
  | 'performance-rating'
  | 'progressive'
  | 'sonneborn-berger';

type Title = 'CM' | 'FM' | 'GM' | 'IM' | 'WCM' | 'WFM' | 'WGM' | 'WIM';

export type {
  Arbiter,
  DateRange,
  Header,
  Pairing,
  PairingSystem,
  ParseError,
  ParseOptions,
  ParseWarning,
  Player,
  RawTournament,
  Result,
  ResultKind,
  Round,
  Sex,
  Tiebreak,
  Title,
  Tournament,
};
