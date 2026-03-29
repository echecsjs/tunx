import { describe, expect, it } from 'vitest';

import BinaryReader from '../reader.js';

describe('BinaryReader', () => {
  it('reads a U8', () => {
    const reader = new BinaryReader(new Uint8Array([0x42]));
    expect(reader.readU8()).toBe(0x42);
  });

  it('reads a U16LE', () => {
    const reader = new BinaryReader(new Uint8Array([0x34, 0x12]));
    expect(reader.readU16LE()).toBe(0x12_34);
  });

  it('reads a U32LE', () => {
    const reader = new BinaryReader(new Uint8Array([0x78, 0x56, 0x34, 0x12]));
    expect(reader.readU32LE()).toBe(0x12_34_56_78);
  });

  it('reads a UTF-16LE string with U16LE length prefix', () => {
    // Length prefix: 0x0005 (U16LE), then "Hello" in UTF-16LE
    const bytes = new Uint8Array([
      0x05, 0x00, 0x48, 0x00, 0x65, 0x00, 0x6c, 0x00, 0x6c, 0x00, 0x6f, 0x00,
    ]);
    const reader = new BinaryReader(bytes);
    expect(reader.readString()).toBe('Hello');
  });

  it('advances cursor after each read', () => {
    const reader = new BinaryReader(new Uint8Array([0x01, 0x02, 0x03]));
    reader.readU8();
    reader.readU8();
    expect(reader.readU8()).toBe(0x03);
    expect(reader.offset).toBe(3);
  });

  it('reads raw bytes', () => {
    const data = new Uint8Array([0x10, 0x20, 0x30, 0x40]);
    const reader = new BinaryReader(data);
    expect(reader.readBytes(2)).toEqual(new Uint8Array([0x10, 0x20]));
    expect(reader.readBytes(2)).toEqual(new Uint8Array([0x30, 0x40]));
  });

  it('exposes remaining bytes', () => {
    const reader = new BinaryReader(new Uint8Array([0x01, 0x02, 0x03]));
    reader.readU8();
    expect(reader.remaining).toBe(2);
  });

  it('can seek to an offset', () => {
    const reader = new BinaryReader(new Uint8Array([0x01, 0x02, 0x03, 0x04]));
    reader.seek(2);
    expect(reader.readU8()).toBe(0x03);
  });
});
