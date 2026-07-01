import JSZip from "jszip";
import { canvasToOpaquePngBlob } from "./opaque-png";
import { canvasToBlob, createIconCanvas } from "./render";
import type { ArtworkAsset, EditorState, ExportTarget } from "./types";

interface AppleIconSpec {
  filename: string;
  idiom: "iphone" | "ipad" | "ios-marketing";
  points: number;
  scale: 1 | 2 | 3;
}

const appleIcons: AppleIconSpec[] = [
  { filename: "AppIcon-20@2x.png", idiom: "iphone", points: 20, scale: 2 },
  { filename: "AppIcon-20@3x.png", idiom: "iphone", points: 20, scale: 3 },
  { filename: "AppIcon-29@2x.png", idiom: "iphone", points: 29, scale: 2 },
  { filename: "AppIcon-29@3x.png", idiom: "iphone", points: 29, scale: 3 },
  { filename: "AppIcon-40@2x.png", idiom: "iphone", points: 40, scale: 2 },
  { filename: "AppIcon-40@3x.png", idiom: "iphone", points: 40, scale: 3 },
  { filename: "AppIcon-60@2x.png", idiom: "iphone", points: 60, scale: 2 },
  { filename: "AppIcon-60@3x.png", idiom: "iphone", points: 60, scale: 3 },
  { filename: "AppIcon-20@1x-ipad.png", idiom: "ipad", points: 20, scale: 1 },
  { filename: "AppIcon-20@2x-ipad.png", idiom: "ipad", points: 20, scale: 2 },
  { filename: "AppIcon-29@1x-ipad.png", idiom: "ipad", points: 29, scale: 1 },
  { filename: "AppIcon-29@2x-ipad.png", idiom: "ipad", points: 29, scale: 2 },
  { filename: "AppIcon-40@1x-ipad.png", idiom: "ipad", points: 40, scale: 1 },
  { filename: "AppIcon-40@2x-ipad.png", idiom: "ipad", points: 40, scale: 2 },
  { filename: "AppIcon-76@1x-ipad.png", idiom: "ipad", points: 76, scale: 1 },
  { filename: "AppIcon-76@2x-ipad.png", idiom: "ipad", points: 76, scale: 2 },
  { filename: "AppIcon-83.5@2x-ipad.png", idiom: "ipad", points: 83.5, scale: 2 },
  { filename: "AppIcon-1024.png", idiom: "ios-marketing", points: 1024, scale: 1 }
];

const androidDensities = [
  { name: "mdpi", ratio: 1 },
  { name: "hdpi", ratio: 1.5 },
  { name: "xhdpi", ratio: 2 },
  { name: "xxhdpi", ratio: 3 },
  { name: "xxxhdpi", ratio: 4 }
] as const;

export async function exportIconPackage(editor: EditorState, artwork: ArtworkAsset) {
  const zip = new JSZip();
  const root = zip.folder("Glyph-Assets")!;

  if (editor.exportTarget === "ios" || editor.exportTarget === "both") {
    await addAppleAssets(root, editor, artwork);
  }

  if (editor.exportTarget === "android" || editor.exportTarget === "both") {
    await addAndroidAssets(root, editor, artwork);
  }

  root.file(
    "README.txt",
    packageReadme(editor.exportTarget)
  );

  return zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });
}

async function addAppleAssets(root: JSZip, editor: EditorState, artwork: ArtworkAsset) {
  const folder = root.folder("ios/Assets.xcassets/AppIcon.appiconset")!;

  for (const icon of appleIcons) {
    const pixels = Math.round(icon.points * icon.scale);
    const canvas = createIconCanvas(pixels, editor, artwork);
    folder.file(icon.filename, await canvasToOpaquePngBlob(canvas));
  }

  folder.file(
    "Contents.json",
    JSON.stringify(
      {
        images: appleIcons.map((icon) => ({
          filename: icon.filename,
          idiom: icon.idiom,
          scale: `${icon.scale}x`,
          size: `${icon.points}x${icon.points}`
        })),
        info: { author: "glyph", version: 1 }
      },
      null,
      2
    )
  );
}

async function addAndroidAssets(root: JSZip, editor: EditorState, artwork: ArtworkAsset) {
  const res = root.folder("android/app/src/main/res")!;

  for (const density of androidDensities) {
    const folder = res.folder(`mipmap-${density.name}`)!;
    const legacySize = Math.round(48 * density.ratio);
    const adaptiveSize = Math.round(108 * density.ratio);

    folder.file(
      "ic_launcher.png",
      await canvasToBlob(createIconCanvas(legacySize, editor, artwork))
    );
    folder.file(
      "ic_launcher_round.png",
      await canvasToBlob(createIconCanvas(legacySize, editor, artwork, { round: true }))
    );
    folder.file(
      "ic_launcher_foreground.png",
      await canvasToBlob(
        createIconCanvas(adaptiveSize, editor, artwork, { layer: "foreground" })
      )
    );
    folder.file(
      "ic_launcher_background.png",
      await canvasToBlob(
        createIconCanvas(adaptiveSize, editor, artwork, { layer: "background" })
      )
    );
  }

  const adaptive = res.folder("mipmap-anydpi-v26")!;
  const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`;
  adaptive.file("ic_launcher.xml", adaptiveXml);
  adaptive.file("ic_launcher_round.xml", adaptiveXml);

  root.file(
    "android/play-store-icon.png",
    await canvasToBlob(createIconCanvas(512, editor, artwork))
  );
}

function packageReadme(target: ExportTarget) {
  const lines = [
    "GLYPH APP ICON EXPORT",
    "=====================",
    "",
    "Generated as square PNG artwork. Platform masks are preview-only and are applied by the OS.",
    ""
  ];

  if (target === "ios" || target === "both") {
    lines.push(
      "iOS / iPadOS",
      "Copy ios/Assets.xcassets/AppIcon.appiconset into your Xcode asset catalog.",
      "The set includes alpha-free RGB PNGs for iPhone, iPad, and App Store plus Contents.json.",
      ""
    );
  }

  if (target === "android" || target === "both") {
    lines.push(
      "Android",
      "Merge android/app/src/main/res into your Android app module's res directory.",
      "The package includes legacy, round, and adaptive launcher resources for mdpi through xxxhdpi.",
      "Upload android/play-store-icon.png separately in Google Play Console.",
      ""
    );
  }

  lines.push("Generated by Glyph.");
  return lines.join("\n");
}

export const outputSummary = {
  ios: { files: appleIcons.length, label: "18 PNGs + Contents.json" },
  android: { files: androidDensities.length * 4 + 3, label: "21 PNGs + adaptive XML" }
};
