// OtpVerifyPage - Dùng cho flow quên mật khẩu
// Flow đăng ký mới đã tích hợp OTP vào trong SignUpPage (multi-step)

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ArrowLeft, ArrowRight, KeyRound, Loader2, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Input from "@/components/ui/input";
import OtpInput from "@/components/ui/OtpInput";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "sonner";

const sanitizePassword = (v: string) =>
  v.replace(/[^A-Za-z0-9]/g, "").slice(0, 32);

const OtpVerifyPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuthStore();

  const state = location.state as { email: string; mode: "forgot" } | null;
  const email = state?.email;
  const mode = state?.mode || "forgot";

  const [step, setStep] = useState<"otp" | "newPassword">("otp");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!email) navigate("/forgot-password");
  }, [email, navigate]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  if (!email) return null;

  const handleVerifyOtp = async (code: string = otp) => {
    if (code.length !== 6) {
      setErrors({ otp: "Vui lòng nhập đầy đủ 6 số" });
      return;
    }
    setLoading(true);
    try {
      await authService.verifyOtp(email, code, "forgot_password");
      setStep("newPassword");
      toast.success("Xác thực thành công");
    } catch (e: any) {
      setErrors({ otp: e?.response?.data?.message || "Mã OTP không đúng" });
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setResendCooldown(60);
      toast.success("Đã gửi lại mã OTP");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gửi lại OTP thất bại");
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = (): boolean => {
    const err: Record<string, string> = {};
    if (!password) err.password = "Vui lòng nhập mật khẩu";
    else if (password.length < 6) err.password = "Tối thiểu 6 ký tự";
    else if (password.length > 32) err.password = "Tối đa 32 ký tự";
    else if (!/^[A-Za-z0-9]+$/.test(password))
      err.password = "Chỉ dùng chữ cái và số, không ký tự đặt biệt";

    if (!confirmPassword) err.confirmPassword = "Vui lòng xác nhận mật khẩu";
    else if (password !== confirmPassword) err.confirmPassword = "Mật khẩu không khớp";

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleResetPassword = async () => {
    if (!validatePassword()) return;
    setLoading(true);
    try {
      await authService.resetPassword(email, otp, password);
      toast.success("Đặt lại mật khẩu thành công");

      // Auto sign-in
      try {
        await signIn({ username: email, password });
        navigate("/");
      } catch {
        navigate("/signin");
      }
    } catch (e: any) {
      setErrors({ password: e?.response?.data?.message || "Đặt lại thất bại" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2">
      {/* LEFT: Branding */}
      <div className="hidden lg:flex relative bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 text-white p-12 flex-col justify-between overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          <h1 className="text-3xl font-bold">GreenX</h1>
          <p className="text-blue-100 mt-2 text-sm">Mạng xã hội Việt Nam</p>
        </div>

        <div className="relative z-10 space-y-4">
          <KeyRound className="h-12 w-12 text-blue-100" />
          <h2 className="text-3xl font-bold leading-tight">
            Khôi phục<br />mật khẩu của bạn
          </h2>
          <p className="text-blue-50 text-sm leading-relaxed">
            Nhập mã OTP chúng tôi đã gửi đến email của bạn để đặt lại mật khẩu mới.
          </p>
        </div>

        <div className="relative z-10 text-xs text-blue-100/70">
          © 2026 GreenX. Made with 💙
        </div>
      </div>

      {/* RIGHT: Form */}
      <div className="flex items-center justify-center p-6 sm:p-10 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="w-full max-w-md">
          {step === "otp" && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center mb-4 shadow-sm">
                  <Mail className="h-8 w-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Xác thực OTP</h2>
                <p className="text-sm text-slate-500 mt-2">
                  Mã xác thực 6 số đã được gửi đến
                </p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5 break-all">
                  {email}
                </p>
              </div>

              <div className="py-2">
                <OtpInput
                  value={otp}
                  onChange={(v) => {
                    setOtp(v);
                    if (errors.otp) setErrors({});
                  }}
                  onComplete={(v) => handleVerifyOtp(v)}
                  error={!!errors.otp}
                  disabled={loading}
                />
              </div>

              {errors.otp && (
                <p className="text-center text-sm text-red-500 bg-red-50 py-2 rounded-lg">
                  {errors.otp}
                </p>
              )}

              <Button
                onClick={() => handleVerifyOtp()}
                disabled={loading || otp.length !== 6}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:bg-slate-300"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                Xác nhận
              </Button>

              <div className="text-center text-sm bg-slate-50 rounded-lg p-3 border border-slate-100">
                <p className="text-slate-500 mb-1">Chưa nhận được mã?</p>
                {resendCooldown > 0 ? (
                  <p className="text-slate-400">
                    Gửi lại sau{" "}
                    <span className="font-mono font-semibold text-blue-600">
                      {String(Math.floor(resendCooldown / 60)).padStart(2, "0")}
                      :{String(resendCooldown % 60).padStart(2, "0")}
                    </span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={loading}
                    className="text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Gửi lại mã ngay
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="w-full text-sm text-slate-500 hover:text-slate-700 inline-flex items-center justify-center"
              >
                <ArrowLeft className="h-3 w-3 mr-1" /> Đổi email
              </button>
            </div>
          )}

          {step === "newPassword" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Mật khẩu mới
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Tạo mật khẩu mới cho tài khoản của bạn
                </p>
              </div>

              <Input
                label="Mật khẩu mới"
                required
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                leftIcon={<KeyRound className="h-4 w-4" />}
                error={errors.password}
                maxLength={32}
                sanitize={sanitizePassword}
                hint="6–32 ký tự, chỉ chữ cái và số, không ký tự đặt biệt"
              />

              <Input
                label="Xác nhận mật khẩu"
                required
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="••••••••"
                leftIcon={<KeyRound className="h-4 w-4" />}
                error={errors.confirmPassword}
                maxLength={32}
                sanitize={sanitizePassword}
              />

              <Button
                onClick={handleResetPassword}
                disabled={loading}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                Đặt lại mật khẩu
              </Button>

              <button
                type="button"
                onClick={() => setStep("otp")}
                disabled={loading}
                className="w-full text-sm text-slate-500 hover:text-slate-700 inline-flex items-center justify-center"
              >
                <ArrowLeft className="h-3 w-3 mr-1" /> Quay lại
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OtpVerifyPage;
