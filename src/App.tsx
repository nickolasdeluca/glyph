import {
  Check,
  ChevronRight,
  Download,
  Image as ImageIcon,
  Layers3,
  LoaderCircle,
  Move,
  Palette,
  RotateCcw,
  Sparkles,
  Upload,
  X
} from "lucide-react";
import {
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";
import { exportIconPackage, outputSummary } from "./export-icons";
import { renderIcon } from "./render";
import {
  defaultEditor,
  type ArtworkAsset,
  type BackgroundMode,
  type EditorState,
  type ExportTarget,
  type PreviewMask
} from "./types";

const colorPresets = [
  ["#294DC7", "#0E1839"],
  ["#F4EFE7", "#CFD8EA"],
  ["#D34D58", "#501C3A"],
  ["#48C6A3", "#073C43"],
  ["#FFBE63", "#D84B38"],
  ["#121318", "#343844"]
] as const;

export default function App() {
  const [editor, setEditor] = useState(defaultEditor);
  const [artwork, setArtwork] = useState<ArtworkAsset | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const updateEditor = useCallback((patch: Partial<EditorState>) => {
    setEditor((current) => ({ ...current, ...patch }));
  }, []);

  const loadArtwork = useCallback((file: File) => {
    const isSupported =
      file.type.startsWith("image/") || /\.(png|jpe?g|webp|svg)$/i.test(file.name);

    if (!isSupported) {
      setError("Choose a PNG, JPG, WebP, or SVG artwork file.");
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setArtwork({ image, name: file.name, url });
      setError(null);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      setError("Glyph could not read that artwork file.");
    };
    image.src = url;
  }, []);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const image = Array.from(event.clipboardData?.files ?? []).find((file) =>
        file.type.startsWith("image/")
      );
      if (image) {
        loadArtwork(image);
      }
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [loadArtwork]);

  useEffect(() => {
    return () => {
      if (artwork?.url.startsWith("blob:")) {
        URL.revokeObjectURL(artwork.url);
      }
    };
  }, [artwork]);

  function onFileInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      loadArtwork(file);
    }
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = Array.from(event.dataTransfer.files).find(
      (candidate) =>
        candidate.type.startsWith("image/") || /\.(png|jpe?g|webp|svg)$/i.test(candidate.name)
    );
    if (file) {
      loadArtwork(file);
    }
  }

  async function downloadPackage() {
    if (!artwork) {
      inputRef.current?.click();
      return;
    }

    setIsExporting(true);
    setError(null);
    try {
      const blob = await exportIconPackage(editor, artwork);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "Glyph-Assets.zip";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "The icon export failed.");
    } finally {
      setIsExporting(false);
    }
  }

  const visibleOutputs =
    editor.exportTarget === "both" ? "iOS + Android" : editor.exportTarget === "ios" ? "iOS" : "Android";

  return (
    <main className="app-shell">
      <input
        ref={inputRef}
        hidden
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={onFileInput}
      />

      <section className="preview-pane">
        <header className="topbar">
          <div className="document-status">
            <span className={artwork ? "status-dot ready" : "status-dot"} />
            <span>{artwork ? artwork.name : "Untitled icon"}</span>
          </div>

          <Segmented<PreviewMask>
            ariaLabel="Preview mask"
            className="preview-switcher"
            value={editor.previewMask}
            options={[
              ["ios", "iOS"],
              ["android", "Android"],
              ["square", "Source"]
            ]}
            onChange={(previewMask) => updateEditor({ previewMask })}
          />

          <button
            className="icon-button topbar-action"
            type="button"
            title="Reset design"
            aria-label="Reset design"
            onClick={() =>
              setEditor((current) => ({
                ...defaultEditor,
                exportTarget: current.exportTarget,
                previewMask: current.previewMask
              }))
            }
          >
            <RotateCcw size={16} strokeWidth={1.8} />
          </button>
        </header>

        <section
          className={`canvas-host ${isDragging ? "dragging" : ""}`}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (event.currentTarget === event.target) {
              setIsDragging(false);
            }
          }}
          onDrop={onDrop}
        >
          <div className="studio-glow" />
          <div className="canvas-stage">
            <div className="artboard-measure top-measure">
              <span />
              <b>1024 px</b>
              <span />
            </div>

            <IconPreview
              editor={editor}
              artwork={artwork}
              onPick={() => inputRef.current?.click()}
            />

            <div className="preview-meta">
              <span>Master artwork</span>
              <i />
              <span>RGB PNG</span>
              <i />
              <span>Mask preview only</span>
            </div>
          </div>

          <div className="size-dock" aria-label="Icon size previews">
            <MiniPreview
              label="Store"
              detail="1024"
              displaySize={68}
              editor={editor}
              artwork={artwork}
            />
            <MiniPreview
              label="Home"
              detail={editor.previewMask === "android" ? "192" : "180"}
              displaySize={52}
              editor={editor}
              artwork={artwork}
            />
            <MiniPreview
              label="Settings"
              detail={editor.previewMask === "android" ? "72" : "58"}
              displaySize={34}
              editor={editor}
              artwork={artwork}
            />
          </div>

          {isDragging && (
            <div className="drop-overlay">
              <Upload size={24} />
              <strong>Drop artwork to replace</strong>
            </div>
          )}
        </section>
      </section>

      <aside className="sidebar">
        <header className="brand-header">
          <div>
            <h1>glyph.</h1>
            <p>App icon studio</p>
          </div>
          <GlyphMark />
        </header>

        <div className="controls">
          <PanelSection icon={<ImageIcon size={15} />} title="Artwork" index="01">
            <button
              type="button"
              className={`artwork-file ${artwork ? "has-artwork" : ""}`}
              onClick={() => inputRef.current?.click()}
            >
              <span className="file-icon">
                {artwork ? <Check size={17} /> : <Upload size={17} />}
              </span>
              <span className="file-copy">
                <strong>{artwork ? artwork.name : "Choose your artwork"}</strong>
                <small>{artwork ? "Click to replace" : "PNG, JPG, WebP or SVG"}</small>
              </span>
              <ChevronRight size={16} />
            </button>

            {artwork && (
              <button className="remove-artwork" type="button" onClick={() => setArtwork(null)}>
                <X size={13} /> Remove artwork
              </button>
            )}

            <div className="two-column-controls">
              <RangeControl
                label="Size"
                value={editor.artworkScale}
                min={35}
                max={145}
                suffix="%"
                disabled={!artwork}
                onChange={(artworkScale) => updateEditor({ artworkScale })}
              />
              <RangeControl
                label="Rotation"
                value={editor.artworkRotation}
                min={-180}
                max={180}
                suffix="°"
                disabled={!artwork}
                onChange={(artworkRotation) => updateEditor({ artworkRotation })}
              />
            </div>

            <RangeControl
              icon={<Move size={12} />}
              label="Horizontal"
              value={editor.artworkOffsetX}
              min={-35}
              max={35}
              disabled={!artwork}
              onChange={(artworkOffsetX) => updateEditor({ artworkOffsetX })}
            />
            <RangeControl
              icon={<Move className="vertical-icon" size={12} />}
              label="Vertical"
              value={editor.artworkOffsetY}
              min={-35}
              max={35}
              disabled={!artwork}
              onChange={(artworkOffsetY) => updateEditor({ artworkOffsetY })}
            />
            <RangeControl
              icon={<Sparkles size={12} />}
              label="Soft shadow"
              value={editor.artworkShadow}
              min={0}
              max={50}
              suffix="%"
              disabled={!artwork}
              onChange={(artworkShadow) => updateEditor({ artworkShadow })}
            />
          </PanelSection>

          <PanelSection icon={<Palette size={15} />} title="Background" index="02">
            <Segmented<BackgroundMode>
              ariaLabel="Background style"
              value={editor.backgroundMode}
              options={[
                ["solid", "Solid"],
                ["gradient", "Gradient"]
              ]}
              onChange={(backgroundMode) => updateEditor({ backgroundMode })}
            />

            <div className="color-fields">
              <ColorControl
                label={editor.backgroundMode === "gradient" ? "Start" : "Color"}
                value={editor.backgroundStart}
                onChange={(backgroundStart) => updateEditor({ backgroundStart })}
              />
              {editor.backgroundMode === "gradient" && (
                <ColorControl
                  label="End"
                  value={editor.backgroundEnd}
                  onChange={(backgroundEnd) => updateEditor({ backgroundEnd })}
                />
              )}
            </div>

            <div className="preset-row" aria-label="Background presets">
              {colorPresets.map(([start, end]) => (
                <button
                  key={`${start}-${end}`}
                  type="button"
                  className={
                    editor.backgroundStart === start && editor.backgroundEnd === end ? "active" : ""
                  }
                  style={{ background: `linear-gradient(135deg, ${start}, ${end})` }}
                  title={`${start} to ${end}`}
                  aria-label={`Use ${start} to ${end} background`}
                  onClick={() =>
                    updateEditor({
                      backgroundStart: start,
                      backgroundEnd: end,
                      backgroundMode: "gradient"
                    })
                  }
                />
              ))}
            </div>

            {editor.backgroundMode === "gradient" && (
              <RangeControl
                label="Direction"
                value={editor.gradientAngle}
                min={0}
                max={360}
                suffix="°"
                onChange={(gradientAngle) => updateEditor({ gradientAngle })}
              />
            )}
          </PanelSection>

          <PanelSection icon={<Layers3 size={15} />} title="Output" index="03">
            <Segmented<ExportTarget>
              ariaLabel="Export target"
              value={editor.exportTarget}
              options={[
                ["ios", "iOS"],
                ["android", "Android"],
                ["both", "Both"]
              ]}
              onChange={(exportTarget) => updateEditor({ exportTarget })}
            />

            <div className="output-list">
              <OutputRow
                active={editor.exportTarget !== "android"}
                label="iOS + iPadOS"
                detail={outputSummary.ios.label}
              />
              <OutputRow
                active={editor.exportTarget !== "ios"}
                label="Android"
                detail={outputSummary.android.label}
              />
            </div>

            <p className="output-note">
              Exports are project-ready: Xcode asset metadata and Android density folders are included.
            </p>
          </PanelSection>
        </div>

        <footer className="export-footer">
          {error && <p className="error-message">{error}</p>}
          <div className="export-summary">
            <span>Export package</span>
            <strong>{visibleOutputs}</strong>
          </div>
          <button
            type="button"
            className="export-button"
            disabled={isExporting}
            onClick={() => void downloadPackage()}
          >
            {isExporting ? (
              <LoaderCircle className="spin" size={17} />
            ) : artwork ? (
              <Download size={17} />
            ) : (
              <Upload size={17} />
            )}
            {isExporting ? "Building package…" : artwork ? "Export icon set" : "Add artwork to export"}
          </button>
        </footer>
      </aside>
    </main>
  );
}

function IconPreview({
  editor,
  artwork,
  onPick
}: {
  editor: EditorState;
  artwork: ArtworkAsset | null;
  onPick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      renderIcon(canvasRef.current, editor, artwork);
    }
  }, [artwork, editor]);

  return (
    <div className={`artboard-frame mask-${editor.previewMask}`}>
      <canvas ref={canvasRef} width={1024} height={1024} />
      {editor.previewMask === "android" && (
        <div className="safe-zone" aria-hidden="true">
          <span>Safe zone</span>
        </div>
      )}
      {!artwork && (
        <button className="empty-artwork" type="button" onClick={onPick}>
          <span>
            <Upload size={20} />
          </span>
          <strong>Drop your artwork here</strong>
          <small>or click to choose · paste works too</small>
        </button>
      )}
    </div>
  );
}

function MiniPreview({
  editor,
  artwork,
  displaySize,
  label,
  detail
}: {
  editor: EditorState;
  artwork: ArtworkAsset | null;
  displaySize: number;
  label: string;
  detail: string;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (ref.current) {
      renderIcon(ref.current, editor, artwork);
    }
  }, [artwork, editor]);

  return (
    <div className="mini-preview">
      <div
        className={`mini-icon mask-${editor.previewMask}`}
        style={{ width: displaySize, height: displaySize }}
      >
        <canvas ref={ref} width={192} height={192} />
      </div>
      <span>
        <strong>{label}</strong>
        <small>{detail} px</small>
      </span>
    </div>
  );
}

function PanelSection({
  icon,
  title,
  index,
  children
}: {
  icon: ReactNode;
  title: string;
  index: string;
  children: ReactNode;
}) {
  return (
    <section className="panel-section">
      <header>
        <span className="section-icon">{icon}</span>
        <h2>{title}</h2>
        <small>{index}</small>
      </header>
      <div className="panel-content">{children}</div>
    </section>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className = ""
}: {
  value: T;
  options: ReadonlyArray<readonly [T, string]>;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div className={`segmented ${className}`} role="group" aria-label={ariaLabel}>
      {options.map(([option, label]) => (
        <button
          key={option}
          type="button"
          className={value === option ? "active" : ""}
          aria-pressed={value === option}
          onClick={() => onChange(option)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function RangeControl({
  label,
  value,
  min,
  max,
  onChange,
  suffix = "",
  disabled = false,
  icon
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  suffix?: string;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  const progress = ((value - min) / (max - min)) * 100;
  return (
    <label className={`range-control ${disabled ? "disabled" : ""}`}>
      <span>
        <span className="range-label">
          {icon}
          {label}
        </span>
        <output>
          {value}
          {suffix}
        </output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        style={{ "--range-progress": `${progress}%` } as React.CSSProperties}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function ColorControl({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="color-control">
      <span>{label}</span>
      <span className="color-input-wrap">
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
        <code>{value.toUpperCase()}</code>
      </span>
    </label>
  );
}

function OutputRow({ active, label, detail }: { active: boolean; label: string; detail: string }) {
  return (
    <div className={`output-row ${active ? "active" : ""}`}>
      <span className="output-check">{active && <Check size={12} strokeWidth={2.5} />}</span>
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
    </div>
  );
}

function GlyphMark() {
  return (
    <svg className="glyph-mark" viewBox="0 0 64 64" role="img" aria-label="Glyph logo">
      <defs>
        <linearGradient id="glyph-gradient" x1="8" y1="5" x2="56" y2="60">
          <stop stopColor="#85A7FF" />
          <stop offset="1" stopColor="#335BE4" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="#15171C" />
      <path
        fill="url(#glyph-gradient)"
        fillRule="evenodd"
        d="M21.5 14C13.5 14 7 20.5 7 28.5S13.5 43 21.5 43H28v6.5c0 8 6.5 14.5 14.5 14.5S57 57.5 57 49.5 50.5 35 42.5 35H36v-6.5C36 20.5 29.5 14 21.5 14Zm0 8a6.5 6.5 0 1 0 0 13H28v-6.5a6.5 6.5 0 0 0-6.5-6.5Zm21 21H36v6.5a6.5 6.5 0 1 0 6.5-6.5Z"
      />
    </svg>
  );
}

