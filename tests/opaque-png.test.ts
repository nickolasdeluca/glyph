import { describe, expect, test } from "bun:test";
import { inflateSync } from "node:zlib";
import { assertPngHasNoAlpha, encodeOpaquePng } from "../src/opaque-png";

describe("opaque PNG encoder", () => {
  test("writes RGB PNG data without an alpha channel", async () => {
    const blob = await encodeOpaquePng(
      2,
      1,
      Uint8Array.of(255, 0, 128, 255, 12, 34, 56, 255)
    );
    const png = new Uint8Array(await blob.arrayBuffer());

    expect(png[24]).toBe(8);
    expect(png[25]).toBe(2);
    expect(chunkTypes(png)).toEqual(["IHDR", "IDAT", "IEND"]);
    expect(inflateIdat(png)).toEqual(Uint8Array.of(1, 255, 0, 128, 13, 34, 184));
    expect(() => assertPngHasNoAlpha(png)).not.toThrow();
  });

  test("rejects source pixels that are not fully opaque", async () => {
    await expect(encodeOpaquePng(1, 1, Uint8Array.of(20, 30, 40, 254))).rejects.toThrow(
      "transparent pixels"
    );
  });

  test("rejects PNG color types that contain alpha", () => {
    const rgbaHeader = Uint8Array.of(
      137, 80, 78, 71, 13, 10, 26, 10,
      0, 0, 0, 13, 73, 72, 68, 82,
      0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0,
      0, 0, 0, 0
    );

    expect(() => assertPngHasNoAlpha(rgbaHeader)).toThrow("alpha channel");
  });
});

function chunkTypes(png: Uint8Array) {
  const types: string[] = [];
  let offset = 8;
  while (offset + 12 <= png.length) {
    const length = new DataView(png.buffer).getUint32(offset);
    const type = String.fromCharCode(...png.subarray(offset + 4, offset + 8));
    types.push(type);
    offset += length + 12;
  }
  return types;
}

function inflateIdat(png: Uint8Array) {
  let offset = 8;
  while (offset + 12 <= png.length) {
    const length = new DataView(png.buffer).getUint32(offset);
    const type = String.fromCharCode(...png.subarray(offset + 4, offset + 8));
    if (type === "IDAT") {
      return new Uint8Array(inflateSync(png.subarray(offset + 8, offset + 8 + length)));
    }
    offset += length + 12;
  }
  throw new Error("Missing IDAT chunk.");
}

