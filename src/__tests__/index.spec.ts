import { readFileSync } from 'node:fs';
import nodePath from 'node:path';
import { describe, expect, it } from 'vitest';

import { create, parse, stringify } from '../index.js';

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
      expect(tournament?.rounds).toHaveLength(7);
    });

    describe('player 1 (Aloisio)', () => {
      const player = tournament?.players[0];

      it('has the correct surname', () => {
        expect(player?.surname).toBe('Aloisio');
      });

      it('has the correct first name', () => {
        expect(player?.firstName).toBe('Ponti Lopes');
      });

      it('has the correct FIDE rating', () => {
        expect(player?.rating).toBe(1959);
      });

      it('has the correct FIDE ID', () => {
        expect(player?.fideId).toBe(2_108_372);
      });

      it('has the correct national rating', () => {
        expect(player?.nationalRating).toBe(1869);
      });

      it('has kFactor 20', () => {
        expect(player?.kFactor).toBe(20);
      });

      it('has an alphabetical index', () => {
        expect(player?.alphabeticalIndex).toBe(3);
      });
    });

    describe('player 5 (Fier)', () => {
      const player = tournament?.players[4];

      it('has the correct surname', () => {
        expect(player?.surname).toBe('Luciano');
      });

      it('has the correct first name', () => {
        expect(player?.firstName).toBe('Fier');
      });

      it('has the correct FIDE rating', () => {
        expect(player?.rating).toBe(1835);
      });

      it('has the correct FIDE ID', () => {
        expect(player?.fideId).toBe(2_120_526);
      });
    });

    it('has currentRound 7', () => {
      expect(tournament?.currentRound).toBe(7);
    });

    it('has dates from 2026-03-28 to 2026-03-28', () => {
      expect(tournament?.dates).toEqual({
        end: '2026-03-28',
        start: '2026-03-28',
      });
    });

    it('has round 1 date of 2026-03-28', () => {
      expect(tournament?.rounds[0]?.date).toBe('2026-03-28');
    });

    it('has no round time set', () => {
      expect(tournament?.rounds[0]?.time).toBeUndefined();
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

    it('stores raw data for round-trip', () => {
      expect(tournament?._raw).toBeDefined();
      expect(tournament?._raw.headerBytes).toBeInstanceOf(Uint8Array);
      expect(tournament?._raw.headerBytes).toHaveLength(0x6c);
      expect(tournament?._raw.metadataStrings).toBeInstanceOf(Array);
      expect(tournament?._raw.configBytes).toBeInstanceOf(Uint8Array);
      expect(tournament?._raw.playerStrings).toHaveLength(29);
      expect(tournament?._raw.playerNumericBytes).toHaveLength(29);
    });

    describe('header', () => {
      it('has the correct tournament ID', () => {
        expect(tournament?.header.tournamentId).toBe(1_378_181);
      });

      it('has a savedAt date of 2024-10-23', () => {
        const d = tournament?.header.savedAt;
        expect(d).toBeInstanceOf(Date);
        expect(d?.getUTCFullYear()).toBe(2024);
        expect(d?.getUTCMonth()).toBe(9); // 0-indexed
        expect(d?.getUTCDate()).toBe(23);
      });

      it('has an installedAt date of 2011-01-15', () => {
        const d = tournament?.header.installedAt;
        expect(d).toBeInstanceOf(Date);
        expect(d?.getUTCFullYear()).toBe(2011);
        expect(d?.getUTCMonth()).toBe(0);
        expect(d?.getUTCDate()).toBe(15);
      });

      it('has a 20-byte licenseHash', () => {
        expect(tournament?.header.licenseHash).toBeInstanceOf(Uint8Array);
        expect(tournament?.header.licenseHash).toHaveLength(20);
      });

      it('has a 52-byte installSignature', () => {
        expect(tournament?.header.installSignature).toBeInstanceOf(Uint8Array);
        expect(tournament?.header.installSignature).toHaveLength(52);
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
      expect(tournament?.rounds).toHaveLength(9);
    });

    describe('player 1 (Fedoseev)', () => {
      const player = tournament?.players[0];

      it('has the correct surname', () => {
        expect(player?.surname).toBe('Fedoseev');
      });

      it('has the correct first name', () => {
        expect(player?.firstName).toBe('Vladimir');
      });

      it('has the title GM', () => {
        expect(player?.title).toBe('GM');
      });

      it('has the correct FIDE rating', () => {
        expect(player?.rating).toBe(2675);
      });

      it('has the correct FIDE ID', () => {
        expect(player?.fideId).toBe(24_130_737);
      });

      it('has the correct federation', () => {
        expect(player?.federation).toBe('SLO');
      });
    });

    describe('player 40 (Khademalsharieh)', () => {
      const player = tournament?.players[39];

      it('has sex F', () => {
        expect(player?.sex).toBe('F');
      });

      it('has kFactor 10', () => {
        expect(player?.kFactor).toBe(10);
      });
    });

    describe('player 1 (Fedoseev) numeric fields', () => {
      const player = tournament?.players[0];

      it('has kFactor 10', () => {
        expect(player?.kFactor).toBe(10);
      });

      it('does not have sex set (male = undefined)', () => {
        expect(player?.sex).toBeUndefined();
      });

      it('has nationalRating undefined (no national rating)', () => {
        expect(player?.nationalRating).toBeUndefined();
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

    it('has dates from 2023-11-30 to 2023-12-08', () => {
      expect(tournament?.dates).toEqual({
        end: '2023-12-08',
        start: '2023-11-30',
      });
    });

    it('has round 1 date of 2023-11-30', () => {
      expect(tournament?.rounds[0]?.date).toBe('2023-11-30');
    });

    it('has round 9 date of 2023-12-08', () => {
      expect(tournament?.rounds[8]?.date).toBe('2023-12-08');
    });

    it('has round 1 time of 16:00', () => {
      expect(tournament?.rounds[0]?.time).toBe('16:00');
    });

    it('has round 9 time of 10:00', () => {
      expect(tournament?.rounds[8]?.time).toBe('10:00');
    });

    describe('header', () => {
      it('has the correct tournament ID', () => {
        expect(tournament?.header.tournamentId).toBe(753_347);
      });

      it('has a savedAt date of 2025-03-19', () => {
        const d = tournament?.header.savedAt;
        expect(d).toBeInstanceOf(Date);
        expect(d?.getUTCFullYear()).toBe(2025);
        expect(d?.getUTCMonth()).toBe(2);
        expect(d?.getUTCDate()).toBe(19);
      });

      it('has an installedAt date of 2007-09-30', () => {
        const d = tournament?.header.installedAt;
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
      const round6 = tournament?.rounds[5];
      expect(round6).toBeDefined();
      const unpaired = round6?.pairings.filter((p) => p.result === 'unpaired');
      expect(unpaired?.length).toBeGreaterThan(0);
    });
  });
});

describe('create()', () => {
  const templateData = fixture('sample.TUNX');
  const template = parse(templateData);

  it('creates a tournament with the given name', () => {
    const result = create(template!, {
      name: 'Test Tournament',
      players: [
        { firstName: 'Magnus', surname: 'Carlsen', rating: 2830 },
        { firstName: 'Hikaru', surname: 'Nakamura', rating: 2780 },
      ],
      rounds: [
        {
          pairings: [{ white: 1, black: 2, result: 'win' }],
        },
      ],
    });
    expect(result.name).toBe('Test Tournament');
  });

  it('preserves the template header bytes', () => {
    const result = create(template!, {
      name: 'Test',
      players: [
        { firstName: 'A', surname: 'B' },
        { firstName: 'C', surname: 'D' },
      ],
      rounds: [
        {
          pairings: [{ white: 1, black: 2, result: 'draw' }],
        },
      ],
    });
    expect(result._raw.headerBytes).toEqual(template!._raw.headerBytes);
  });

  it('round-trips through stringify and parse', () => {
    const input = {
      name: 'Round-Trip Test',
      players: [
        {
          firstName: 'Magnus',
          surname: 'Carlsen',
          rating: 2830,
          fideId: 1_503_014,
          sex: 'M' as const,
        },
        {
          firstName: 'Hikaru',
          surname: 'Nakamura',
          rating: 2780,
          fideId: 2_016_192,
        },
      ],
      rounds: [
        {
          date: '2026-03-30',
          pairings: [{ white: 1, black: 2, result: 'win' as const }],
        },
      ],
    };

    const created = create(template!, input);
    const bytes = stringify(created);
    const reparsed = parse(bytes);

    expect(reparsed).toBeDefined();
    expect(reparsed?.name).toBe('Round-Trip Test');
    expect(reparsed?.players).toHaveLength(2);
    expect(reparsed?.players[0]?.surname).toBe('Carlsen');
    expect(reparsed?.players[0]?.rating).toBe(2830);
    expect(reparsed?.players[0]?.fideId).toBe(1_503_014);
    expect(reparsed?.players[1]?.surname).toBe('Nakamura');
    expect(reparsed?.rounds).toHaveLength(1);
    expect(reparsed?.rounds[0]?.pairings[0]?.result).toBe('win');
  });

  it('throws if template has no _raw', () => {
    const noRaw = { ...template!, _raw: undefined as never };
    expect(() => create(noRaw, { name: 'X', players: [], rounds: [] })).toThrow(
      RangeError,
    );
  });
});

describe('stringify()', () => {
  it('throws RangeError if _raw is missing', () => {
    const bad = {} as Parameters<typeof stringify>[0];
    expect(() => stringify(bad)).toThrow(RangeError);
  });
});

describe('round-trip', () => {
  it('sample.TUNX round-trips to identical bytes', () => {
    const buffer = fixture('sample.TUNX');
    const tournament = parse(buffer);
    expect(tournament).toBeDefined();
    const output = stringify(tournament!);
    expect(output).toEqual(buffer);
  });

  it('abs_fem_1378181.TUNX round-trips to identical bytes', () => {
    const buffer = fixture('abs_fem_1378181.TUNX');
    const tournament = parse(buffer);
    expect(tournament).toBeDefined();
    const output = stringify(tournament!);
    expect(output).toEqual(buffer);
  });

  it('2023_elllobregat_a_753347.TUNX round-trips to identical bytes', () => {
    const buffer = fixture('2023_elllobregat_a_753347.TUNX');
    const tournament = parse(buffer);
    expect(tournament).toBeDefined();
    const output = stringify(tournament!);
    expect(output).toEqual(buffer);
  });
});
