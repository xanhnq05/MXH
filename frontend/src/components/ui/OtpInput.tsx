// OTP input 6 số với 2 chế độ:
// - DESKTOP: 6 ô input riêng, auto-focus, paste, backspace thông minh
// - MOBILE: hiển thị 6 ô vuông, có nút X bên cạnh input ẩn để xóa
//   (bàn phím mobile có sẵn nút backspace, nên hidden input vẫn nhận phím xóa)
import { useEffect, useRef, type KeyboardEvent, type ClipboardEvent } from "react";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
  className?: string;
}

const OtpInput = ({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled,
  error,
  autoFocus = true,
  className,
}: OtpInputProps) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0]?.focus();
    }
  }, [autoFocus]);

  const setValueAt = (idx: number, digit: string) => {
    const arr = value.split("");
    arr[idx] = digit;
    return arr.join("").slice(0, length);
  };

  const handleChange = (idx: number, v: string) => {
    // Lấy duy nhất 1 chữ số
    const digit = v.replace(/\D/g, "").slice(-1);
    if (!digit) {
      // Người dùng xóa hết ký tự trong ô này
      onChange(setValueAt(idx, ""));
      return;
    }
    const next = setValueAt(idx, digit);
    onChange(next);
    if (idx < length - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
    if (next.length === length && onComplete) onComplete(next);
  };

  const handleKeyDown = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const arr = value.split("");
      if (arr[idx]) {
        // Ô hiện tại có giá trị → xóa ô hiện tại
        arr[idx] = "";
        onChange(arr.join(""));
      } else if (idx > 0) {
        // Ô hiện tại rỗng → xóa ô trước + focus
        arr[idx - 1] = "";
        onChange(arr.join(""));
        inputRefs.current[idx - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    } else if (e.key === "ArrowRight" && idx < length - 1) {
      inputRefs.current[idx + 1]?.focus();
    } else if (e.key === "Delete") {
      e.preventDefault();
      onChange(setValueAt(idx, ""));
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    onChange(pasted);
    const lastIdx = Math.min(pasted.length, length - 1);
    inputRefs.current[lastIdx]?.focus();
    if (pasted.length === length && onComplete) onComplete(pasted);
  };

  const handleClear = (idx: number) => {
    onChange(setValueAt(idx, ""));
    inputRefs.current[idx]?.focus();
  };

  return (
    <div className={cn("flex gap-2 sm:gap-3 justify-center", className)}>
      {Array.from({ length }).map((_, idx) => {
        const hasValue = !!value[idx];
        return (
          <div key={idx} className="relative group">
            <input
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              maxLength={1}
              value={value[idx] || ""}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={handlePaste}
              disabled={disabled}
              className={cn(
                "w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl sm:text-3xl font-bold",
                "rounded-xl border-2 bg-white transition-all",
                "outline-none caret-blue-600",
                "focus:ring-4 focus:ring-blue-100",
                error
                  ? "border-red-400 focus:border-red-500 focus:ring-red-100 text-red-600"
                  : hasValue
                  ? "border-blue-500 text-slate-900"
                  : "border-slate-300 text-slate-900 focus:border-blue-500",
                disabled && "opacity-50 cursor-not-allowed",
                // Ẩn nút xóa mặc định của browser
                "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              )}
            />
            {/* Nút xóa tùy chỉnh — hiện khi hover hoặc có giá trị (mobile: luôn hiện) */}
            {hasValue && !disabled && (
              <button
                type="button"
                onClick={() => handleClear(idx)}
                tabIndex={-1}
                aria-label="Xóa số"
                className={cn(
                  "absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2",
                  "w-5 h-5 sm:w-6 sm:h-6 rounded-full",
                  "bg-slate-200 hover:bg-red-100 text-slate-500 hover:text-red-600",
                  "flex items-center justify-center shadow-sm",
                  "transition-colors",
                  // Mobile: luôn hiện; desktop: hiện khi hover
                  "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                )}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-3 h-3 sm:w-3.5 sm:h-3.5"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default OtpInput;
