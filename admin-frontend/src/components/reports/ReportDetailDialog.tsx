// ReportDetailDialog — xem chi tiết + xử lý report
import { useState } from "react";
import {
  UserCheck,
  Trash2,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { adminReportsService } from "@/services/adminReports.service";
import { formatDateTime, relativeTime } from "@/lib/utils";
import { toast } from "sonner";
import type { AdminReport, ReportResolution } from "@/types";

interface Props {
  report: AdminReport | null;
  onClose: () => void;
  onSuccess: () => void;
}

const ReportDetailDialog = ({ report, onClose, onSuccess }: Props) => {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!report) return null;

  const handleAssign = async () => {
    setSubmitting(true);
    try {
      await adminReportsService.assign(report._id);
      toast.success("Đã nhận xử lý");
      onSuccess();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Lỗi");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (resolution: ReportResolution) => {
    setSubmitting(true);
    try {
      await adminReportsService.resolve(report._id, resolution, note.trim() || undefined);
      toast.success("Đã xử lý báo cáo");
      onSuccess();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Lỗi");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = async () => {
    setSubmitting(true);
    try {
      await adminReportsService.dismiss(report._id, note.trim() || undefined);
      toast.success("Đã bỏ qua");
      onSuccess();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Lỗi");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!report} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge variant="outline">{report.targetType}</Badge>
            <Badge variant="destructive">{report.category}</Badge>
            <span className="text-sm font-normal text-muted-foreground">
              #{report._id.slice(-6)}
            </span>
          </DialogTitle>
          <DialogDescription>
            Gửi lúc {formatDateTime(report.createdAt)} ({relativeTime(report.createdAt)})
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">Thông tin</TabsTrigger>
            <TabsTrigger value="target">Target</TabsTrigger>
            <TabsTrigger value="resolution">Xử lý</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Người báo cáo" value={report.reporterId?.displayName || "—"} />
              <Field label="Email" value={report.reporterId?.email || "—"} />
              <Field label="Trạng thái" value={report.status} />
              <Field label="Ưu tiên" value={report.priority} />
            </div>
            <Separator />
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase mb-1">
                Mô tả
              </p>
              <p className="text-sm whitespace-pre-wrap">
                {report.description || (
                  <span className="text-muted-foreground italic">
                    Không có mô tả
                  </span>
                )}
              </p>
            </div>
            {report.assignedTo && (
              <>
                <Separator />
                <Field
                  label="Đang xử lý bởi"
                  value={`${report.assignedTo.displayName} (${report.assignedTo.email})`}
                />
              </>
            )}
            {report.resolvedBy && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Field label="Xử lý bởi" value={report.resolvedBy.displayName} />
                  <Field label="Lúc" value={formatDateTime(report.resolvedAt!)} />
                  <Field label="Quyết định" value={report.resolution || "—"} />
                  {report.resolutionNote && (
                    <Field label="Ghi chú" value={report.resolutionNote} />
                  )}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="target">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">
                Target ID
              </p>
              <code className="block rounded bg-muted px-2 py-1.5 text-xs break-all">
                {report.targetId}
              </code>
              {report.targetSnapshot && (
                <>
                  <p className="text-xs font-medium text-muted-foreground uppercase mt-3">
                    Snapshot tại thời điểm report
                  </p>
                  <pre className="rounded bg-muted p-3 text-xs overflow-x-auto">
                    {JSON.stringify(report.targetSnapshot, null, 2)}
                  </pre>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="resolution" className="space-y-3">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú xử lý (tuỳ chọn)..."
              rows={3}
            />
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => handleResolve("warn")}
                disabled={submitting}
              >
                <AlertTriangle className="h-4 w-4" /> Cảnh báo user
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleResolve("ban_user")}
                disabled={submitting}
              >
                <UserCheck className="h-4 w-4" /> Cấm user
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleResolve("delete_content")}
                disabled={submitting}
              >
                <Trash2 className="h-4 w-4" /> Xoá nội dung
              </Button>
              <Button
                variant="outline"
                onClick={handleDismiss}
                disabled={submitting}
              >
                <CheckCircle2 className="h-4 w-4" /> Bỏ qua
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          {report.status === "open" && (
            <Button variant="outline" onClick={handleAssign} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Nhận xử lý
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <p className="text-xs font-medium text-muted-foreground uppercase">{label}</p>
    <p className="text-sm">{value}</p>
  </div>
);

export default ReportDetailDialog;
