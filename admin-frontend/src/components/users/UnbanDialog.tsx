// UnbanDialog — gỡ cấm user
import { useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
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

const UnbanDialog = ({ user, onClose, onSuccess }: Props) => {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await adminUsersService.unban(user._id, reason.trim() || undefined);
      toast.success("Đã gỡ cấm");
      onSuccess();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Không thể gỡ cấm");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-success" />
            Gỡ cấm tài khoản
          </DialogTitle>
          <DialogDescription>
            Gỡ cấm cho <span className="font-semibold">@{user.username}</span>?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Lý do gỡ cấm (tuỳ chọn)</label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Vd: đã xác minh sai phạm, user đã khắc phục..."
            rows={3}
            maxLength={500}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Huỷ
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Xác nhận gỡ cấm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UnbanDialog;
