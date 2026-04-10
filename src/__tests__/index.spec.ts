import { readFileSync } from 'node:fs';
import nodePath from 'node:path';
import { describe, expect, it } from 'vitest';

import { parse } from '../index.js';

const { join } = nodePath;
const FIXTURES = join(import.meta.dirname, 'fixtures');

function fixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(FIXTURES, name)));
}

describe('parse()', () => {
  describe('invalid input', () => {
    it('returns undefined for an empty buffer', () => {
      expect(parse(new Uint8Array(0))).toBeUndefined();
    });

    it('returns undefined for a buffer with wrong magic', () => {
      const bad = new Uint8Array(200).fill(0);
      expect(parse(bad)).toBeUndefined();
    });

    it('calls onError when magic is wrong', () => {
      const bad = new Uint8Array(200).fill(0);
      let called = false;
      parse(bad, {
        onError() {
          called = true;
        },
      });
      expect(called).toBe(true);
    });
  });

  describe('sample.TUNX', () => {
    const data = fixture('sample.TUNX');
    const tournament = parse(data);

    it('parses successfully', () => {
      expect(tournament).toBeDefined();
    });

    it('has the correct tournament name', () => {
      expect(tournament?.name).toBe('Circuito Sesc de Xadrez - 2026');
    });

    it('has the correct city', () => {
      expect(tournament?.city).toBe('Curitiba-PR');
    });

    it('has the correct federation', () => {
      expect(tournament?.federation).toBe('BRA');
    });

    it('has the correct time control', () => {
      expect(tournament?.timeControl).toBe("7'+5'' ou 12' KO");
    });

    it('has 29 players', () => {
      expect(tournament?.players).toHaveLength(29);
    });

    it('has 7 rounds', () => {
      expect(tournament?.rounds).toBe(7);
    });

    describe('player 1 (Aloisio)', () => {
      const player = tournament?.players[0];

      it('has the correct name', () => {
        expect(player?.name).toBe('Aloisio, Ponti Lopes');
      });

      it('has the correct FIDE rating', () => {
        expect(player?.rating).toBe(1959);
      });

      it('has the correct FIDE ID', () => {
        expect(player?.fideId).toBe('2108372');
      });

      it('has the correct national rating', () => {
        expect(player?.nationalRatings?.[0]?.rating).toBe(1869);
      });

      it('has points >= 0', () => {
        expect(player?.points).toBeGreaterThanOrEqual(0);
      });

      it('has rank > 0', () => {
        expect(player?.rank).toBeGreaterThan(0);
      });
    });

    describe('player 5 (Fier)', () => {
      const player = tournament?.players[4];

      it('has the correct name', () => {
        expect(player?.name).toBe('Luciano, Fier');
      });

      it('has the correct FIDE rating', () => {
        expect(player?.rating).toBe(1835);
      });

      it('has the correct FIDE ID', () => {
        expect(player?.fideId).toBe('2120526');
      });
    });

    it('has currentRound 7', () => {
      expect(tournament?.currentRound).toBe(7);
    });

    it('has startDate 2026-03-28', () => {
      expect(tournament?.startDate).toBe('2026-03-28');
    });

    it('has endDate 2026-03-28', () => {
      expect(tournament?.endDate).toBe('2026-03-28');
    });

    it('has round 1 date of 2026-03-28', () => {
      expect(tournament?.roundDates?.[0]).toBe('2026-03-28');
    });

    it('has no round time set', () => {
      expect(tournament?.roundTimes?.[0]).toBeUndefined();
    });

    it('has 5 tiebreaks', () => {
      expect(tournament?.tiebreaks).toHaveLength(5);
      expect(tournament?.tiebreaks).toEqual([
        'progressive',
        'buchholz',
        'buchholz',
        'buchholz-cut-1',
        'number-of-wins',
      ]);
    });

    describe('header', () => {
      it('has the correct tournament ID', () => {
        expect(tournament?.header?.tournamentId).toBe(1_378_181);
      });

      it('has a savedAt date of 2024-10-23', () => {
        const d = tournament?.header?.savedAt;
        expect(d).toBeInstanceOf(Date);
        expect(d?.getUTCFullYear()).toBe(2024);
        expect(d?.getUTCMonth()).toBe(9); // 0-indexed
        expect(d?.getUTCDate()).toBe(23);
      });

      it('has an installedAt date of 2011-01-15', () => {
        const d = tournament?.header?.installedAt;
        expect(d).toBeInstanceOf(Date);
        expect(d?.getUTCFullYear()).toBe(2011);
        expect(d?.getUTCMonth()).toBe(0);
        expect(d?.getUTCDate()).toBe(15);
      });

      it('has a 20-byte licenseHash', () => {
        expect(tournament?.header?.licenseHash).toBeInstanceOf(Uint8Array);
        expect(tournament?.header?.licenseHash).toHaveLength(20);
      });

      it('has a 52-byte installSignature', () => {
        expect(tournament?.header?.installSignature).toBeInstanceOf(Uint8Array);
        expect(tournament?.header?.installSignature).toHaveLength(52);
      });
    });
  });

  describe('2023_elllobregat_a_753347.TUNX', () => {
    const data = fixture('2023_elllobregat_a_753347.TUNX');
    const tournament = parse(data);

    it('parses successfully', () => {
      expect(tournament).toBeDefined();
    });

    it('has a name containing "Elllobregat"', () => {
      expect(tournament?.name).toContain('Elllobregat');
    });

    it('has 210 players', () => {
      expect(tournament?.players).toHaveLength(210);
    });

    it('has 9 rounds', () => {
      expect(tournament?.rounds).toBe(9);
    });

    describe('player 1 (Fedoseev)', () => {
      const player = tournament?.players[0];

      it('has the correct name', () => {
        expect(player?.name).toBe('Fedoseev, Vladimir');
      });

      it('has the title GM', () => {
        expect(player?.title).toBe('GM');
      });

      it('has the correct FIDE rating', () => {
        expect(player?.rating).toBe(2675);
      });

      it('has the correct FIDE ID', () => {
        expect(player?.fideId).toBe('24130737');
      });

      it('has the correct federation', () => {
        expect(player?.federation).toBe('SLO');
      });
    });

    describe('player 40 (Khademalsharieh)', () => {
      const player = tournament?.players[39];

      it('has sex w (female)', () => {
        expect(player?.sex).toBe('w');
      });
    });

    describe('player 1 (Fedoseev) numeric fields', () => {
      const player = tournament?.players[0];

      it('does not have sex set (male = undefined)', () => {
        expect(player?.sex).toBeUndefined();
      });

      it('has nationalRatings undefined (no national rating)', () => {
        expect(player?.nationalRatings).toBeUndefined();
      });
    });

    it('has tiebreaks including performance-rating', () => {
      expect(tournament?.tiebreaks).toContain('performance-rating');
      expect(tournament?.tiebreaks).toContain('median-buchholz');
      expect(tournament?.tiebreaks).toContain('progressive');
    });

    it('has currentRound 9', () => {
      expect(tournament?.currentRound).toBe(9);
    });

    it('has startDate 2023-11-30', () => {
      expect(tournament?.startDate).toBe('2023-11-30');
    });

    it('has endDate 2023-12-08', () => {
      expect(tournament?.endDate).toBe('2023-12-08');
    });

    it('has round 1 date of 2023-11-30', () => {
      expect(tournament?.roundDates?.[0]).toBe('2023-11-30');
    });

    it('has round 9 date of 2023-12-08', () => {
      expect(tournament?.roundDates?.[8]).toBe('2023-12-08');
    });

    it('has round 1 time of 16:00', () => {
      expect(tournament?.roundTimes?.[0]).toBe('16:00');
    });

    it('has round 9 time of 10:00', () => {
      expect(tournament?.roundTimes?.[8]).toBe('10:00');
    });

    describe('header', () => {
      it('has the correct tournament ID', () => {
        expect(tournament?.header?.tournamentId).toBe(753_347);
      });

      it('has a savedAt date of 2025-03-19', () => {
        const d = tournament?.header?.savedAt;
        expect(d).toBeInstanceOf(Date);
        expect(d?.getUTCFullYear()).toBe(2025);
        expect(d?.getUTCMonth()).toBe(2);
        expect(d?.getUTCDate()).toBe(19);
      });

      it('has an installedAt date of 2007-09-30', () => {
        const d = tournament?.header?.installedAt;
        expect(d).toBeInstanceOf(Date);
        expect(d?.getUTCFullYear()).toBe(2007);
        expect(d?.getUTCMonth()).toBe(8);
        expect(d?.getUTCDate()).toBe(30);
      });
    });
  });

  describe('abs_fem_1378181.TUNX', () => {
    const data = fixture('abs_fem_1378181.TUNX');
    const tournament = parse(data);

    it('parses successfully', () => {
      expect(tournament).toBeDefined();
    });

    it('has currentRound 5', () => {
      expect(tournament?.currentRound).toBe(5);
    });

    it('has unpaired results in round 6', () => {
      const round6Pairings = tournament?.pairings?.[5];
      expect(round6Pairings).toBeDefined();
      const unpaired = round6Pairings?.filter((p) => p.result === 'Z');
      expect(unpaired?.length).toBeGreaterThan(0);
    });
  });
});
