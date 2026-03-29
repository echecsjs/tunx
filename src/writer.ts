class BinaryWriter {
  #chunks: Uint8Array[] = [];
  #size = 0;

  get size(): number {
    return this.#size;
  }

  toUint8Array(): Uint8Array {
    const result = new Uint8Array(this.#size);
    let offset = 0;
    for (const chunk of this.#chunks) {
      result.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return result;
  }

  writeBytes(bytes: Uint8Array): void {
    this.#chunks.push(bytes);
    this.#size += bytes.byteLength;
  }

  writeString(value: string): void {
    this.writeU16LE(value.length);
    const encoded = new Uint8Array(value.length * 2);
    const view = new DataView(encoded.buffer);
    for (let index = 0; index < value.length; index++) {
      view.setUint16(index * 2, value.codePointAt(index) ?? 0, true);
    }
    this.writeBytes(encoded);
  }

  writeU8(value: number): void {
    const bytes = new Uint8Array(1);
    bytes[0] = value;
    this.#chunks.push(bytes);
    this.#size += 1;
  }

  writeU16LE(value: number): void {
    const bytes = new Uint8Array(2);
    new DataView(bytes.buffer).setUint16(0, value, true);
    this.#chunks.push(bytes);
    this.#size += 2;
  }

  writeU32LE(value: number): void {
    const bytes = new Uint8Array(4);
    new DataView(bytes.buffer).setUint32(0, value, true);
    this.#chunks.push(bytes);
    this.#size += 4;
  }
}

export default BinaryWriter;
