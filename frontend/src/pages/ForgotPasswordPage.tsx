// ForgotPasswordPage - Nhập email để nhận OTP, sau đó chuyển sang OtpVerifyPage
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, ArrowRight, Loader2, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Input from "@/components/ui/input";
import { authService } from "@/services/auth.service";
import { toast } from "sonner";

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    if (!email.trim()) {
      setError("Vui lòng nhập email");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Email không hợp lệ");
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await authService.forgotPassword(email.trim().toLowerCase());
      toast.success("Đã gửi mã OTP đến email của bạn");
      navigate("/verify-otp", { state: { email: email.trim().toLowerCase(), mode: "forgot" } });
    } catch (e: any) {
      const msg = e?.response?.data?.message || "Có lỗi xảy ra";
      toast.error(msg);
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

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">GreenX</h1>
        </div>

        <div className="relative z-10 space-y-4">
          <Mail className="h-12 w-12 text-blue-100" />
          <h2 className="text-3xl font-bold leading-tight">
            Quên mật khẩu?<br />
            <span className="text-blue-100">Đừng lo lắng.</span>
          </h2>
          <p className="text-blue-50 text-sm leading-relaxed">
            Nhập email đã đăng ký, chúng tôi sẽ gửi mã OTP để bạn đặt lại mật khẩu mới.
          </p>
        </div>

        <div className="relative z-10 text-xs text-blue-100/70">
          © 2026 GreenX. Made with 💙
        </div>
      </div>

      {/* RIGHT: Form */}
      <div className="flex items-center justify-center p-6 sm:p-10 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="w-full max-w-md space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Quên mật khẩu</h2>
            <p className="text-sm text-slate-500 mt-1">
              Nhập email đã đăng ký để nhận mã OTP
            </p>
          </div>

          <Input
            label="Email"
            required
            type="email"
            value={email}
            onChange={(v: string) => {
              setEmail(v);
              if (error) setError("");
            }}
            placeholder="ban@example.com"
            leftIcon={<Mail className="h-4 w-4" />}
            error={error}
            maxLength={120}
            autoComplete="email"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
          />

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ArrowRight className="h-4 w-4 mr-2" />
            )}
            Gửi mã OTP
          </Button>

          <p className="text-center text-sm text-slate-600">
            <Link
              to="/signin"
              className="text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center"
            >
              <ArrowLeft className="h-3 w-3 mr-1" /> Quay lại đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
