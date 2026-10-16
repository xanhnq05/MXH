import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { Search, X } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "sonner";

interface Sticker {
  name: string;
  url: string;
  tags: string[];
}

interface StickerPack {
  key: string;
  name: string;
  description?: string;
  thumbnailUrl: string;
  stickers: Sticker[];
}

interface StickerPickerProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSelect: (sticker: { id: string; url: string; type: "sticker" }) => void;
}

const StickerPicker = ({ open, onOpenChange, onSelect }: StickerPickerProps) => {
  const [packs, setPacks] = useState<StickerPack[]>([]);
  const [activePack, setActivePack] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<Sticker[]>([]);
  const debouncedQ = useDebounce(searchQ, 250);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api
      .get("/stickers/packs")
      .then((res) => {
        const data = res.data.packs || [];
        setPacks(data);
        if (data.length > 0) setActivePack(data[0].key);
      })
      .catch(() => toast.error("Không tải được bộ sticker"))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (debouncedQ.length < 1) {
      setSearchResults([]);
      return;
    }
    api
      .get(`/stickers/search?q=${encodeURIComponent(debouncedQ)}`)
      .then((res) => setSearchResults(res.data.stickers || []))
      .catch(() => setSearchResults([]));
  }, [debouncedQ]);

  const currentPack = packs.find((p) => p.key === activePack);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[500px] flex flex-col p-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle>Sticker</DialogTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQ}
              onChange={(v: string) => setSearchQ(v)}
              placeholder="Tìm sticker..."
              className="pl-9 pr-9"
            />
            {searchQ && (
              <button
                onClick={() => setSearchQ("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner />
          </div>
        ) : searchQ.length > 0 ? (
          // Search results
          <div className="flex-1 overflow-y-auto p-3">
            {searchResults.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">Không tìm thấy</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {searchResults.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      onSelect({ id: s.url, url: s.url, type: "sticker" });
                      onOpenChange(false);
                    }}
                    className="aspect-square hover:bg-accent rounded p-1 transition-colors"
                    title={s.name}
                  >
                    <img
                      src={s.url}
                      alt={s.name}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Tabs theo pack
          <Tabs
            value={activePack || ""}
            onValueChange={setActivePack}
            className="flex-1 flex flex-col"
          >
            <TabsList className="mx-4 mb-2 flex-wrap h-auto">
              {packs.map((p) => (
                <TabsTrigger key={p.key} value={p.key} className="gap-1">
                  <img
                    src={p.thumbnailUrl}
                    alt=""
                    className="w-4 h-4 rounded object-cover"
                  />
                  {p.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {currentPack && (
              <TabsContent
                value={currentPack.key}
                className="flex-1 overflow-y-auto p-3 mt-0"
              >
                {currentPack.description && (
                  <p className="text-xs text-muted-foreground mb-2">
                    {currentPack.description}
                  </p>
                )}
                <div className="grid grid-cols-4 gap-2">
                  {currentPack.stickers.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        onSelect({ id: `${currentPack.key}-${i}`, url: s.url, type: "sticker" });
                        onOpenChange(false);
                      }}
                      className="aspect-square hover:bg-accent rounded p-1 transition-colors"
                      title={s.name}
                    >
                      <img
                        src={s.url}
                        alt={s.name}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              </TabsContent>
            )}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StickerPicker;
