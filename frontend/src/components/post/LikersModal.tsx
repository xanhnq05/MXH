// LikersModal — hiển thị danh sách user đã thích bài viết.
// Click vào likeCount trong PostDetail/HomePage sẽ mở modal này.

import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { Search, Heart, Users } from "lucide-react";
import { postService } from "@/services/post.service";
import { chatService } from "@/services/chat.service";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const getInitials = (name?: string) =>
  (name || "?")
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

interface LikersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string | null;
}

export const LikersModal = ({ open, onOpenChange, postId }: LikersModalProps) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open || !postId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const r = await postService.getLikers(postId);
        if (cancelled) return;
        setItems(r.items || []);
        setTotal(r.total || 0);
      } catch (e: any) {
        toast.error(e?.response?.data?.message || "Không tải được danh sách");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, postId]);

  const filtered = query.trim()
    ? items.filter((u) => {
        const q = query.trim().toLowerCase();
        return (
          u.displayName?.toLowerCase().includes(q) ||
          u.username?.toLowerCase().includes(q)
        );
      })
    : items;

  const handleMessage = async (userId: string) => {
    try {
      const conv = await chatService.getOrCreateDirect(userId);
      onOpenChange(false);
      navigate(`/chat/${conv._id}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Không thể mở cuộc trò chuyện");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[92vw] sm:w-full p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Heart className="h-4 w-4 text-orange-500 fill-orange-500" />
            Người đã thích
            {total > 0 && (
              <span className="text-xs text-slate-500 font-normal">
                ({total})
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 py-2 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
              placeholder="Tìm trong danh sách..."
              className="pl-9 h-9"
            />
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-slate-500">
              <Spinner className="mr-2" /> Đang tải...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-sm">
              <Users className="h-10 w-10 opacity-30 mb-2" />
              <p className="font-medium text-slate-700">
                {query
                  ? "Không tìm thấy ai khớp"
                  : "Chưa có lượt thích nào"}
              </p>
              {!query && (
                <p className="text-xs mt-1 max-w-[240px] text-center">
                  Khi có người thích bài viết, họ sẽ xuất hiện ở đây.
                </p>
              )}
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((u) => (
                <li
                  key={u._id}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50/40 transition-colors"
                >
                  <Link
                    to={`/profile/${u._id}`}
                    onClick={() => onOpenChange(false)}
                    className="shrink-0"
                  >
                    <Avatar className="h-10 w-10 ring-1 ring-orange-100">
                      <AvatarImage src={u.avatarUrl} alt={u.displayName} />
                      <AvatarFallback className="bg-greenx-gradient text-white text-xs font-semibold">
                        {getInitials(u.displayName)}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <Link
                    to={`/profile/${u._id}`}
                    onClick={() => onOpenChange(false)}
                    className="flex-1 min-w-0"
                  >
                    <p className="font-semibold text-sm text-slate-900 truncate hover:text-orange-600">
                      {u.displayName || u.username}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      @{u.username}
                    </p>
                  </Link>
                  <button
                    onClick={() => handleMessage(u._id)}
                    className={cn(
                      "shrink-0 text-xs px-2.5 py-1.5 rounded-lg font-medium",
                      "bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
                    )}
                  >
                    Nhắn tin
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
