class BinaryReader {
  #cursor = 0;
  #view: DataView;

  constructor(private buffer: Uint8Array) {
    this.#view = new DataView(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength,
    );
  }

  get offset(): number {
    return this.#cursor;
  }

  get remaining(): number {
    return this.buffer.byteLength - this.#cursor;
  }

  readBytes(length: number): Uint8Array {
    const bytes = this.buffer.slice(this.#cursor, this.#cursor + length);
    this.#cursor += length;
    return bytes;
  }

  readString(): string {
    const length = this.readU16LE();
    const bytes = this.buffer.slice(this.#cursor, this.#cursor + length * 2);
    this.#cursor += length * 2;
    return new TextDecoder('utf-16le').decode(bytes);
  }

  readU8(): number {
    const value = this.#view.getUint8(this.#cursor);
    this.#cursor += 1;
    return value;
  }

  readU16LE(): number {
    const value = this.#view.getUint16(this.#cursor, true);
    this.#cursor += 2;
    return value;
  }

  readU32LE(): number {
    const value = this.#view.getUint32(this.#cursor, true);
    this.#cursor += 4;
    return value;
  }

  seek(offset: number): void {
    this.#cursor = offset;
  }
}

export default BinaryReader;
