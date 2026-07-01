import type { ArtworkAsset, EditorState } from "./types";

export type RenderLayer = "composite" | "foreground" | "background";

interface RenderOptions {
  layer?: RenderLayer;
  round?: boolean;
}

export function createIconCanvas(
  size: number,
  editor: EditorState,
  artwork: ArtworkAsset | null,
  options: RenderOptions = {}
) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  renderIcon(canvas, editor, artwork, options);
  return canvas;
}

export function renderIcon(
  canvas: HTMLCanvasElement,
  editor: EditorState,
  artwork: ArtworkAsset | null,
  options: RenderOptions = {}
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas rendering is not available in this browser.");
  }

  const size = canvas.width;
  const layer = options.layer ?? "composite";
  ctx.clearRect(0, 0, size, size);

  if (options.round) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
  }

  if (layer !== "foreground") {
    drawBackground(ctx, size, editor);
  }

  if (layer !== "background" && artwork) {
    drawArtwork(ctx, size, editor, artwork.image);
  }

  if (options.round) {
    ctx.restore();
  }
}

function drawBackground(ctx: CanvasRenderingContext2D, size: number, editor: EditorState) {
  if (editor.backgroundMode === "solid") {
    ctx.fillStyle = editor.backgroundStart;
  } else {
    const radians = (editor.gradientAngle * Math.PI) / 180;
    const radius = Math.abs(Math.cos(radians)) + Math.abs(Math.sin(radians));
    const dx = (Math.cos(radians) / radius) * size * 0.5;
    const dy = (Math.sin(radians) / radius) * size * 0.5;
    const gradient = ctx.createLinearGradient(
      size * 0.5 - dx,
      size * 0.5 - dy,
      size * 0.5 + dx,
      size * 0.5 + dy
    );
    gradient.addColorStop(0, editor.backgroundStart);
    gradient.addColorStop(1, editor.backgroundEnd);
    ctx.fillStyle = gradient;
  }
  ctx.fillRect(0, 0, size, size);
}

function drawArtwork(
  ctx: CanvasRenderingContext2D,
  size: number,
  editor: EditorState,
  image: HTMLImageElement
) {
  const maxDimension = size * 0.6 * (editor.artworkScale / 100);
  const aspect = image.naturalWidth / image.naturalHeight;
  const width = aspect >= 1 ? maxDimension : maxDimension * aspect;
  const height = aspect >= 1 ? maxDimension / aspect : maxDimension;
  const x = size * 0.5 + (editor.artworkOffsetX / 100) * size;
  const y = size * 0.5 + (editor.artworkOffsetY / 100) * size;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((editor.artworkRotation * Math.PI) / 180);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  if (editor.artworkShadow > 0) {
    ctx.shadowColor = "rgba(0, 0, 0, 0.42)";
    ctx.shadowBlur = size * (editor.artworkShadow / 100) * 0.12;
    ctx.shadowOffsetY = size * (editor.artworkShadow / 100) * 0.045;
  }

  ctx.drawImage(image, -width / 2, -height / 2, width, height);
  ctx.restore();
}

export function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("The browser could not encode the icon as PNG."));
      }
    }, "image/png");
  });
}

