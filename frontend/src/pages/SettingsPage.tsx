import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/useAuthStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { userService } from "@/services/user.service";
import { authService } from "@/services/auth.service";
import { setE2EEEnabled, isE2EEEnabled } from "@/lib/e2eeManager";
import { useState } from "react";
import { toast } from "sonner";
import { Lock, LockOpen, ShieldCheck } from "lucide-react";

const SettingsPage = () => {
  const { user, updateUser } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const [e2eeOn, setE2eeOn] = useState(isE2EEEnabled());
  const [e2eeLoading, setE2eeLoading] = useState(false);

  if (!user) return null;

  const updatePref = async (patch: any) => {
    try {
      const updated = await userService.updatePreferences(patch);
      updateUser(updated);
      toast.success("Đã lưu");
    } catch (e) {
      toast.error("Lỗi");
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <h1 className="text-2xl font-bold">Cài đặt</h1>

        <Card>
          <CardContent className="p-4 space-y-3">
            <h2 className="font-semibold">Giao diện</h2>
            <div>
              <Label>Theme</Label>
              <div className="flex gap-2 mt-2">
                {(["light", "dark", "system"] as const).map((t) => (
                  <Button
                    key={t}
                    variant={theme === t ? "default" : "outline"}
                    onClick={() => setTheme(t)}
                  >
                    {t === "light" ? "Sáng" : t === "dark" ? "Tối" : "Hệ thống"}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <h2 className="font-semibold">Âm thanh & Thông báo</h2>
            <div className="flex items-center justify-between">
              <Label>Bật âm thanh tin nhắn</Label>
              <input
                type="checkbox"
                checked={user.soundEnabled}
                onChange={(e) => updatePref({ soundEnabled: e.target.checked })}
              />
            </div>
            <div>
              <Label>Kiểu âm thanh</Label>
              <div className="flex gap-2 mt-2">
                {(["default", "bell", "chime"] as const).map((s) => (
                  <Button
                    key={s}
                    variant={user.soundTheme === s ? "default" : "outline"}
                    onClick={() => updatePref({ soundTheme: s })}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Bảo mật
            </h2>
            <div className="flex items-center justify-between p-2 rounded border">
              <div>
                <p className="text-sm font-medium">Mã hoá End-to-End (E2EE)</p>
                <p className="text-xs text-muted-foreground">
                  Tin nhắn được mã hoá, server không đọc được
                </p>
              </div>
              <Button
                size="sm"
                variant={e2eeOn ? "destructive" : "default"}
                disabled={e2eeLoading}
                onClick={async () => {
                  try {
                    setE2eeLoading(true);
                    if (e2eeOn) {
                      if (!confirm("Tắt E2EE sẽ xoá private key. Tin nhắn cũ không giải mã được. Tiếp tục?")) return;
                      await setE2EEEnabled(false);
                      setE2eeOn(false);
                      toast.success("Đã tắt E2EE");
                    } else {
                      await setE2EEEnabled(true);
                      setE2eeOn(true);
                      toast.success("Đã bật E2EE. Private key lưu localStorage.");
                    }
                  } catch (e: any) {
                    toast.error(e.message || "Lỗi");
                  } finally {
                    setE2eeLoading(false);
                  }
                }}
              >
                {e2eeOn ? <Lock className="h-4 w-4 mr-1" /> : <LockOpen className="h-4 w-4 mr-1" />}
                {e2eeOn ? "Tắt" : "Bật"}
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={async () => {
                const currentPassword = prompt("Mật khẩu hiện tại:");
                const newPassword = prompt("Mật khẩu mới (>=6 ký tự):");
                if (!currentPassword || !newPassword) return;
                try {
                  await authService.changePassword(currentPassword, newPassword);
                  toast.success("Đã đổi mật khẩu, vui lòng đăng nhập lại");
                  setTimeout(() => useAuthStore.getState().clearState(), 1500);
                } catch (e: any) {
                  toast.error(e.response?.data?.message || "Lỗi");
                }
              }}
            >
              Đổi mật khẩu
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
