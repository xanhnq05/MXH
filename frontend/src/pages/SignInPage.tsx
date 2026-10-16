// SignInPage - Theme xanh dương - trắng, đồng bộ với SignUpPage
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import Input from "@/components/ui/input";
import { useAuthStore } from "@/stores/useAuthStore";

const SignInPage = () => {
  const { signIn, loading } = useAuthStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const err: Record<string, string> = {};
    if (!email.trim()) err.email = "Vui lòng nhập email hoặc username";
    else if (email.length < 3) err.email = "Tối thiểu 3 ký tự";

    if (!password) err.password = "Vui lòng nhập mật khẩu";
    else if (password.length < 6) err.password = "Mật khẩu tối thiểu 6 ký tự";

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) return;
    try {
      // Backend accept cả email và username
      await signIn({ username: email.trim().toLowerCase(), password });
      navigate("/");
    } catch (e) {
      // toast đã có trong store
    }
  };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2">
      {/* LEFT: Branding */}
      <div className="hidden lg:flex relative bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 text-white p-12 flex-col justify-between overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-cyan-300/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">GreenX</h1>
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="text-4xl font-bold leading-tight">
            Chào mừng<br />
            bạn quay lại!
          </h2>
          <p className="text-blue-50 text-sm leading-relaxed">
            Kết nối với bạn bè, gia đình và cộng đồng của bạn trên mạng xã hội GreenX — nền tảng mạng xã hội
            hiện đại với mã hoá End-to-End.
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
            <h2 className="text-2xl font-bold text-slate-900">Đăng nhập GreenX</h2>
            <p className="text-sm text-slate-500 mt-1">
              Nhập thông tin để tiếp tục
            </p>
          </div>

          <Input
            label="Email hoặc Username"
            required
            value={email}
            onChange={(v: string) => {
              setEmail(v);
              if (errors.email) setErrors({ ...errors, email: "" });
            }}
            placeholder="email@example.com hoặc username"
            leftIcon={<User className="h-4 w-4" />}
            error={errors.email}
            maxLength={120}
            autoComplete="username"
          />

          <Input
            label="Mật khẩu"
            required
            type="password"
            value={password}
            onChange={(v: string) => {
              setPassword(v);
              if (errors.password) setErrors({ ...errors, password: "" });
            }}
            placeholder="••••••••"
            leftIcon={<Lock className="h-4 w-4" />}
            error={errors.password}
            maxLength={32}
            autoComplete="current-password"
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === "Enter") onSubmit();
            }}
          />

          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Quên mật khẩu?
            </Link>
          </div>

          <Button
            onClick={onSubmit}
            disabled={loading}
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ArrowRight className="h-4 w-4 mr-2" />
            )}
            Đăng nhập
          </Button>

          <p className="text-center text-sm text-slate-600">
            Chưa có tài khoản?{" "}
            <Link
              to="/signup"
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
