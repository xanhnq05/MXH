// MessageStatusModal — Hiện danh sách ai đã nhận / ai đã xem message.
// Tabs: "Đã xem" | "Đã nhận".

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, CheckCheck, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import type { Message } from "@/types/message";
import type { Conversation } from "@/types/message";

interface MessageStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: Message | null;
  conversation: Conversation | null;
  /** Map userId → user (lấy từ conversation.members) */
  membersById: Record<string, any>;
}

const getInitials = (name?: string) =>
  (name || "?")
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export const MessageStatusModal = ({
  open,
  onOpenChange,
  message,
  conversation,
  membersById,
}: MessageStatusModalProps) => {
  const [tab, setTab] = useState<"read" | "delivered">("read");

  const { read, delivered, pending } = useMemo(() => {
    if (!message || !conversation) {
      return { read: [], delivered: [], pending: [] };
    }
    const senderId =
      typeof message.senderId === "object"
        ? (message.senderId as any)._id
        : message.senderId;
    // recipients = members trừ sender
    const recipients = conversation.members
      .map((m) => m.userId)
      .filter((u: any) => u._id !== senderId);
    const deliveries = Array.isArray(message.deliveries)
      ? message.deliveries
      : [];
    const readList: any[] = [];
    const deliveredList: any[] = [];
    const pendingList: any[] = [];
    for (const r of recipients) {
      const d = deliveries.find(
        (x: any) => (x.userId?._id || x.userId) === r._id
      );
      if (d?.readAt) {
        readList.push({ user: r, readAt: d.readAt });
      } else if (d?.deliveredAt) {
        deliveredList.push({ user: r, deliveredAt: d.deliveredAt });
      } else {
        pendingList.push({ user: r });
      }
    }
    return { read: readList, delivered: deliveredList, pending: pendingList };
  }, [message, conversation]);

  if (!message || !conversation) return null;

  const list = tab === "read" ? read : delivered;
  const isGroup = conversation.type === "group";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[92vw] sm:w-full p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="text-base">Thông tin tin nhắn</DialogTitle>
        </DialogHeader>

        {isGroup ? (
          <div className="flex border-b bg-orange-50/30">
            <button
              onClick={() => setTab("read")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors",
                tab === "read"
                  ? "text-primary border-b-2 border-primary"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Eye className="h-4 w-4" />
              Đã xem ({read.length})
            </button>
            <button
              onClick={() => setTab("delivered")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors",
                tab === "delivered"
                  ? "text-primary border-b-2 border-primary"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <CheckCheck className="h-4 w-4" />
              Đã nhận ({delivered.length})
            </button>
          </div>
        ) : (
          <div className="px-4 py-2.5 border-b bg-orange-50/30 text-xs text-slate-600 flex items-center gap-2">
            <CheckCheck className="h-4 w-4 text-primary" />
            {read.length > 0
              ? `Đã xem lúc ${format(new Date(read[0].readAt), "HH:mm dd/MM", { locale: vi })}`
              : delivered.length > 0
                ? "Đã nhận"
                : "Đang chờ người nhận mở..."}
          </div>
        )}

        <div className="max-h-[60vh] overflow-y-auto">
          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-sm">
              <Eye className="h-10 w-10 opacity-30 mb-2" />
              <p className="font-medium text-slate-700">
                {tab === "read"
                  ? isGroup
                    ? "Chưa ai đã xem"
                    : "Chưa được xem"
                  : "Chưa ai đã nhận"}
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {list.map((item: any) => {
                const u = item.user;
                const at = item.readAt || item.deliveredAt;
                return (
                  <li
                    key={u._id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50/40 transition-colors"
                  >
                    <Avatar className="h-10 w-10 ring-1 ring-orange-100">
                      <AvatarImage src={u.avatarUrl} alt={u.displayName} />
                      <AvatarFallback className="bg-greenx-gradient text-white text-xs font-semibold">
                        {getInitials(u.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-900 truncate">
                        {u.displayName || u.username}
                      </p>
                      {at && (
                        <p className="text-xs text-slate-500">
                          {tab === "read" ? "Đã xem" : "Đã nhận"} lúc{" "}
                          {format(new Date(at), "HH:mm dd/MM", { locale: vi })}
                        </p>
                      )}
                    </div>
                    {tab === "read" ? (
                      <CheckCheck className="h-4 w-4 text-primary" />
                    ) : (
                      <Check className="h-4 w-4 text-slate-500" />
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {isGroup && tab === "read" && pending.length > 0 && (
            <div className="border-t">
              <p className="px-4 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                Chưa nhận ({pending.length})
              </p>
              <ul className="divide-y">
                {pending.map((item: any) => {
                  const u = item.user;
                  return (
                    <li
                      key={u._id}
                      className="flex items-center gap-3 px-4 py-2 opacity-60"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={u.avatarUrl} alt={u.displayName} />
                        <AvatarFallback className="bg-greenx-gradient text-white text-xs font-semibold">
                          {getInitials(u.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-700 truncate">
                          {u.displayName || u.username}
                        </p>
                        <p className="text-xs text-slate-400">Chưa nhận</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
