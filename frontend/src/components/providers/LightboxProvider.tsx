import { useEffect, useState } from "react";
import { useLightbox } from "@/stores/useLightboxStore";
import { ChevronLeft, ChevronRight, MoreVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LightboxContent = () => {
  const { open, mode, images, index, title, actions, next, prev, close, showImage } =
    useLightbox();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setMenuOpen(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (mode === "gallery" && e.key === "ArrowRight") next();
      if (mode === "gallery" && e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, mode, next, prev, close]);

  if (!open || images.length === 0) return null;
  const current = images[index];

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center"
      onClick={close}
    >
      {/* Top bar: Title (trái) + Actions menu ⋯ (giữa) + Close (phải) */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 text-white z-10">
        {title ? (
          <h3 className="text-base font-medium truncate max-w-[50%]">{title}</h3>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          {/* Menu ⋯ — chỉ hiện khi có actions (avatar/cover context) */}
          {actions.length > 0 && (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((m) => !m);
                }}
                aria-label="Tùy chọn"
              >
                <MoreVertical className="h-6 w-6" />
              </Button>
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                    }}
                  />
                  <div
                    className="absolute right-0 top-full mt-1 min-w-[220px] bg-white text-slate-900 rounded-xl shadow-2xl py-1.5 z-20 overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {actions.map((a, i) => (
                      <button
                        key={i}
                        onClick={async (e) => {
                          e.stopPropagation();
                          setMenuOpen(false);
                          try {
                            await a.onClick();
                            close();
                          } catch (err) {
                            // caller handles error toast
                          }
                        }}
                        className={cn(
                          "w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2.5",
                          a.variant === "danger" && "text-red-600 hover:bg-red-50"
                        )}
                      >
                        {a.icon}
                        <span>{a.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
            aria-label="Đóng"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Gallery navigation (chỉ khi nhiều ảnh) */}
      {mode === "gallery" && images.length > 1 && (
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
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/40 px-3 py-1 rounded-full">
            {index + 1} / {images.length}
          </div>
        </>
      )}

      <img
        src={current}
        alt=""
        className="max-w-[90vw] max-h-[85vh] object-contain"
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
