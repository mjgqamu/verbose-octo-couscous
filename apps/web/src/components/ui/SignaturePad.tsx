import { useRef, useState, useEffect, useCallback } from "react";
import { Eraser, Check } from "lucide-react";

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onCancel?: () => void;
}

export function SignaturePad({ onSave, onCancel }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const getCanvas = () => canvasRef.current;

  const getCtx = () => {
    const canvas = getCanvas();
    return canvas?.getContext("2d") ?? null;
  };

  const setupCanvas = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Set display size
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = "200px";

    // Set actual canvas size accounting for device pixel ratio
    canvas.width = rect.width * dpr;
    canvas.height = 200 * dpr;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1e3a5f";
    }
  }, []);

  useEffect(() => {
    setupCanvas();
    const handleResize = () => setupCanvas();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setupCanvas]);

  const getPosition = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const canvas = getCanvas();
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      const touch = e.touches[0] || (e as React.TouchEvent).changedTouches[0];
      if (!touch) return null;
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }

    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getPosition(e);
    if (!pos) return;

    const ctx = getCtx();
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasContent(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;

    const pos = getPosition(e);
    if (!pos) return;

    const ctx = getCtx();
    if (!ctx) return;

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const ctx = getCtx();
    ctx?.closePath();
  };

  const handleClear = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      setHasContent(false);
    }
  };

  const handleSave = () => {
    const canvas = getCanvas();
    if (!canvas || !hasContent) return;
    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h4 className="text-sm font-semibold text-gray-900 mb-3">Customer Signature</h4>

      <div
        ref={containerRef}
        className="w-full border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 overflow-hidden touch-none select-none"
      >
        <canvas
          ref={canvasRef}
          className="w-full h-[200px] cursor-crosshair"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
      </div>

      {!hasContent && (
        <p className="text-xs text-gray-400 text-center mt-2">Sign above using mouse or touch</p>
      )}

      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={handleClear}
          disabled={!hasContent}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Eraser className="w-4 h-4" /> Clear
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={!hasContent}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 rounded-lg transition ml-auto disabled:cursor-not-allowed"
        >
          <Check className="w-4 h-4" /> Save Signature
        </button>
      </div>
    </div>
  );
}
