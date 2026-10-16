// WarnUserDialog — cảnh báo user
import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { adminUsersService } from "@/services/adminUsers.service";
import { toast } from "sonner";
import type { AdminUser } from "@/types";

interface Props {
  user: AdminUser | null;
  onClose: () => void;
  onSuccess: () => void;
}

const WarnUserDialog = ({ user, onClose, onSuccess }: Props) => {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Vui lòng nhập lý do cảnh báo");
      return;
    }
    setSubmitting(true);
    try {
      await adminUsersService.warn(user._id, reason.trim());
      toast.success("Đã gửi cảnh báo");
      onSuccess();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Không thể cảnh báo");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Cảnh báo người dùng
          </DialogTitle>
          <DialogDescription>
            Gửi cảnh báo cho <span className="font-semibold">@{user.username}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Lý do *</label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Mô tả hành vi vi phạm..."
            rows={3}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground">
            Cảnh báo sẽ được lưu vào lịch sử user. Số lần cảnh báo hiện tại:{" "}
            <span className="font-semibold">{user.warningCount}</span>
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Huỷ
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Gửi cảnh báo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WarnUserDialog;
