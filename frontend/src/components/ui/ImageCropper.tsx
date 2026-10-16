// ImageCropper - Cắt ảnh với khung tỉ lệ cho sẵn (cover, avatar, post)
// Hỗ trợ: kéo ảnh, zoom, di chuyển
import { useEffect, useRef, useState } from "react";
import { Crop, X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageCropperProps {
  imageSrc: string;
  aspectRatio: number; // width / height — vd 1 = vuông, 16/9 = cover
  onConfirm: (croppedBlob: Blob) => void;
  onCancel: () => void;
  title?: string;
}

interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const ImageCropper = ({
  imageSrc,
  aspectRatio,
  onConfirm,
  onCancel,
  title = "Cắt ảnh",
}: ImageCropperProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, ox: 0, oy: 0 });
  const [processing, setProcessing] = useState(false);

  // Load ảnh
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImage(img);
      setImgSize({ w: img.width, h: img.height });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Tính crop box khi container/scale thay đổi
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setContainerSize({
          w: containerRef.current.offsetWidth,
          h: containerRef.current.offsetHeight,
        });
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Tính crop box
  const getCropBox = (): CropBox | null => {
    if (!containerSize.w || !containerSize.h) return null;
    let w = containerSize.w;
    let h = w / aspectRatio;
    if (h > containerSize.h) {
      h = containerSize.h;
      w = h * aspectRatio;
    }
    return {
      x: (containerSize.w - w) / 2,
      y: (containerSize.h - h) / 2,
      width: w,
      height: h,
    };
  };

  const crop = getCropBox();

  // Tính scale & offset mặc định để ảnh vừa crop box
  useEffect(() => {
    if (!image || !crop) return;
    const baseScale = Math.max(crop.width / imgSize.w, crop.height / imgSize.h);
    setScale(baseScale);
    setOffset({
      x: containerSize.w / 2 - (imgSize.w * baseScale) / 2,
      y: containerSize.h / 2 - (imgSize.h * baseScale) / 2,
    });
  }, [image, crop?.width, crop?.height, imgSize.w, imgSize.h, containerSize.w, containerSize.h]);

  // Kéo
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y });
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setOffset({
      x: dragStart.ox + (e.clientX - dragStart.x),
      y: dragStart.oy + (e.clientY - dragStart.y),
    });
  };
  const onMouseUp = () => setDragging(false);

  // Touch events
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    setDragging(true);
    setDragStart({ x: t.clientX, y: t.clientY, ox: offset.x, oy: offset.y });
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return;
    const t = e.touches[0];
    setOffset({
      x: dragStart.ox + (t.clientX - dragStart.x),
      y: dragStart.oy + (t.clientY - dragStart.y),
    });
  };

  // Reset
  const handleReset = () => {
    if (!crop) return;
    const baseScale = Math.max(crop.width / imgSize.w, crop.height / imgSize.h);
    setScale(baseScale);
    setOffset({
      x: containerSize.w / 2 - (imgSize.w * baseScale) / 2,
      y: containerSize.h / 2 - (imgSize.h * baseScale) / 2,
    });
  };

  // Cắt và xuất Blob
  const handleConfirm = async () => {
    if (!image || !crop) return;
    setProcessing(true);
    try {
      const outputW = 1200; // output width max
      const outputH = Math.round(outputW / aspectRatio);
      const canvas = canvasRef.current!;
      canvas.width = outputW;
      canvas.height = outputH;
      const ctx = canvas.getContext("2d")!;

      // Fill background
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, outputW, outputH);

      // Tính tỉ lệ giữa hiển thị và output
      const displayScale = outputW / crop.width;
      // Vẽ ảnh tại vị trí đã điều chỉnh
      ctx.drawImage(
        image,
        (crop.x - offset.x) * displayScale,
        (crop.y - offset.y) * displayScale,
        imgSize.w * scale * displayScale,
        imgSize.h * scale * displayScale
      );

      canvas.toBlob(
        (blob) => {
          if (blob) onConfirm(blob);
          setProcessing(false);
        },
        "image/jpeg",
        0.9
      );
    } catch (e) {
      console.error(e);
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/40 text-white">
        <div className="flex items-center gap-2">
          <Crop className="h-5 w-5" />
          <h3 className="font-semibold">{title}</h3>
        </div>
        <button
          onClick={onCancel}
          className="p-1.5 rounded-full hover:bg-white/10 transition"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Crop area */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-slate-900 select-none"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onMouseUp}
        style={{ cursor: dragging ? "grabbing" : "grab" }}
      >
        {image && (
          <img
            src={imageSrc}
            alt="to-crop"
            draggable={false}
            className="absolute select-none pointer-events-none"
            style={{
              left: offset.x,
              top: offset.y,
              width: imgSize.w * scale,
              height: imgSize.h * scale,
            }}
          />
        )}

        {/* Overlay 4 góc + darken ngoài crop */}
        {crop && (
          <>
            {/* Top */}
            <div
              className="absolute bg-black/50"
              style={{
                left: 0,
                top: 0,
                width: "100%",
                height: crop.y,
              }}
            />
            {/* Bottom */}
            <div
              className="absolute bg-black/50"
              style={{
                left: 0,
                top: crop.y + crop.height,
                width: "100%",
                height: containerSize.h - crop.y - crop.height,
              }}
            />
            {/* Left */}
            <div
              className="absolute bg-black/50"
              style={{
                left: 0,
                top: crop.y,
                width: crop.x,
                height: crop.height,
              }}
            />
            {/* Right */}
            <div
              className="absolute bg-black/50"
              style={{
                left: crop.x + crop.width,
                top: crop.y,
                width: containerSize.w - crop.x - crop.width,
                height: crop.height,
              }}
            />
            {/* Border khung */}
            <div
              className="absolute border-2 border-white pointer-events-none"
              style={{
                left: crop.x,
                top: crop.y,
                width: crop.width,
                height: crop.height,
              }}
            />
            {/* Grid 3x3 */}
            <div
              className="absolute pointer-events-none"
              style={{
                left: crop.x,
                top: crop.y,
                width: crop.width,
                height: crop.height,
              }}
            >
              <div className="absolute top-1/3 left-0 right-0 h-px bg-white/40" />
              <div className="absolute top-2/3 left-0 right-0 h-px bg-white/40" />
              <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/40" />
              <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/40" />
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="bg-black/40 p-4 text-white space-y-3">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <ZoomOut className="h-4 w-4 shrink-0" />
          <input
            type="range"
            min={crop ? Math.max(crop.width / imgSize.w, crop.height / imgSize.h) : 0.1}
            max={4}
            step={0.01}
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="flex-1 accent-orange-500"
          />
          <ZoomIn className="h-4 w-4 shrink-0" />
        </div>

        <div className="flex gap-2 justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-white hover:bg-white/10 gap-1.5"
          >
            <RotateCcw className="h-4 w-4" />
            Đặt lại
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 p-4 bg-black/40 text-white">
        <Button variant="ghost" onClick={onCancel} className="text-white hover:bg-white/10">
          Huỷ
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={processing}
          className="bg-greenx-gradient hover:opacity-90 text-white"
        >
          {processing ? "Đang xử lý..." : "Cắt ảnh"}
        </Button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default ImageCropper;
