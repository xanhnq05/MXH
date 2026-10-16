// CreateGroupModal — Modal tạo nhóm chat
// - Tên nhóm (bắt buộc)
// - Trạng thái nhóm: mở (ai có link vào được, tối đa 50) / riêng tư (chỉ mời)
// - Bên dưới: list bạn bè + ô tìm kiếm + nút mời (vertical detail list)
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import {
  Users,
  Lock,
  Globe2,
  Search,
  Check,
  UserPlus,
  Info,
} from "lucide-react";
import { friendshipService } from "@/services/other.service";
import { chatService } from "@/services/chat.service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const getInitials = (name?: string) =>
  (name || "?")
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

interface FriendItem {
  friendshipId?: string;
  friend?: any;
}

const MAX_MEMBERS = 50;

export const CreateGroupModal = ({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (conversationId: string) => void;
}) => {
  const [name, setName] = useState("");
  const [joinType, setJoinType] = useState<"open" | "closed">("closed");
  const [friendQ, setFriendQ] = useState("");
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  // Reset khi đóng/mở
  useEffect(() => {
    if (!open) {
      setName("");
      setJoinType("closed");
      setFriendQ("");
      setSelected(new Set());
      setSubmitting(false);
    }
  }, [open]);

  // Load bạn bè khi mở modal
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingFriends(true);
    friendshipService
      .list()
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : data?.items || [];
        setFriends(list);
      })
      .catch(() => {
        if (!cancelled) setFriends([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingFriends(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const filteredFriends = useMemo(() => {
    const q = friendQ.trim().toLowerCase();
    const list = Array.isArray(friends) ? friends : [];
    if (!q) return list;
    return list.filter((f) => {
      const u = f.friend || {};
      const text =
        (u.displayName || "") +
        " " +
        (u.username || "") +
        " " +
        (u.fullName || "");
      return text.toLowerCase().includes(q);
    });
  }, [friends, friendQ]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_MEMBERS - 1) {
          toast.error(`Tối đa ${MAX_MEMBERS} thành viên`);
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  const canSubmit =
    name.trim().length > 0 && !submitting && selected.size + 1 <= MAX_MEMBERS;

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Vui lòng nhập tên nhóm");
      return;
    }
    setSubmitting(true);
    try {
      const memberIds = Array.from(selected);
      const conv = await chatService.createGroup(name.trim(), memberIds, joinType);
      toast.success(
        joinType === "open"
          ? `Đã tạo nhóm mở "${conv.name}"`
          : `Đã tạo nhóm "${conv.name}"`
      );
      onCreated(conv._id);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Tạo nhóm thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-500" />
            Tạo nhóm mới
          </DialogTitle>
          <DialogDescription>
            Tạo nhóm chat và mời bạn bè cùng tham gia.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Tên nhóm */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">
              Tên nhóm <span className="text-red-500">*</span>
            </label>
            <Input
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              placeholder="VD: Team dự án MXH..."
              maxLength={100}
              autoFocus
            />
            <p className="text-[11px] text-slate-400 mt-1">
              {name.length}/100 ký tự
            </p>
          </div>

          {/* Trạng thái nhóm */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">
              Trạng thái nhóm
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setJoinType("closed")}
                className={cn(
                  "flex flex-col items-start gap-1.5 p-3 rounded-xl border-2 text-left transition-all",
                  joinType === "closed"
                    ? "border-orange-500 bg-orange-50/60 shadow-sm"
                    : "border-slate-200 hover:border-orange-200 bg-white"
                )}
              >
                <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                  <Lock className="h-4 w-4 text-slate-500" />
                  Riêng tư
                  {joinType === "closed" && (
                    <Check className="h-3.5 w-3.5 ml-auto text-orange-500" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Chỉ thành viên được mời mới có thể vào.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setJoinType("open")}
                className={cn(
                  "flex flex-col items-start gap-1.5 p-3 rounded-xl border-2 text-left transition-all",
                  joinType === "open"
                    ? "border-orange-500 bg-orange-50/60 shadow-sm"
                    : "border-slate-200 hover:border-orange-200 bg-white"
                )}
              >
                <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                  <Globe2 className="h-4 w-4 text-slate-500" />
                  Mở
                  {joinType === "open" && (
                    <Check className="h-3.5 w-3.5 ml-auto text-orange-500" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Ai có link đều vào được. Tối đa {MAX_MEMBERS} thành viên.
                </p>
              </button>
            </div>
            {joinType === "open" && (
              <div className="mt-2 flex items-start gap-1.5 text-[11px] text-slate-500 bg-blue-50/60 border border-blue-100 rounded-lg px-2.5 py-1.5">
                <Info className="h-3.5 w-3.5 mt-0.5 text-blue-500 shrink-0" />
                <span>
                  Sau khi tạo, hệ thống tạo link mời. Bạn có thể copy và chia sẻ.
                </span>
              </div>
            )}
          </div>

          {/* Chọn bạn bè */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-600">
                Mời bạn bè{" "}
                <span className="text-slate-400">
                  ({selected.size} đã chọn · tối đa {MAX_MEMBERS - 1})
                </span>
              </label>
            </div>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={friendQ}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFriendQ(e.target.value)}
                placeholder="Tìm bạn bè theo tên, username..."
                className="pl-9"
              />
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              {loadingFriends ? (
                <div className="flex items-center justify-center py-10 text-slate-500 text-sm gap-2">
                  <Spinner /> Đang tải bạn bè...
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-sm">
                  {friendQ
                    ? `Không tìm thấy bạn bè khớp "${friendQ}"`
                    : "Chưa có bạn bè. Hãy kết bạn trước."}
                </div>
              ) : (
                <ul className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                  {filteredFriends.map((f) => {
                    const u = f.friend || {};
                    const id = u._id;
                    if (!id) return null;
                    const isSel = selected.has(id);
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          onClick={() => toggleSelect(id)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                            isSel ? "bg-orange-50/60" : "hover:bg-slate-50"
                          )}
                        >
                          <Avatar className="h-9 w-9 ring-1 ring-slate-200">
                            <AvatarImage src={u.avatarUrl} alt={u.displayName} />
                            <AvatarFallback className="bg-greenx-gradient text-white text-xs font-semibold">
                              {getInitials(u.displayName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-slate-800 truncate">
                              {u.displayName || u.username}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              @{u.username}
                            </p>
                          </div>
                          <div
                            className={cn(
                              "h-6 w-6 rounded-full flex items-center justify-center shrink-0 transition-all",
                              isSel
                                ? "bg-greenx-gradient text-white"
                                : "border border-slate-300 text-transparent"
                            )}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="px-5 py-3 border-t bg-slate-50/60">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="bg-greenx-gradient hover:opacity-90 text-white gap-1.5"
          >
            {submitting ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            Tạo nhóm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupModal;
