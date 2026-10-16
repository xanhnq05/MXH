// SignUpPage - Multi-step wizard với theme cam GreenX #FF6B35 + #FF9F43
// Bước 1: Thông tin cá nhân (fullName, email, birthday, phone)
// Bước 2: Xác thực OTP
// Bước 3: Tạo mật khẩu

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Mail,
  User,
  Calendar,
  Phone,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
  Lock,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  PartyPopper,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Input from "@/components/ui/input";
import OtpInput from "@/components/ui/OtpInput";
import Stepper from "@/components/ui/Stepper";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "sonner";

interface PendingData {
  fullName: string;
  email: string;
  birthday: string;
  phone: string;
}

const STEPS = [
  { label: "Thông tin", description: "Họ tên, email..." },
  { label: "Xác thực", description: "Mã OTP" },
  { label: "Mật khẩu", description: "Tạo mật khẩu" },
];

const sanitizePassword = (v: string) => v.replace(/[^A-Za-z0-9]/g, "").slice(0, 32);
const sanitizeName = (v: string) => v.replace(/[<>{}[\]\\]/g, "").slice(0, 60);
const sanitizePhone = (v: string) => v.replace(/[^\d+]/g, "").slice(0, 15);

const SignUpPage = () => {
  const navigate = useNavigate();
  const { signIn } = useAuthStore();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [pending, setPending] = useState<PendingData>({
    fullName: "",
    email: "",
    birthday: "",
    phone: "",
  });

  // Field states — luôn là string
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [birthday, setBirthday] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Cooldown cho nút "Gửi lại OTP"
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // ===== Validation =====
  const validateStep1 = (): boolean => {
    const err: Record<string, string> = {};

    if (!fullName.trim()) {
      err.fullName = "Vui lòng nhập họ tên";
    } else if (fullName.trim().length < 2) {
      err.fullName = "Họ tên phải có ít nhất 2 ký tự";
    } else if (fullName.length > 60) {
      err.fullName = "Họ tên tối đa 60 ký tự";
    } else if (!/^[\p{L}\s'.-]+$/u.test(fullName.trim())) {
      err.fullName = "Họ tên chỉ gồm chữ cái và khoảng trắng";
    }

    if (!email.trim()) {
      err.email = "Vui lòng nhập email";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      err.email = "Email không hợp lệ";
    } else if (email.length > 120) {
      err.email = "Email quá dài";
    }

    if (!birthday) {
      err.birthday = "Vui lòng chọn ngày sinh";
    } else {
      const d = new Date(birthday);
      const now = new Date();
      const age = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (Number.isNaN(age)) {
        err.birthday = "Ngày sinh không hợp lệ";
      } else if (age < 13) {
        err.birthday = "Bạn phải ít nhất 13 tuổi";
      } else if (age > 120) {
        err.birthday = "Ngày sinh không hợp lệ";
      }
    }

    if (phone && !/^\+?\d{8,15}$/.test(phone)) {
      err.phone = "Số điện thoại không hợp lệ";
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const validateStep3 = (): boolean => {
    const err: Record<string, string> = {};

    if (!password) {
      err.password = "Vui lòng nhập mật khẩu";
    } else if (password.length < 6) {
      err.password = "Mật khẩu phải có ít nhất 6 ký tự";
    } else if (password.length > 32) {
      err.password = "Mật khẩu tối đa 32 ký tự";
    } else if (!/^[A-Za-z0-9]+$/.test(password)) {
      err.password = "Chỉ dùng chữ cái và chữ số, không ký tự đặt biệt";
    }

    if (!confirmPassword) {
      err.confirmPassword = "Vui lòng xác nhận mật khẩu";
    } else if (password !== confirmPassword) {
      err.confirmPassword = "Mật khẩu xác nhận không khớp";
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  // ===== API calls =====
  const handleSendOtp = async (): Promise<boolean> => {
    if (!validateStep1()) return false;
    setLoading(true);
    try {
      const data = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        birthday,
        phone: phone || "",
      };
      await authService.signUpStart(data);
      setPending(data);
      setStep(1);
      setResendCooldown(60);
      toast.success("Đã gửi mã OTP đến email của bạn");
      return true;
    } catch (e: any) {
      const msg = e?.response?.data?.message || "Có lỗi xảy ra";
      if (msg.includes("Email")) {
        setErrors({ email: msg });
      } else {
        toast.error(msg);
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (code: string = otp): Promise<boolean> => {
    if (code.length !== 6) {
      setErrors({ otp: "Vui lòng nhập đầy đủ 6 số" });
      return false;
    }
    setLoading(true);
    try {
      await authService.verifyOtp(pending.email, code, "signup");
      setStep(2);
      toast.success("Xác thực thành công");
      return true;
    } catch (e: any) {
      setErrors({ otp: e?.response?.data?.message || "Mã OTP không đúng" });
      setOtp("");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      await authService.signUpStart({
        fullName: pending.fullName,
        email: pending.email,
        birthday: pending.birthday,
        phone: pending.phone,
      });
      setResendCooldown(60);
      toast.success("Đã gửi lại mã OTP");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gửi lại OTP thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (): Promise<boolean> => {
    if (!validateStep3()) return false;
    setLoading(true);
    try {
      const res = await authService.signUpComplete({
        email: pending.email,
        password,
        confirmPassword,
        fullName: pending.fullName,
        birthday: pending.birthday,
        phone: pending.phone,
      });

      // Auto sign-in sau khi đăng ký (dùng username từ API trả về)
      try {
        await signIn({ username: res.username || pending.email, password });
      } catch {
        // Nếu auto sign-in thất bại, redirect về signin
      }

      toast.success("Đăng ký thành công!");
      setStep(3); // success
      return true;
    } catch (e: any) {
      const msg = e?.response?.data?.message || "Đăng ký thất bại";
      setErrors({ password: msg });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setErrors({});
    if (step > 0 && step < 3) setStep(step - 1);
  };

  // ===== Render =====
  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2">
      {/* LEFT: Branding panel */}
      <div className="hidden lg:flex relative bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 text-white p-12 flex-col justify-between overflow-hidden">
        {/* Decorative shapes */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-cyan-300/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl">
              <Sparkles className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold">GreenX</h1>
          </div>
          <p className="text-blue-100 mt-2 text-sm">
            Mạng xã hội dành cho người Việt
          </p>
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="text-4xl font-bold leading-tight">
            Kết nối bạn bè,<br />
            chia sẻ khoảnh khắc,<br />
            <span className="text-blue-100">trò chuyện mọi lúc.</span>
          </h2>
          <div className="space-y-3 text-sm text-blue-50">
            {[
              "Nhắn tin realtime với WebSocket",
              "Gọi thoại & video call miễn phí",
              "Mã hoá End-to-End bảo mật tuyệt đối",
              "Sticker, GIF, voice message đầy màu sắc",
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-cyan-200 shrink-0" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-blue-100/70">
          © 2026 GreenX. Made with 💙 in Vietnam
        </div>
      </div>

      {/* RIGHT: Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="w-full max-w-md">
          {/* Stepper */}
          {step < 3 && (
            <div className="mb-8">
              <Stepper steps={STEPS} current={step} />
            </div>
          )}

          {/* ==== STEP 0: Thông tin cá nhân ==== */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Tạo tài khoản
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Bắt đầu với một số thông tin cơ bản
                </p>
              </div>

              <Input
                label="Họ và tên"
                required
                value={fullName}
                onChange={setFullName}
                placeholder="Nguyễn Văn A"
                leftIcon={<User className="h-4 w-4" />}
                error={errors.fullName}
                maxLength={60}
                autoCapitalize="words"
                sanitize={sanitizeName}
              />

              <Input
                label="Email"
                required
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="ban@example.com"
                leftIcon={<Mail className="h-4 w-4" />}
                error={errors.email}
                maxLength={120}
                autoComplete="email"
                hint="Vui lòng dùng email thật để nhận mã xác thực"
              />

              <Input
                label="Ngày sinh"
                required
                type="date"
                value={birthday}
                onChange={setBirthday}
                leftIcon={<Calendar className="h-4 w-4" />}
                error={errors.birthday}
                maxLength={10}
                hint="Bạn phải ít nhất 13 tuổi để đăng ký"
              />

              <Input
                label="Số điện thoại"
                value={phone}
                onChange={setPhone}
                placeholder="+84 987 654 321 (tuỳ chọn)"
                leftIcon={<Phone className="h-4 w-4" />}
                error={errors.phone}
                maxLength={15}
                autoComplete="tel"
                sanitize={sanitizePhone}
                hint="Không bắt buộc. Dùng để bảo mật & tìm bạn bè"
              />

              <Button
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold mt-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                Tiếp tục
              </Button>

              <p className="text-center text-sm text-slate-600">
                Đã có tài khoản?{" "}
                <Link
                  to="/signin"
                  className="text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Đăng nhập
                </Link>
              </p>
            </div>
          )}

          {/* ==== STEP 1: Xác thực OTP ==== */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center mb-4 shadow-sm">
                  <Mail className="h-8 w-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Xác thực email của bạn
                </h2>
                <p className="text-sm text-slate-500 mt-2">
                  Chúng tôi đã gửi mã xác thực 6 số đến
                </p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5 break-all">
                  {pending.email}
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
                  <ShieldCheck className="h-4 w-4 mr-2" />
                )}
                Xác nhận
              </Button>

              {/* Gửi lại mã + countdown */}
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
                    onClick={handleResendOtp}
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
                onClick={handleBack}
                disabled={loading}
                className="w-full text-sm text-slate-500 hover:text-slate-700 inline-flex items-center justify-center"
              >
                <ArrowLeft className="h-3 w-3 mr-1" /> Đổi email
              </button>
            </div>
          )}

          {/* ==== STEP 2: Mật khẩu ==== */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Tạo mật khẩu
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Mật khẩu dùng để đăng nhập GreenX
                </p>
              </div>

              <Input
                label="Mật khẩu"
                required
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                leftIcon={<Lock className="h-4 w-4" />}
                error={errors.password}
                maxLength={32}
                autoComplete="new-password"
                sanitize={sanitizePassword}
                hint="6–32 ký tự, gồm chữ cái và số, không ký tự đặt biệt"
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
                autoComplete="new-password"
                sanitize={sanitizePassword}
              />

              {/* Password strength checklist */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-1.5 text-sm">
                <p className="font-medium text-blue-900 mb-2">Mật khẩu phải có:</p>
                {[
                  { ok: password.length >= 6, text: "Ít nhất 6 ký tự" },
                  { ok: password.length <= 32 && password.length > 0, text: "Tối đa 32 ký tự" },
                  { ok: /^[A-Za-z0-9]+$/.test(password), text: "Chỉ chữ cái và chữ số" },
                  { ok: password === confirmPassword && password.length > 0, text: "Khớp với mật khẩu xác nhận" },
                ].map((rule, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {rule.ok ? (
                      <Check className="h-3.5 w-3.5 text-blue-600" />
                    ) : (
                      <span className="h-3.5 w-3.5 rounded-full border border-slate-300" />
                    )}
                    <span className={rule.ok ? "text-blue-700" : "text-slate-500"}>
                      {rule.text}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleComplete}
                disabled={loading}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold mt-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Hoàn tất đăng ký
              </Button>

              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="w-full text-sm text-slate-500 hover:text-slate-700 inline-flex items-center justify-center"
              >
                <ArrowLeft className="h-3 w-3 mr-1" /> Quay lại
              </button>
            </div>
          )}

          {/* ==== STEP 3: Success ==== */}
          {step === 3 && (
            <div className="text-center space-y-5 py-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <PartyPopper className="h-10 w-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Đăng ký thành công!
                </h2>
                <p className="text-sm text-slate-500 mt-2">
                  Chào mừng {pending.fullName} đến với GreenX 🎉
                </p>
              </div>
              <Button
                onClick={() => navigate("/")}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                Bắt đầu khám phá
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
