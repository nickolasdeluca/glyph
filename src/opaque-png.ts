const PNG_SIGNATURE = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10);
const CRC_TABLE = createCrcTable();

export async function canvasToOpaquePngBlob(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas rendering is not available in this browser.");
  }

  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return encodeOpaquePng(canvas.width, canvas.height, image.data);
}

export async function encodeOpaquePng(
  width: number,
  height: number,
  rgba: Uint8Array | Uint8ClampedArray
) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error("PNG dimensions must be positive integers.");
  }

  if (rgba.length !== width * height * 4) {
    throw new Error("RGBA data does not match the requested PNG dimensions.");
  }

  const filtered = rgbSubScanlines(width, height, rgba);
  const compressed = await compressZlib(filtered);
  const header = new Uint8Array(13);
  const headerView = new DataView(header.buffer);
  headerView.setUint32(0, width);
  headerView.setUint32(4, height);
  header[8] = 8;
  header[9] = 2; // PNG color type 2: RGB, with no alpha channel.
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  const png = concatenate([
    PNG_SIGNATURE,
    pngChunk("IHDR", header),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", new Uint8Array())
  ]);

  assertPngHasNoAlpha(png);
  return new Blob([png], { type: "image/png" });
}

export function assertPngHasNoAlpha(png: Uint8Array) {
  if (png.length < 33 || !PNG_SIGNATURE.every((byte, index) => png[index] === byte)) {
    throw new Error("The encoded iOS icon is not a valid PNG.");
  }

  let offset = PNG_SIGNATURE.length;
  let foundHeader = false;

  while (offset + 12 <= png.length) {
    const length = readUint32(png, offset);
    const type = String.fromCharCode(...png.subarray(offset + 4, offset + 8));
    const dataStart = offset + 8;
    const nextOffset = dataStart + length + 4;

    if (nextOffset > png.length) {
      throw new Error("The encoded iOS PNG contains a malformed chunk.");
    }

    if (type === "IHDR") {
      const colorType = png[dataStart + 9];
      if (colorType === 4 || colorType === 6) {
        throw new Error("The encoded iOS PNG still contains an alpha channel.");
      }
      foundHeader = true;
    }

    if (type === "tRNS") {
      throw new Error("The encoded iOS PNG contains transparency metadata.");
    }

    offset = nextOffset;
    if (type === "IEND") {
      break;
    }
  }

  if (!foundHeader) {
    throw new Error("The encoded iOS PNG is missing its header.");
  }
}

function rgbSubScanlines(
  width: number,
  height: number,
  rgba: Uint8Array | Uint8ClampedArray
) {
  const rowLength = width * 3 + 1;
  const filtered = new Uint8Array(rowLength * height);

  for (let y = 0; y < height; y += 1) {
    let outputOffset = y * rowLength;
    filtered[outputOffset] = 1; // Sub filter.
    outputOffset += 1;

    for (let x = 0; x < width; x += 1) {
      const inputOffset = (y * width + x) * 4;
      if (rgba[inputOffset + 3] !== 255) {
        throw new Error("The iOS icon composition contains transparent pixels.");
      }

      for (let channel = 0; channel < 3; channel += 1) {
        const current = rgba[inputOffset + channel];
        const left = x === 0 ? 0 : rgba[inputOffset - 4 + channel];
        filtered[outputOffset] = (current - left + 256) & 0xff;
        outputOffset += 1;
      }
    }
  }

  return filtered;
}

async function compressZlib(data: Uint8Array) {
  if (typeof CompressionStream === "undefined") {
    throw new Error("This browser cannot create alpha-free iOS PNG files.");
  }

  const stream = new Blob([Uint8Array.from(data)])
    .stream()
    .pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function pngChunk(type: string, data: Uint8Array) {
  const typeBytes = Uint8Array.from(type, (character) => character.charCodeAt(0));
  const chunk = new Uint8Array(data.length + 12);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.length);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  view.setUint32(data.length + 8, crc32(typeBytes, data));
  return chunk;
}

function crc32(...parts: Uint8Array[]) {
  let crc = 0xffffffff;
  for (const part of parts) {
    for (const byte of part) {
      crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createCrcTable() {
  const table = new Uint32Array(256);
  for (let index = 0; index < table.length; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
}

function concatenate(parts: Uint8Array[]) {
  const output = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function readUint32(bytes: Uint8Array, offset: number) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset);
}
