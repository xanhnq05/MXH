import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAuthStore } from "@/stores/useAuthStore";
import { userService } from "@/services/user.service";
import { authService } from "@/services/auth.service";
import { setE2EEEnabled, isE2EEEnabled } from "@/lib/e2eeManager";
import { useState } from "react";
import { toast } from "sonner";
import { Lock, LockOpen, ShieldCheck, Palette } from "lucide-react";
import { useConfirm, usePrompt } from "@/components/providers/ConfirmDialogProvider";

const SettingsPage = () => {
  const { user, updateUser } = useAuthStore();
  const { confirm } = useConfirm();
  const { prompt } = usePrompt();
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
    <div className="h-full overflow-y-auto bg-orange-50/30 dark:bg-slate-950">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Cài đặt</h1>

        <Card className="bg-white dark:bg-slate-900 border-orange-100 dark:border-slate-800">
          <CardContent className="p-4 space-y-3">
            <h2 className="font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
              <Palette className="h-4 w-4" /> Giao diện
            </h2>
            <div>
              <Label className="text-slate-700 dark:text-slate-300">Chế độ hiển thị</Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                Chọn giao diện Sáng, Tối, hoặc theo hệ thống
              </p>
              <ThemeToggle variant="segmented" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-orange-100 dark:border-slate-800">
          <CardContent className="p-4 space-y-3">
            <h2 className="font-semibold text-slate-900 dark:text-white">Âm thanh & Thông báo</h2>
            <div className="flex items-center justify-between">
              <Label className="text-slate-700 dark:text-slate-300">Bật âm thanh tin nhắn</Label>
              <input
                type="checkbox"
                checked={user.soundEnabled}
                onChange={(e) => updatePref({ soundEnabled: e.target.checked })}
                className="accent-orange-500"
              />
            </div>
            <div>
              <Label className="text-slate-700 dark:text-slate-300">Kiểu âm thanh</Label>
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

        <Card className="bg-white dark:bg-slate-900 border-orange-100 dark:border-slate-800">
          <CardContent className="p-4 space-y-3">
            <h2 className="font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
              <ShieldCheck className="h-4 w-4" /> Bảo mật
            </h2>
            <div className="flex items-center justify-between p-2 rounded border border-slate-200 dark:border-slate-700">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Mã hoá End-to-End (E2EE)</p>
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
                      const ok = await confirm({
                        title: "Tắt mã hoá End-to-End?",
                        message:
                          "Private key sẽ bị xoá khỏi trình duyệt. Bạn sẽ không đọc được các tin nhắn cũ đã mã hoá.",
                        confirmLabel: "Tắt E2EE",
                        variant: "danger",
                      });
                      if (!ok) return;
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
                const currentPassword = await prompt({
                  title: "Đổi mật khẩu",
                  message: "Nhập mật khẩu hiện tại và mật khẩu mới.",
                  placeholder: "Mật khẩu hiện tại",
                  inputType: "password",
                  confirmLabel: "Tiếp tục",
                });
                if (!currentPassword) return;
                const newPassword = await prompt({
                  title: "Mật khẩu mới",
                  placeholder: "Mật khẩu mới (>=6 ký tự)",
                  inputType: "password",
                  confirmLabel: "Đổi mật khẩu",
                  confirmHint: "Mật khẩu phải có ít nhất 6 ký tự.",
                });
                if (!newPassword) return;
                if (newPassword.length < 6) {
                  toast.error("Mật khẩu mới phải có ít nhất 6 ký tự");
                  return;
                }
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
