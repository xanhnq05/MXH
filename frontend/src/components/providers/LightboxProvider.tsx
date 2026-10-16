import { useEffect } from "react";
import { create } from "zustand";
import { useLightbox } from "@/stores/useLightboxStore";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const LightboxContent = () => {
  const { open, images, index, next, prev, close } = useLightbox();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, next, prev, close]);

  if (!open || images.length === 0) return null;
  const current = images[index];

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center"
      onClick={close}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-white hover:bg-white/10"
        onClick={(e) => {
          e.stopPropagation();
          close();
        }}
      >
        <X className="h-6 w-6" />
      </Button>

      {images.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 text-white hover:bg-white/10 h-12 w-12"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 text-white hover:bg-white/10 h-12 w-12"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
            {index + 1} / {images.length}
          </div>
        </>
      )}

      <img
        src={current}
        alt=""
        className="max-w-[90vw] max-h-[90vh] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

export const LightboxProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      {children}
      <LightboxContent />
    </>
  );
};
