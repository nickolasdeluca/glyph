export type BackgroundMode = "solid" | "gradient";
export type ExportTarget = "ios" | "android" | "both";
export type PreviewMask = "ios" | "android" | "square";

export interface EditorState {
  backgroundMode: BackgroundMode;
  backgroundStart: string;
  backgroundEnd: string;
  gradientAngle: number;
  artworkScale: number;
  artworkOffsetX: number;
  artworkOffsetY: number;
  artworkRotation: number;
  artworkShadow: number;
  exportTarget: ExportTarget;
  previewMask: PreviewMask;
}

export interface ArtworkAsset {
  image: HTMLImageElement;
  name: string;
  url: string;
}

export const defaultEditor: EditorState = {
  backgroundMode: "gradient",
  backgroundStart: "#294DC7",
  backgroundEnd: "#0E1839",
  gradientAngle: 145,
  artworkScale: 100,
  artworkOffsetX: 0,
  artworkOffsetY: 0,
  artworkRotation: 0,
  artworkShadow: 18,
  exportTarget: "both",
  previewMask: "ios"
};

