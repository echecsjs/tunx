import { describe, expect, it } from 'vitest';

import BinaryReader from '../reader.js';
import BinaryWriter from '../writer.js';

describe('BinaryWriter', () => {
  it('writes a U8', () => {
    const writer = new BinaryWriter();
    writer.writeU8(0x42);
    expect(writer.toUint8Array()).toEqual(new Uint8Array([0x42]));
  });

  it('writes a U16LE', () => {
    const writer = new BinaryWriter();
    writer.writeU16LE(0x12_34);
    expect(writer.toUint8Array()).toEqual(new Uint8Array([0x34, 0x12]));
  });

  it('writes a U32LE', () => {
    const writer = new BinaryWriter();
    writer.writeU32LE(0x12_34_56_78);
    expect(writer.toUint8Array()).toEqual(
      new Uint8Array([0x78, 0x56, 0x34, 0x12]),
    );
  });

  it('writes a UTF-16LE string with U16LE length prefix', () => {
    const writer = new BinaryWriter();
    writer.writeString('Hello');
    const result = writer.toUint8Array();
    // U16LE length prefix (0x0005), then "Hello" in UTF-16LE
    expect(result).toEqual(
      new Uint8Array([
        0x05, 0x00, 0x48, 0x00, 0x65, 0x00, 0x6c, 0x00, 0x6c, 0x00, 0x6f, 0x00,
      ]),
    );
  });

  it('writes raw bytes', () => {
    const writer = new BinaryWriter();
    writer.writeBytes(new Uint8Array([0x10, 0x20, 0x30]));
    expect(writer.toUint8Array()).toEqual(new Uint8Array([0x10, 0x20, 0x30]));
  });

  it('concatenates multiple writes', () => {
    const writer = new BinaryWriter();
    writer.writeU8(0x01);
    writer.writeU16LE(0x03_02);
    expect(writer.toUint8Array()).toEqual(new Uint8Array([0x01, 0x02, 0x03]));
  });

  it('reports size', () => {
    const writer = new BinaryWriter();
    writer.writeU32LE(0);
    expect(writer.size).toBe(4);
  });
});

describe('BinaryReader <-> BinaryWriter round-trip', () => {
  it('round-trips U8, U16LE, U32LE, and strings', () => {
    const writer = new BinaryWriter();
    writer.writeU8(0xff);
    writer.writeU16LE(0xab_cd);
    writer.writeU32LE(0xde_ad_be_ef);
    writer.writeString('Test');

    const reader = new BinaryReader(writer.toUint8Array());
    expect(reader.readU8()).toBe(0xff);
    expect(reader.readU16LE()).toBe(0xab_cd);
    expect(reader.readU32LE()).toBe(0xde_ad_be_ef);
    expect(reader.readString()).toBe('Test');
  });
});
