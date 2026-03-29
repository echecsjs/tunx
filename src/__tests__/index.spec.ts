import { readFileSync } from 'node:fs';
import nodePath from 'node:path';
import { describe, expect, it } from 'vitest';

import { parse, stringify } from '../index.js';

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

    it('stores raw data for round-trip', () => {
      expect(tournament?._raw).toBeDefined();
      expect(tournament?._raw.headerBytes).toBeInstanceOf(Uint8Array);
      expect(tournament?._raw.headerBytes).toHaveLength(0x6c);
      expect(tournament?._raw.metadataStrings).toBeInstanceOf(Array);
      expect(tournament?._raw.configBytes).toBeInstanceOf(Uint8Array);
      expect(tournament?._raw.playerStrings).toHaveLength(29);
      expect(tournament?._raw.playerNumericBytes).toHaveLength(29);
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
