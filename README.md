# Glyph

Glyph is a focused app-icon artwork generator for iOS, iPadOS, and Android. Add one transparent artwork file, compose it over a solid color or gradient, preview the platform masks, and export project-ready asset folders.

## Current capabilities

- PNG, JPG, WebP, and SVG artwork import by picker, drag and drop, or paste.
- Background color and gradient controls.
- Artwork scale, position, rotation, and shadow controls.
- Non-destructive iOS, Android, and square source previews.
- Xcode-ready `Assets.xcassets/AppIcon.appiconset` export with `Contents.json`.
- Alpha-free RGB encoding for every iOS and App Store PNG.
- Android `mipmap-*` folders with legacy, round, and adaptive icon resources.
- 512 × 512 Google Play listing icon.
- Local-only canvas rendering; artwork is not uploaded anywhere.

## Development

```sh
bun install
bun run dev
```

Create a production build with:

```sh
bun run build
```

## Export matrix

The iOS package contains the conventional universal iPhone and iPad asset-catalog matrix:

- 20 pt at 1×, 2×, and 3×
- 29 pt at 1×, 2×, and 3×
- 40 pt at 1×, 2×, and 3×
- 60 pt at 2× and 3×
- 76 pt at 1× and 2×
- 83.5 pt at 2×
- 1024 × 1024 px App Store marketing icon at 1×

The Android package contains legacy launcher icons at 48 dp, adaptive foreground and background layers at 108 dp, round legacy variants, and all five density buckets from mdpi through xxxhdpi.

Platform corner and shape masks are preview-only. Exported iOS and primary Android PNGs remain square so the operating system can apply the appropriate mask.
