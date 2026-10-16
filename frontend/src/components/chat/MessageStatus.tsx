// MessageStatus — Icon 1 tick / 2 tick xám / 2 tick cam / dấu ! đỏ
// thể hiện trạng thái: đang gửi / đã gửi / đã nhận / đã xem / thất bại.
// - Direct: 1 người nhận
// - Group: chỉ hiện icon (không text "X/Y")
// Click để mở MessageStatusModal xem chi tiết (chỉ với message của mình).

import { useMemo } from "react";
import { Check, CheckCheck, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message, User } from "@/types/message";
import type { Conversation } from "@/types/message";

interface MessageStatusProps {
  msg: Message;
  conversation: Conversation;
  myId: string;
  /** Click mở modal chi tiết (chỉ với message của mình) */
  onOpenDetails?: () => void;
  /** Số thành viên = tổng số người nhận (trừ sender) */
  totalRecipients: number;
}

/**
 * Trả về trạng thái tổng hợp của message:
 * - "failed": gửi thất bại (mất mạng, server reject, ...)
 * - "pending": mình vừa gửi, server chưa xác nhận
 * - "sent": server đã lưu, chưa ai nhận
 * - "delivered": ít nhất 1 người đã nhận, chưa ai đọc
 * - "partial": có 1 số đã đọc, 1 số chưa
 * - "read": tất cả đã đọc (hoặc direct: other đã đọc)
 */
export type MessageStatusKind =
  | "failed"
  | "pending"
  | "sent"
  | "delivered"
  | "partial"
  | "read";

export const computeMessageStatus = (
  msg: Message,
  totalRecipients: number
): { kind: MessageStatusKind; delivered: number; read: number } => {
  if ((msg as any)._failed) {
    return { kind: "failed", delivered: 0, read: 0 };
  }
  if ((msg as any)._pending) {
    return { kind: "pending", delivered: 0, read: 0 };
  }
  const deliveries = Array.isArray(msg.deliveries) ? msg.deliveries : [];
  // delivered = tổng số user có deliveredAt
  const delivered = deliveries.filter(
    (d) => d.deliveredAt || d.readAt
  ).length;
  // read = tổng số user có readAt
  const read = deliveries.filter((d) => d.readAt).length;
  if (totalRecipients === 0) {
    // Direct: nếu read >= 1 thì read
    if (read > 0) return { kind: "read", delivered, read };
    if (delivered > 0) return { kind: "delivered", delivered, read };
    return { kind: "sent", delivered, read };
  }
  if (read >= totalRecipients) return { kind: "read", delivered, read };
  if (read > 0) return { kind: "partial", delivered, read };
  if (delivered >= totalRecipients) return { kind: "delivered", delivered, read };
  if (delivered > 0) return { kind: "delivered", delivered, read };
  return { kind: "sent", delivered, read };
};

export const MessageStatus = ({
  msg,
  conversation,
  totalRecipients,
  onOpenDetails,
}: MessageStatusProps) => {
  const status = useMemo(
    () => computeMessageStatus(msg, totalRecipients),
    [msg, totalRecipients]
  );

  const Icon =
    status.kind === "failed"
      ? AlertCircle
      : status.kind === "pending" || status.kind === "sent"
        ? Check
        : CheckCheck;
  const colorClass = useMemo(() => {
    if (status.kind === "failed") return "text-red-500";
    if (status.kind === "pending") return "text-slate-300";
    if (status.kind === "sent") return "text-slate-400";
    if (status.kind === "delivered") return "text-slate-400";
    if (status.kind === "read") return "text-primary";
    if (status.kind === "partial") return "text-primary/70";
    return "text-slate-400";
  }, [status.kind]);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpenDetails?.();
      }}
      aria-label={
        status.kind === "failed"
          ? "Gửi thất bại"
          : status.kind === "pending"
            ? "Đang gửi"
            : status.kind === "sent"
              ? "Đã gửi"
              : status.kind === "delivered"
                ? "Đã nhận"
                : status.kind === "read"
                  ? "Đã xem"
                  : `${status.read}/${totalRecipients} đã xem`
      }
      className={cn(
        "inline-flex items-center justify-center rounded-full",
        "hover:bg-slate-200/70 dark:hover:bg-slate-700/60 transition-colors",
        onOpenDetails ? "cursor-pointer" : "cursor-default"
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", colorClass)} />
    </button>
  );
};
