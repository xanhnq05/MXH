// BanUserDialog — dialog cấm user với lý do, category, scope, expiresAt
import { useState } from "react";
import { ShieldAlert, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { adminUsersService } from "@/services/adminUsers.service";
import { toast } from "sonner";
import type { AdminUser } from "@/types";

const CATEGORIES = [
  { value: "spam", label: "Spam" },
  { value: "abuse", label: "Ngôn từ lạm dụng" },
  { value: "hate", label: "Ngôn từ thù ghét" },
  { value: "nsfw", label: "Nội dung NSFW" },
  { value: "scam", label: "Lừa đảo" },
  { value: "impersonation", label: "Giả mạo" },
  { value: "other", label: "Khác" },
];

const DURATIONS = [
  { value: "1d", label: "1 ngày", days: 1 },
  { value: "7d", label: "7 ngày", days: 7 },
  { value: "30d", label: "30 ngày", days: 30 },
  { value: "90d", label: "90 ngày", days: 90 },
  { value: "permanent", label: "Vĩnh viễn", days: 0 },
];

const SCOPES = [
  { key: "login", label: "Đăng nhập" },
  { key: "chat", label: "Chat" },
  { key: "post", label: "Đăng bài" },
  { key: "comment", label: "Bình luận" },
  { key: "message", label: "Nhắn tin" },
];

interface Props {
  user: AdminUser | null;
  onClose: () => void;
  onSuccess: () => void;
}

const BanUserDialog = ({ user, onClose, onSuccess }: Props) => {
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState("spam");
  const [duration, setDuration] = useState("7d");
  const [scope, setScope] = useState<string[]>(["login", "chat", "post", "comment", "message"]);
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Vui lòng nhập lý do");
      return;
    }
    if (scope.length === 0) {
      toast.error("Chọn ít nhất 1 phạm vi cấm");
      return;
    }
    setSubmitting(true);
    try {
      const selected = DURATIONS.find((d) => d.value === duration);
      const expiresAt =
        selected && selected.days > 0
          ? new Date(Date.now() + selected.days * 86400 * 1000).toISOString()
          : null;
      await adminUsersService.ban(user._id, {
        reason: reason.trim(),
        category,
        scope,
        expiresAt,
      });
      toast.success("Đã cấm tài khoản");
      onSuccess();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Không thể cấm");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleScope = (k: string) => {
    setScope((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  };

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Cấm tài khoản
          </DialogTitle>
          <DialogDescription>
            Cấm <span className="font-semibold">@{user.username}</span> ({user.displayName})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Lý do *</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Mô tả chi tiết lý do cấm tài khoản này..."
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {reason.length}/500 ký tự
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Phân loại</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Thời hạn</label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Phạm vi cấm</label>
            <div className="grid grid-cols-2 gap-2 rounded-md border p-3 bg-muted/20">
              {SCOPES.map((s) => (
                <label
                  key={s.key}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={scope.includes(s.key)}
                    onCheckedChange={() => toggleScope(s.key)}
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Huỷ
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Cấm tài khoản
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BanUserDialog;
