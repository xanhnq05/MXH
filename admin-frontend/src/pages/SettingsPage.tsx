// SettingsPage — cấu hình hệ thống (UI only cho V1)
import { useState } from "react";
import { Save, Database, Bell, Shield, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const SettingsPage = () => {
  const [maintenance, setMaintenance] = useState(false);
  const [emailNotify, setEmailNotify] = useState(true);
  const [autoFlag, setAutoFlag] = useState(true);

  const handleSave = () => {
    toast.success("Đã lưu cấu hình (UI demo)");
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <PageHeader
        title="Cấu hình hệ thống"
        description="Tinh chỉnh các tham số vận hành"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4" /> Tổng quan
          </CardTitle>
          <CardDescription>Các tuỳ chọn chung</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row
            label="Chế độ bảo trì"
            description="Tạm dừng mọi hoạt động ghi (write) của user thường"
            checked={maintenance}
            onChange={setMaintenance}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4" /> Kiểm duyệt
          </CardTitle>
          <CardDescription>Quy tắc tự động</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row
            label="Auto-flag báo cáo"
            description="Ẩn nội dung khi có ≥3 report cùng target trong 24h"
            checked={autoFlag}
            onChange={setAutoFlag}
          />
          <div>
            <label className="text-sm font-medium">Ngưỡng cảnh báo (warning count)</label>
            <Input
              type="number"
              defaultValue={3}
              className="mt-1 max-w-32"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4" /> Thông báo
          </CardTitle>
          <CardDescription>Cấu hình nhận thông báo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row
            label="Email khi có report mới"
            description="Gửi email cho admin khi có report ưu tiên cao"
            checked={emailNotify}
            onChange={setEmailNotify}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-4 w-4" /> Hệ thống
          </CardTitle>
          <CardDescription>Thông tin kết nối</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Info label="API URL" value={import.meta.env.VITE_API_URL || "—"} />
          <Info label="User frontend" value={import.meta.env.VITE_USER_FRONTEND_URL || "—"} />
          <Info label="App name" value={import.meta.env.VITE_APP_NAME || "GreenX Admin"} />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>
          <Save className="h-4 w-4" /> Lưu thay đổi
        </Button>
      </div>
    </div>
  );
};

const Row = ({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <div className="flex items-start justify-between gap-4">
    <div>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

const Info = ({ label, value }: { label: string; value: string }) => (
  <div className="grid grid-cols-3 gap-2">
    <span className="text-muted-foreground">{label}</span>
    <code className="col-span-2 text-xs bg-muted px-2 py-1 rounded">{value}</code>
  </div>
);

export default SettingsPage;
