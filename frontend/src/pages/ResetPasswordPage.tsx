// ResetPasswordPage - Trang cũ, redirect sang OtpVerifyPage
// Flow mới: /forgot-password → /verify-otp (OTP + new password)
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";

const ResetPasswordPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { email: string } | null;

  useEffect(() => {
    if (state?.email) {
      navigate("/verify-otp", { state: { email: state.email, mode: "forgot" } });
    } else {
      navigate("/forgot-password");
    }
  }, [state, navigate]);

  return null;
};

export default ResetPasswordPage;
