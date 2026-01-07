import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Header from "../components/Header";
import BottomNavigation from "../components/BottomNavigation";

interface AreaMapItem {
  _id?: string;
  title?: string;
  area?: string;
  description?: string;
  imageUrl: string;
}

export default function Maps() {
  const [items, setItems] = useState<AreaMapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeArea, setActiveArea] = useState<string>("");

  // Area filter dropdown state
  const [areaOpen, setAreaOpen] = useState(false);
  const [areaQuery, setAreaQuery] = useState("");
  const areaWrapRef = useRef<HTMLDivElement | null>(null);

  // Lightbox / Modal state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number>(0);

  // Zoom/Pan state (only for the lightbox image)
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [lastOffset, setLastOffset] = useState({ x: 0, y: 0 });
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const baseDistanceRef = useRef<number | null>(null);
  const baseScaleRef = useRef<number>(1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const lastTapRef = useRef<number>(0);

  const resetTransform = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setLastOffset({ x: 0, y: 0 });
    baseDistanceRef.current = null;
    baseScaleRef.current = 1;
    pointersRef.current.clear();
  }, []);

  const clamp = (val: number, min: number, max: number) =>
    Math.min(max, Math.max(min, val));

  const openViewer = useCallback(
    (idx: number) => {
      setViewerIndex(idx);
      setViewerOpen(true);
      resetTransform();
    },
    [resetTransform],
  );

  const closeViewer = useCallback(() => {
    setViewerOpen(false);
    resetTransform();
  }, [resetTransform]);

  const prevImage = useCallback(() => {
    setViewerIndex((i) => (i - 1 + items.length) % items.length);
    resetTransform();
  }, [items.length, resetTransform]);

  const nextImage = useCallback(() => {
    setViewerIndex((i) => (i + 1) % items.length);
    resetTransform();
  }, [items.length, resetTransform]);

  // Lock body scroll when modal open + keyboard shortcuts
  useEffect(() => {
    if (viewerOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") closeViewer();
        if (e.key === "ArrowLeft") prevImage();
        if (e.key === "ArrowRight") nextImage();
      };
      window.addEventListener("keydown", onKey);
      return () => {
        document.body.style.overflow = original;
        window.removeEventListener("keydown", onKey);
      };
    }
  }, [viewerOpen, closeViewer, prevImage, nextImage]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const q = activeArea ? `?area=${encodeURIComponent(activeArea)}` : "";
      const res = await fetch(`/api/maps${q}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || data?.success === false)
        throw new Error(data?.error || "Failed to load maps");
      setItems(Array.isArray(data?.data) ? data.data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    const onUpdate = () => fetchItems();
    window.addEventListener("areaMapsUpdated", onUpdate);
    return () => window.removeEventListener("areaMapsUpdated", onUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeArea]);

  const areas = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.area) set.add(i.area);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  // Filter areas by search
  const filteredAreas = useMemo(() => {
    const q = areaQuery.trim().toLowerCase();
    if (!q) return areas;
    return areas.filter((a) => a.toLowerCase().includes(q));
  }, [areas, areaQuery]);

  // Safety: clamp viewerIndex if filter changes
  useEffect(() => {
    if (viewerIndex >= items.length) setViewerIndex(0);
  }, [items.length, viewerIndex]);

  // Close dropdown on outside click + Esc
  useEffect(() => {
    if (!areaOpen) return;

    const onDown = (e: MouseEvent | TouchEvent) => {
      const wrap = areaWrapRef.current;
      if (!wrap) return;
      if (!wrap.contains(e.target as Node)) {
        setAreaOpen(false);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAreaOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    window.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown as any);
      window.removeEventListener("keydown", onKey);
    };
  }, [areaOpen]);

  const selectArea = useCallback((val: string) => {
    setActiveArea(val);
    setAreaOpen(false);
    setAreaQuery("");
  }, []);

  const activeAreaLabel = activeArea ? activeArea : "All Areas";

  // ---------- Gesture helpers ----------
  function getTwoPointerDistance(
    a: { x: number; y: number },
    b: { x: number; y: number },
  ) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    const el = containerRef.current;
    if (!el) return;
    el.setPointerCapture?.(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Double-tap / double-click zoom toggle
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      const newScale = scale > 1.5 ? 1 : 2;
      setScale(newScale);
      setOffset({ x: 0, y: 0 });
      setLastOffset({ x: 0, y: 0 });
      baseScaleRef.current = newScale;
      baseDistanceRef.current = null;
    }
    lastTapRef.current = now;
  };

  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const points = [...pointersRef.current.values()];
    if (points.length === 2) {
      const d = getTwoPointerDistance(points[0], points[1]);
      if (baseDistanceRef.current == null) {
        baseDistanceRef.current = d;
        baseScaleRef.current = scale || 1;
        return;
      }
      const factor = d / (baseDistanceRef.current || d);
      let nextScale = clamp(baseScaleRef.current * factor, 1, 4);
      setScale(nextScale);
      const maxOffset = 3000 * (nextScale / 4);
      setOffset((prev) => ({
        x: clamp(prev.x, -maxOffset, maxOffset),
        y: clamp(prev.y, -maxOffset, maxOffset),
      }));
    } else if (points.length === 1) {
      if (scale > 1) {
        // @ts-ignore
        const movementX = e.movementX ?? 0;
        // @ts-ignore
        const movementY = e.movementY ?? 0;
        const maxPan = 3000 * (scale / 2);
        setOffset((o) => ({
          x: clamp(o.x + movementX, -maxPan, maxPan),
          y: clamp(o.y + movementY, -maxPan, maxPan),
        }));
      }
    }
  };

  const onPointerUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) {
      baseDistanceRef.current = null;
      baseScaleRef.current = scale || 1;
      setLastOffset((o) => o);
    }
  };

  const onWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
    }
    const delta = e.deltaY;
    if (Math.abs(delta) > 0) {
      e.preventDefault();
      const direction = delta > 0 ? -1 : 1;
      const zoomStep = 0.08 * direction;
      const next = clamp(scale + zoomStep, 1, 4);
      setScale(next);
    }
  };

  // Prevent touch scrolling/zooming the page while interacting
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const prevent = (ev: TouchEvent) => {
      ev.preventDefault();
    };
    el.addEventListener("touchmove", prevent, { passive: false });
    el.addEventListener("gesturestart" as any, prevent, { passive: false });
    return () => {
      el.removeEventListener("touchmove", prevent as any);
      el.removeEventListener("gesturestart" as any, prevent as any);
    };
  }, [viewerOpen]);

  // Image style derived from scale/offset
  const imgStyle: React.CSSProperties = {
    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
    transition:
      pointersRef.current.size > 0 ? "none" : "transform 120ms ease-out",
    cursor: scale > 1 ? "grab" : "auto",
    touchAction: "none",
    imageRendering: "crisp-edges",
    WebkitImageRendering: "crisp-edges" as any,
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden" as any,
    perspective: 1000,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="p-4 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Maps</h1>
        </div>

        {/* Professional Filter UI (Button + Dropdown) */}
        {areas.length > 0 && (
          <div className="mb-4 flex items-center gap-3 flex-wrap">
            <div ref={areaWrapRef} className="relative">
              <button
                type="button"
                onClick={() => setAreaOpen((s) => !s)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 shadow-sm hover:bg-gray-50 active:scale-[0.99] transition"
                aria-haspopup="listbox"
                aria-expanded={areaOpen}
              >
                <span className="text-sm font-medium">Filter Area</span>
                <span className="text-sm text-gray-600 max-w-[52vw] sm:max-w-[340px] truncate">
                  — {activeAreaLabel}
                </span>
                <span className="ml-1 text-gray-500">{areaOpen ? "▲" : "▼"}</span>
              </button>

              {areaOpen && (
                <div
                  className="absolute z-30 mt-2 w-[92vw] sm:w-[420px] max-w-[92vw] rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden"
                  role="dialog"
                  aria-label="Select area filter"
                >
                  <div className="p-3 border-b border-gray-100">
                    <input
                      value={areaQuery}
                      onChange={(e) => setAreaQuery(e.target.value)}
                      placeholder="Search area..."
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#C70000]/30"
                      autoFocus
                    />
                  </div>

                  <div
                    className="max-h-[45vh] overflow-auto p-2"
                    role="listbox"
                    aria-label="Area options"
                  >
                    <button
                      type="button"
                      onClick={() => selectArea("")}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                        activeArea === ""
                          ? "bg-[#C70000] text-white"
                          : "hover:bg-gray-50 text-gray-800"
                      }`}
                      role="option"
                      aria-selected={activeArea === ""}
                    >
                      All
                    </button>

                    {filteredAreas.length === 0 && (
                      <div className="px-3 py-3 text-sm text-gray-600">
                        No matching area found.
                      </div>
                    )}

                    {filteredAreas.map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => selectArea(a)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                          activeArea === a
                            ? "bg-[#C70000] text-white"
                            : "hover:bg-gray-50 text-gray-800"
                        }`}
                        role="option"
                        aria-selected={activeArea === a}
                        title={a}
                      >
                        <span className="block truncate">{a}</span>
                      </button>
                    ))}
                  </div>

                  <div className="p-2 border-t border-gray-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setAreaOpen(false);
                        setAreaQuery("");
                      }}
                      className="px-3 py-2 text-sm rounded-lg hover:bg-gray-50 text-gray-700"
                    >
                      Close
                    </button>

                    <div className="text-xs text-gray-500 px-2">
                      {items.length} item(s)
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Small hint badge (optional) */}
            <div className="text-xs text-gray-500">
              Tip: search and select to filter maps
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center text-gray-600 py-10">Loading maps...</div>
        )}

        {!loading && items.length === 0 && (
          <div className="text-center text-gray-600 py-10">No maps found.</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it, idx) => (
            <div
              key={it._id ?? `${it.imageUrl}-${idx}`}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden group"
            >
              <button
                type="button"
                onClick={() => openViewer(idx)}
                className="relative block w-full"
                aria-label={`Open ${it.title || it.area || "map"} image`}
              >
                <img
                  src={it.imageUrl}
                  alt={it.title || it.area || "map"}
                  className="w-full h-56 object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  loading="lazy"
                />
                <span className="absolute bottom-2 right-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded">
                  Click to view
                </span>
              </button>
              <div className="p-3">
                <div className="text-sm text-gray-600">{it.area || "—"}</div>
                <div className="font-semibold text-gray-900">
                  {it.title || "Map"}
                </div>
                {it.description && (
                  <div className="text-sm text-gray-700 mt-1 line-clamp-3">
                    {it.description}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
      <BottomNavigation />

      {/* Lightbox / Modal */}
      {viewerOpen && items.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 overscroll-contain"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget && scale <= 1) closeViewer();
          }}
        >
          {/* Close */}
          <button
            type="button"
            onClick={() => {
              if (scale > 1) {
                resetTransform();
              } else {
                closeViewer();
              }
            }}
            className="absolute top-3 right-3 md:top-5 md:right-5 rounded-full bg-white/90 hover:bg-white text-gray-800 shadow px-3 py-1 text-sm transition-all hover:scale-110"
            aria-label={scale > 1 ? "Reset zoom" : "Close"}
            title={
              scale > 1 ? "Click to reset zoom (then close)" : "Close image"
            }
          >
            {scale > 1 ? "Reset ↺" : "Close ✕"}
          </button>

          {/* Prev / Next */}
          {items.length > 1 && (
            <>
              <button
                type="button"
                onClick={prevImage}
                className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 rounded-full bg-white/90 hover:bg-white text-gray-900 shadow px-3 py-2"
                aria-label="Previous image"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={nextImage}
                className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 rounded-full bg-white/90 hover:bg-white text-gray-900 shadow px-3 py-2"
                aria-label="Next image"
              >
                ›
              </button>
            </>
          )}

          {/* Content (pinch-zoom container) */}
          <div
            ref={containerRef}
            className="w-[92vw] h-[82vh] flex items-center justify-center p-2 touch-none select-none"
            style={{
              backgroundColor: "#000",
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={onWheel}
          >
            <img
              ref={imgRef}
              src={items[viewerIndex]?.imageUrl}
              alt={
                items[viewerIndex]?.title || items[viewerIndex]?.area || "map"
              }
              className="max-w-full max-h-full object-contain"
              draggable={false}
              style={imgStyle}
            />
          </div>

          {/* Zoom Level Indicator */}
          {scale > 1 && (
            <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded">
              {Math.round(scale * 100)}%
            </div>
          )}

          {/* Zoom instructions (shown when not zoomed) */}
          {scale === 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-center text-white text-xs px-2 py-1 bg-black/40 rounded max-w-xs">
              📱 Double-tap or pinch to zoom | 🖱️ Scroll to zoom | Drag to pan
            </div>
          )}

          {/* Caption + Reset */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-center text-white text-sm px-3 py-1 bg-black/40 rounded">
            <div className="font-medium">
              {items[viewerIndex]?.title || "Map"}
            </div>
            <div className="opacity-90">
              {items[viewerIndex]?.area || "—"} · {viewerIndex + 1} /{" "}
              {items.length}
            </div>
            {scale > 1 && (
              <button
                onClick={resetTransform}
                className="mt-2 text-xs underline decoration-dotted hover:text-gray-200"
              >
                Reset zoom
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
